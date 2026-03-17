/* eslint-disable no-use-before-define */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Em Docker: variáveis já estão em process.env (env_file do docker-compose)
// Em desenvolvimento local: tenta carregar do .env na raiz do projeto
if (!process.env.OPENAI_API_KEY) {
  const possiblePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      break;
    }
  }
}

const logger = require('../utils/logger');
const { resolveFieldAssistPrompt } = require('./fieldAssistPromptRegistry');

function createFieldAssistPipelineTracker(requestId = '') {
  const startedAtMs = Date.now();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const starts = {};
  const stages = {};
  const safeRequestId = String(requestId || '').trim() || `fa-${randomUUID()}`;

  const startStage = (stage = '', meta = {}) => {
    const name = String(stage || '').trim();
    if (!name) return;
    starts[name] = Date.now();
    logger.info('field_assist.stage.start', {
      requestId: safeRequestId,
      stage: name,
      ...meta,
    });
  };

  const endStage = (stage = '', meta = {}) => {
    const name = String(stage || '').trim();
    if (!name) return;
    const begin = starts[name] || Date.now();
    const latencyMs = Date.now() - begin;
    stages[name] = {
      latencyMs,
      ...meta,
    };
    logger.info('field_assist.stage.end', {
      requestId: safeRequestId,
      stage: name,
      latencyMs,
      ...meta,
    });
  };

  const buildSummary = () => ({
    requestId: safeRequestId,
    startedAt: startedAtIso,
    totalMs: Date.now() - startedAtMs,
    stages,
  });

  return {
    requestId: safeRequestId,
    startStage,
    endStage,
    buildSummary,
  };
}

async function persistFieldAssistDebugArtifact({
  requestId = '',
  payload = {},
} = {}) {
  const enabled =
    String(process.env.FIELD_ASSIST_DEBUG_ARTIFACTS || '')
      .trim()
      .toLowerCase() === 'true';
  if (!enabled || process.env.NODE_ENV === 'production') return null;

  try {
    const dir = path.resolve(process.cwd(), 'logs', 'field-assist-artifacts');
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(
      dir,
      `${String(requestId || `fa-${Date.now()}`).replace(/[^\w.-]/g, '_')}.json`,
    );
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(payload, null, 2),
      'utf8',
    );
    return filePath;
  } catch (error) {
    logger.warn('Falha ao salvar artefato de debug do field-assist', {
      requestId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Normaliza texto para detecção de speaker
 */
function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenizeText(value = '') {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function lexicalOverlapScore(a = '', b = '') {
  const tokensA = new Set(tokenizeText(a));
  const tokensB = new Set(tokenizeText(b));
  if (!tokensA.size || !tokensB.size) return 0;
  let hits = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) hits += 1;
  }
  return hits / Math.max(tokensA.size, tokensB.size);
}

function hasMinimumClinicalSignal(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const tokens = tokenizeText(normalized);
  if (tokens.length < 8) return false;

  const clinicalKeywords = [
    'exame',
    'diagnostico',
    'tratamento',
    'conduta',
    'temperatura',
    'mucosa',
    'dor',
    'vomito',
    'diarreia',
    'retorno',
    'medicacao',
    'prescricao',
  ];

  let hits = 0;
  for (const keyword of clinicalKeywords) {
    if (normalized.includes(keyword)) hits += 1;
  }

  return hits >= 2 || normalized.length >= 120;
}

function normalizeClinicalFieldText(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^nao informado na consulta$/i.test(normalizeText(text))) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function detectAudioMagicFormat(audioBuffer) {
  if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length < 12)
    return 'unknown';
  const head = audioBuffer.subarray(0, 16);
  const headAscii = head.toString('ascii');
  if (headAscii.startsWith('RIFF') && headAscii.includes('WAVE')) return 'wav';
  if (headAscii.startsWith('ID3')) return 'mp3';
  if (head[0] === 255 && head[1] >= 224) return 'mp3';
  if (
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  )
    return 'mp4';
  if (
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  )
    return 'webm';
  if (headAscii.startsWith('OggS')) return 'ogg';
  return 'unknown';
}

function readWavMetadata(audioBuffer) {
  if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length < 44) return null;
  if (audioBuffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (audioBuffer.toString('ascii', 8, 12) !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= audioBuffer.length) {
    const chunkId = audioBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = audioBuffer.readUInt32LE(offset + 4);
    const payloadStart = offset + 8;
    const nextOffset = payloadStart + chunkSize + (chunkSize % 2);

    if (payloadStart > audioBuffer.length || nextOffset > audioBuffer.length) {
      break;
    }

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      channels = audioBuffer.readUInt16LE(payloadStart + 2);
      sampleRate = audioBuffer.readUInt32LE(payloadStart + 4);
      bitsPerSample = audioBuffer.readUInt16LE(payloadStart + 14);
    } else if (chunkId === 'data') {
      dataOffset = payloadStart;
      dataSize = chunkSize;
      break;
    }

    offset = nextOffset;
  }

  if (!sampleRate || !channels || !bitsPerSample || dataOffset < 0 || !dataSize)
    return null;
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(dataSize / Math.max(1, bytesPerSample));
  const durationSec = totalSamples / Math.max(1, sampleRate * channels);

  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataOffset,
    dataSize,
    durationSec: Number(durationSec.toFixed(3)),
  };
}

function estimateWavSignalMetrics(audioBuffer, wavMeta) {
  if (!wavMeta) return null;
  if (wavMeta.bitsPerSample !== 16) return null;
  if (!wavMeta.dataSize || wavMeta.dataOffset < 0) return null;

  const bytesPerFrame = wavMeta.channels * 2;
  if (!bytesPerFrame) return null;

  const frameCount = Math.floor(wavMeta.dataSize / bytesPerFrame);
  if (!frameCount) return null;

  const maxFramesForScan = 5000;
  const step = Math.max(1, Math.floor(frameCount / maxFramesForScan));
  const silenceThreshold = 240;
  let scanned = 0;
  let silent = 0;
  let sumSquares = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += step) {
    const frameOffset = wavMeta.dataOffset + frameIndex * bytesPerFrame;
    if (frameOffset + 2 > audioBuffer.length) break;

    const sample = audioBuffer.readInt16LE(frameOffset);
    const absSample = Math.abs(sample);
    if (absSample < silenceThreshold) silent += 1;
    sumSquares += sample * sample;
    scanned += 1;
  }

  if (!scanned) return null;
  const rms = Math.sqrt(sumSquares / scanned);
  const silenceRatio = silent / scanned;

  return {
    rms: Number(rms.toFixed(2)),
    silenceRatio: Number(silenceRatio.toFixed(3)),
    scannedFrames: scanned,
  };
}

function encodeMonoWav16(samples = [], sampleRate = 16000) {
  const safeSamples = Array.isArray(samples) ? samples : [];
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = safeSamples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < safeSamples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, Number(safeSamples[i] || 0)));
    const intVal = Math.round(clamped * 32767);
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  return buffer;
}

function resampleLinear(samples = [], fromRate = 16000, toRate = 16000) {
  if (!Array.isArray(samples) || !samples.length) return [];
  if (!fromRate || !toRate || fromRate === toRate) return samples.slice();

  const ratio = toRate / fromRate;
  const newLength = Math.max(1, Math.round(samples.length * ratio));
  const output = new Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const srcPos = i / ratio;
    const left = Math.floor(srcPos);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = srcPos - left;
    output[i] = samples[left] * (1 - frac) + samples[right] * frac;
  }
  return output;
}

function standardizeWavPcm16(audioBuffer, wavMeta, options = {}) {
  const targetSampleRate = Number(options.targetSampleRate || 16000);
  const silenceThreshold = Number(options.silenceThreshold || 0.015);
  const trimPaddingMs = Number(options.trimPaddingMs || 80);
  const targetPeak = Number(options.targetPeak || 0.88);
  const maxGain = Number(options.maxGain || 6);

  if (!wavMeta || wavMeta.bitsPerSample !== 16 || wavMeta.dataOffset < 0) {
    return {
      buffer: audioBuffer,
      applied: false,
      stages: [],
      reason: 'wav_incompativel_para_padronizacao',
      details: {},
    };
  }

  const bytesPerFrame = wavMeta.channels * 2;
  const frameCount = Math.floor(wavMeta.dataSize / Math.max(1, bytesPerFrame));
  if (!frameCount) {
    return {
      buffer: audioBuffer,
      applied: false,
      stages: [],
      reason: 'wav_sem_frames',
      details: {},
    };
  }

  const monoSamples = new Array(frameCount);
  let peak = 0;
  for (let i = 0; i < frameCount; i += 1) {
    const frameStart = wavMeta.dataOffset + i * bytesPerFrame;
    let sum = 0;
    for (let c = 0; c < wavMeta.channels; c += 1) {
      const sample = audioBuffer.readInt16LE(frameStart + c * 2) / 32768;
      sum += sample;
    }
    const avg = sum / wavMeta.channels;
    monoSamples[i] = avg;
    peak = Math.max(peak, Math.abs(avg));
  }

  let trimmedStart = 0;
  let trimmedEnd = monoSamples.length - 1;
  while (
    trimmedStart < monoSamples.length &&
    Math.abs(monoSamples[trimmedStart]) < silenceThreshold
  ) {
    trimmedStart += 1;
  }
  while (
    trimmedEnd > trimmedStart &&
    Math.abs(monoSamples[trimmedEnd]) < silenceThreshold
  ) {
    trimmedEnd -= 1;
  }

  const padSamples = Math.floor((wavMeta.sampleRate * trimPaddingMs) / 1000);
  trimmedStart = Math.max(0, trimmedStart - padSamples);
  trimmedEnd = Math.min(monoSamples.length - 1, trimmedEnd + padSamples);
  const trimmed = monoSamples.slice(trimmedStart, trimmedEnd + 1);

  let normalized = trimmed;
  let gainApplied = 1;
  if (peak > 0) {
    gainApplied = Math.min(maxGain, targetPeak / peak);
    normalized = trimmed.map((s) => Math.max(-1, Math.min(1, s * gainApplied)));
  }

  const resampled = resampleLinear(
    normalized,
    wavMeta.sampleRate,
    targetSampleRate,
  );
  const outputBuffer = encodeMonoWav16(resampled, targetSampleRate);

  const stages = [];
  if (wavMeta.channels > 1) stages.push('downmix_mono');
  if (trimmed.length < monoSamples.length) stages.push('trim_silence');
  if (Math.abs(gainApplied - 1) > 0.05) stages.push('normalize_gain');
  if (wavMeta.sampleRate !== targetSampleRate) stages.push('resample');

  return {
    buffer: outputBuffer,
    applied: stages.length > 0,
    stages,
    reason: stages.length ? 'ok' : 'sem_ajustes_necessarios',
    details: {
      inputSampleRate: wavMeta.sampleRate,
      outputSampleRate: targetSampleRate,
      inputChannels: wavMeta.channels,
      outputChannels: 1,
      inputDurationSec: wavMeta.durationSec,
      outputDurationSec: Number(
        (resampled.length / targetSampleRate).toFixed(3),
      ),
      gainApplied: Number(gainApplied.toFixed(3)),
      trimmedSamples: Math.max(0, monoSamples.length - trimmed.length),
    },
  };
}

function standardizeAudioInputForFieldAssist({
  audioBuffer,
  mimeType = '',
  filename = '',
}) {
  const result = {
    applied: false,
    skipped: false,
    reason: '',
    stages: [],
    metrics: {
      inputBytes: Buffer.isBuffer(audioBuffer) ? audioBuffer.length : 0,
      outputBytes: Buffer.isBuffer(audioBuffer) ? audioBuffer.length : 0,
      inputMimeType: String(mimeType || '').toLowerCase(),
      outputMimeType: String(mimeType || '').toLowerCase(),
      filename: String(filename || ''),
    },
  };

  if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    result.skipped = true;
    result.reason = 'audio_ausente';
    return { ...result, buffer: audioBuffer, mimeType };
  }

  const magic = detectAudioMagicFormat(audioBuffer);
  result.metrics.magicFormat = magic;
  if (magic !== 'wav') {
    result.skipped = true;
    result.reason = 'formato_sem_padronizacao_local';
    return { ...result, buffer: audioBuffer, mimeType };
  }

  const wavMeta = readWavMetadata(audioBuffer);
  const standardized = standardizeWavPcm16(audioBuffer, wavMeta, {
    targetSampleRate: 16000,
    silenceThreshold: 0.015,
    trimPaddingMs: 80,
    targetPeak: 0.88,
    maxGain: 6,
  });

  result.applied = standardized.applied;
  result.stages = standardized.stages || [];
  result.reason = standardized.reason || 'ok';
  result.metrics.outputBytes = standardized.buffer.length;
  result.metrics.outputMimeType = 'audio/wav';
  result.metrics.details = standardized.details || {};

  return {
    ...result,
    buffer: standardized.buffer,
    mimeType: 'audio/wav',
  };
}

function validateAudioForFieldAssist({
  audioBuffer,
  mimeType = '',
  filename = '',
  transcriptFallback = '',
} = {}) {
  const result = {
    provided: Boolean(audioBuffer && audioBuffer.length > 0),
    passed: true,
    blocked: false,
    reasons: [],
    warnings: [],
    metrics: {
      bytes: Buffer.isBuffer(audioBuffer) ? audioBuffer.length : 0,
      mimeType: String(mimeType || '').toLowerCase(),
      filename: String(filename || ''),
    },
  };

  if (!result.provided) {
    result.passed = false;
    result.warnings.push('audio_nao_fornecido');
    return result;
  }

  const hasTranscriptFallback = Boolean(
    normalizeClinicalFieldText(transcriptFallback),
  );
  const mime = String(mimeType || '')
    .toLowerCase()
    .trim();
  const allowedMime = new Set([
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/webm',
    'audio/ogg',
    'audio/opus',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ]);

  const magicFormat = detectAudioMagicFormat(audioBuffer);
  result.metrics.magicFormat = magicFormat;

  if (!mime || (!mime.startsWith('audio/') && !allowedMime.has(mime))) {
    result.blocked = true;
    result.passed = false;
    result.reasons.push('mime_invalido');
  }

  if (result.metrics.bytes <= 0) {
    result.blocked = true;
    result.passed = false;
    result.reasons.push('audio_vazio');
  }

  if (result.metrics.bytes < 16 && !hasTranscriptFallback) {
    result.blocked = true;
    result.passed = false;
    result.reasons.push('audio_muito_curto_em_bytes');
  } else if (result.metrics.bytes < 1024) {
    result.warnings.push('audio_curto_em_bytes');
  }

  const wavMeta = readWavMetadata(audioBuffer);
  if (wavMeta) {
    result.metrics.durationSec = wavMeta.durationSec;
    result.metrics.sampleRate = wavMeta.sampleRate;
    result.metrics.channels = wavMeta.channels;
    result.metrics.bitsPerSample = wavMeta.bitsPerSample;

    if (wavMeta.durationSec < 0.8 && !hasTranscriptFallback) {
      result.blocked = true;
      result.passed = false;
      result.reasons.push('duracao_audio_insuficiente');
    }

    const signal = estimateWavSignalMetrics(audioBuffer, wavMeta);
    if (signal) {
      result.metrics.signal = signal;
      if (
        signal.silenceRatio > 0.985 &&
        signal.rms < 140 &&
        !hasTranscriptFallback
      ) {
        result.blocked = true;
        result.passed = false;
        result.reasons.push('sinal_audio_muito_baixo');
      } else if (signal.silenceRatio > 0.97 || signal.rms < 180) {
        result.warnings.push('sinal_audio_baixo');
      }
    }
  } else {
    result.warnings.push('duracao_indisponivel');
  }

  if (!result.reasons.length && result.passed) {
    result.reasons.push('audio_validado');
  }

  return result;
}

function normalizeSegmentsInput(inputSegments = []) {
  if (!Array.isArray(inputSegments)) return [];
  return inputSegments
    .map((s) => {
      const detection = detectSpeakerWithConfidence(
        s?.text || '',
        s?.speaker || 'Tutor',
        { conservative: true },
      );
      return {
        stamp: s?.stamp || '00:00',
        speaker: detection.speaker,
        speakerConfidence: detection.confidence,
        text: String(s?.text || '').trim(),
      };
    })
    .filter((s) => s.text);
}

async function transcribeWithWhisperAttempt({
  apiKey,
  audioBuffer,
  mimeType,
  filename,
  responseFormat = 'verbose_json',
  language = 'pt',
  provider = 'openai_whisper',
}) {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('response_format', responseFormat);
  if (language) {
    formData.append('language', language);
  }

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = String(data.text || '').trim();
  const outputSegments = Array.isArray(data.segments)
    ? data.segments.map((seg) => {
        const startTime = seg.start || 0;
        const minutes = Math.floor(startTime / 60);
        const seconds = Math.floor(startTime % 60);
        const detection = detectSpeakerWithConfidence(
          (seg.text || '').trim(),
          'Tutor',
          { conservative: true },
        );
        return {
          stamp: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          speaker: detection.speaker,
          speakerConfidence: detection.confidence,
          text: (seg.text || '').trim(),
        };
      })
    : [];

  return {
    provider,
    text,
    segments: outputSegments,
    duration: Number(data.duration || 0),
  };
}

async function transcribeAudioCascade({
  apiKey,
  audioBuffer,
  mimeType,
  filename,
  transcriptFallback = '',
  inputSegments = [],
}) {
  const attempts = [];
  const cascade = [
    {
      provider: 'openai_whisper_verbose_pt',
      responseFormat: 'verbose_json',
      language: 'pt',
    },
    {
      provider: 'openai_whisper_verbose_auto',
      responseFormat: 'verbose_json',
      language: '',
    },
  ];

  // Tentativas sequenciais para respeitar prioridade de provider no fallback.
  /* eslint-disable no-await-in-loop */
  for (const attempt of cascade) {
    const startedAt = Date.now();
    try {
      const transcription = await transcribeWithWhisperAttempt({
        apiKey,
        audioBuffer,
        mimeType,
        filename,
        responseFormat: attempt.responseFormat,
        language: attempt.language,
        provider: attempt.provider,
      });

      attempts.push({
        provider: attempt.provider,
        ok: true,
        latencyMs: Date.now() - startedAt,
        textLength: transcription.text.length,
        segmentsCount: transcription.segments.length,
      });

      const sourceText = transcription.text;
      let finalText = sourceText;
      let usedTranscriptFallback = false;

      if (transcriptFallback) {
        const overlap = lexicalOverlapScore(sourceText, transcriptFallback);
        const whisperHasSignal = hasMinimumClinicalSignal(sourceText);
        const fallbackHasSignal = hasMinimumClinicalSignal(transcriptFallback);

        if (!whisperHasSignal && fallbackHasSignal) {
          finalText = transcriptFallback;
          usedTranscriptFallback = true;
        } else if (
          whisperHasSignal &&
          fallbackHasSignal &&
          overlap < 0.2 &&
          transcriptFallback.length > sourceText.length
        ) {
          finalText = `${sourceText}\n${transcriptFallback}`.trim();
          usedTranscriptFallback = true;
        }
      }

      let finalSegments =
        transcription.segments.length > 0
          ? transcription.segments
          : buildSimpleSegments(finalText);
      if (usedTranscriptFallback) {
        finalSegments = buildSimpleSegments(finalText);
      }

      return {
        transcript: finalText,
        segments: finalSegments,
        selectedProvider: attempt.provider,
        usedTranscriptFallback,
        attempts,
      };
    } catch (error) {
      attempts.push({
        provider: attempt.provider,
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: String(error?.message || 'erro_desconhecido'),
      });
      logger.warn('Falha na tentativa de transcricao', {
        provider: attempt.provider,
        error: error.message,
      });
    }
  }
  /* eslint-enable no-await-in-loop */

  const normalizedInputSegments = normalizeSegmentsInput(inputSegments);
  if (transcriptFallback) {
    return {
      transcript: transcriptFallback,
      segments: buildSimpleSegments(transcriptFallback),
      selectedProvider: 'payload_transcript',
      usedTranscriptFallback: true,
      attempts,
    };
  }

  if (normalizedInputSegments.length > 0) {
    return {
      transcript: normalizedInputSegments.map((s) => s.text).join(' '),
      segments: normalizedInputSegments,
      selectedProvider: 'local_segments',
      usedTranscriptFallback: true,
      attempts,
    };
  }

  return {
    transcript: '',
    segments: [],
    selectedProvider: 'none',
    usedTranscriptFallback: false,
    attempts,
  };
}

function normalizeClinicalTerminology(fieldName = '', value = '') {
  const text = normalizeClinicalFieldText(value);
  if (!text) return '';

  let normalized = text;
  normalized = normalized
    .replace(/\bafebril\b/gi, 'sem febre')
    .replace(/\bnormotermic[ao]\b/gi, 'sem febre')
    .replace(/\bhipertermic[ao]\b/gi, 'febre')
    .replace(/\btrc\b/gi, 'TPC')
    .replace(/\bfc\b/gi, 'FC')
    .replace(/\bfr\b/gi, 'FR')
    .replace(/\bbpm\b/gi, 'BPM')
    .replace(/\b(sid|bid|tid|qid)\b/gi, (match) => match.toUpperCase())
    .replace(
      /(\d+(?:[.,]\d+)?)\s*mg\s*\/?\s*kg\b/gi,
      (_m, dose) => `${dose} mg/kg`,
    )
    .replace(/\b(\d{1,3}(?:[.,]\d)?)\s*°?\s*c\b/gi, (_m, t) => `${t} C`)
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (fieldName === 'physicalExam') {
    normalized = normalized
      .replace(/\btemperatura[: ]*\b/gi, 'Temperatura ')
      .replace(/\bfc[: ]*\b/gi, 'FC ')
      .replace(/\bfr[: ]*\b/gi, 'FR ')
      .replace(/\btpc[: ]*\b/gi, 'TPC ');
  }

  return normalized;
}

function groundingScore(sourceText = '', candidateText = '') {
  const source = normalizeClinicalFieldText(sourceText);
  const candidate = normalizeClinicalFieldText(candidateText);
  if (!source || !candidate) return 0;

  const overlap = lexicalOverlapScore(source, candidate);
  const candidateLength = candidate.length;
  const hasClinicalSignal = hasMinimumClinicalSignal(candidate);

  let score = overlap;
  if (hasClinicalSignal) score += 0.05;
  if (candidateLength > 260 && overlap < 0.25) score -= 0.1;
  if (candidateLength < 12) score -= 0.05;

  return Number(Math.max(0, Math.min(1, score)).toFixed(3));
}

function selectGroundedFieldValue(
  sourceText = '',
  primary = '',
  fallback = '',
) {
  const primaryText = normalizeClinicalFieldText(primary);
  const fallbackText = normalizeClinicalFieldText(fallback);

  if (!primaryText && !fallbackText) return '';
  if (!primaryText) return fallbackText;
  if (!fallbackText) return primaryText;

  const medicationSignalScore = (text) => {
    let score = 0;
    if (/\b\d+(?:[.,]\d+)?\s*mg\s*\/?\s*kg\b/i.test(text)) score += 2;
    if (/\b(sid|bid|tid|qid)\b/i.test(text)) score += 1;
    return score;
  };
  const primaryMedicationScore = medicationSignalScore(primaryText);
  const fallbackMedicationScore = medicationSignalScore(fallbackText);
  if (primaryMedicationScore > fallbackMedicationScore) return primaryText;
  if (fallbackMedicationScore > primaryMedicationScore) return fallbackText;

  const primaryScore = groundingScore(sourceText, primaryText);
  const fallbackScore = groundingScore(sourceText, fallbackText);

  if (fallbackScore > primaryScore + 0.06) return fallbackText;
  if (primaryScore > fallbackScore + 0.06) return primaryText;

  if (fallbackText.length < primaryText.length) return fallbackText;
  return primaryText;
}

function stabilizeTreatmentText(selectedText = '', sourceText = '') {
  const selected = normalizeClinicalFieldText(selectedText);
  const source = normalizeText(sourceText || '');
  const combined = `${normalizeText(selected)} ${source}`.trim();
  if (!combined) return selected;

  const hasNegatedCue = (cueRegex) =>
    new RegExp(`\\b(?:sem|nao)\\b[^.\\n]{0,40}${cueRegex.source}`, 'i').test(
      combined,
    );

  const extractTemporalWindow = () => {
    const explicitWindow = combined.match(
      /\b(\d{1,2}\s*(?:a|-)\s*\d{1,2}\s*(?:h|hora|horas|d|dia|dias))\b/i,
    );
    if (explicitWindow && explicitWindow[1]) {
      return explicitWindow[1].replace(/\s+/g, '');
    }

    const simpleWindow = combined.match(
      /\bem\s+(\d{1,3}\s*(?:h|hora|horas|d|dia|dias))\b/i,
    );
    if (simpleWindow && simpleWindow[1]) {
      return simpleWindow[1].replace(/\s+/g, '');
    }

    const recurrence = combined.match(/\b(\d)\s*x\s*(?:ao\s*)?dia\b/i);
    if (recurrence && recurrence[1]) {
      return `${recurrence[1]}x/dia`;
    }

    return '';
  };

  const treatmentCategories = {
    suporte_hidrico: /\bhidrat|hadrat|ringer|ringe|fluid|sor[oa]\b/,
    ajuste_nutricional: /\bdiet|alimen|nutri|manejo\b/,
    monitoramento: /\bmonitor|retorn|reavali|temperat|2x|duas\s+vezes\b/,
    anti_inflamatorio: /\banti[- ]?inflam|flunix|melox|cetopro\b/,
    antibioticoterapia: /\bantibio|oxitetra|oxitetr|penic|cef|ciclina\b/,
    procedimentos: /\bima\s+ruminal|proced|colet|sondag|curativ\b/,
    exames: /\bexame|hemogram|cultur|copro|ultra|radiograf\b/,
  };

  const detected = Object.entries(treatmentCategories)
    .filter(([, regex]) => regex.test(combined) && !hasNegatedCue(regex))
    .map(([key]) => key);

  if (!detected.length) {
    return selected || 'Conduta: Monitoramento e retorno.';
  }

  const mapLabel = {
    suporte_hidrico: 'Suporte hidrico',
    ajuste_nutricional: 'Ajuste nutricional',
    anti_inflamatorio: 'Anti-inflamatorio',
    antibioticoterapia: 'Antibioticoterapia',
    procedimentos: 'Procedimentos de campo',
    exames: 'Exames complementares',
    monitoramento: 'Monitoramento e retorno',
  };

  const orderedKeys = [
    'suporte_hidrico',
    'ajuste_nutricional',
    'anti_inflamatorio',
    'antibioticoterapia',
    'procedimentos',
    'exames',
    'monitoramento',
  ];

  const labels = orderedKeys
    .filter((key) => detected.includes(key))
    .map((key) => mapLabel[key]);

  if (labels.includes('Monitoramento e retorno')) {
    const temporalWindow = extractTemporalWindow();
    if (temporalWindow) {
      const index = labels.indexOf('Monitoramento e retorno');
      labels[index] = `Monitoramento e retorno (${temporalWindow})`;
    }
  }

  return `Conduta: ${labels.join('; ')}.`;
}

function stabilizeDiagnosisText(selectedText = '', sourceText = '') {
  const selected = normalizeClinicalFieldText(selectedText);
  const source = normalizeText(sourceText || '');
  const combined = `${normalizeText(selected)} ${source}`.trim();
  if (!combined) return selected;

  const rules = [
    {
      regex: /\breticuloperiton|corpo estranho\b/,
      label: 'Reticuloperitonite traumatica',
    },
    {
      regex: /\bcolica|dor abdominal\b/,
      label: 'Sindroma colica em avaliacao',
    },
    {
      regex: /\bmastite|quarto mamario\b/,
      label: 'Suspeita de mastite clinica',
    },
    {
      regex: /\bgastroenter|enterop|diarre\b/,
      label: 'Enteropatia aguda em avaliacao',
    },
    { regex: /\botite|conduto|orelha\b/, label: 'Otite externa em avaliacao' },
    {
      regex: /\bpododerm|casco|manc|claudic\b/,
      label: 'Sindroma locomotora em avaliacao',
    },
  ];

  for (const rule of rules) {
    if (rule.regex.test(combined)) return rule.label;
  }

  return selected;
}

function stabilizePhysicalExamText(selectedText = '', sourceText = '') {
  const selected = normalizeClinicalFieldText(selectedText);
  const source = normalizeText(sourceText || '');
  const combined = `${normalizeText(selected)} ${source}`.trim();
  if (!combined) return selected;

  const hasVitals =
    /\btemperat|\bgraus?\b|\bfc\b|frequenc\w*\s*card|\bfr\b|frequenc\w*\s*resp/.test(
      combined,
    );
  const hasPerfusion = /\bmucos|tpc|desidrat|hidrata/.test(combined);
  const hasSemiology = /\bdor\s+abdom|palpac|motilid|auscult|edema|dor\b/.test(
    combined,
  );

  const snippets = [];
  if (hasVitals)
    snippets.push('Temperatura e frequencias cardiaca/respiratoria avaliadas');
  if (hasPerfusion) snippets.push('Mucosas, perfusao e hidratacao avaliadas');
  if (hasSemiology)
    snippets.push('Dor abdominal e outros achados semiologicos avaliados');

  if (!snippets.length) {
    return selected || 'Exame fisico: informacoes clinicas limitadas.';
  }

  return `Exame fisico: ${snippets.join('; ')}.`;
}

function hasConversationalNoiseOnly(value = '') {
  const text = normalizeText(value || '');
  if (!text) return true;
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length < 10) return true;

  const noisePatterns = [
    /\bbom dia\b/,
    /\bboa tarde\b/,
    /\bboa noite\b/,
    /\bobrigad[oa]\b/,
    /\bcerto[, ]/,
    /\bentendi\b/,
    /\btudo bem\b/,
    /\bpois nao\b/,
  ];

  const clinicalPatterns = [
    /\bexame\b/,
    /\bdiagnost/,
    /\btrat/,
    /\bfebre\b/,
    /\bdor\b/,
    /\bvomit/,
    /\bdiarre/,
    /\btemperat/,
    /\bretorn/,
    /\bmedic/,
  ];

  const hasNoise = noisePatterns.some((pattern) => pattern.test(compact));
  const hasClinical = clinicalPatterns.some((pattern) => pattern.test(compact));

  return hasNoise && !hasClinical;
}

function computeFieldConfidence(
  fieldName = '',
  fieldValue = '',
  sourceText = '',
) {
  const value = normalizeClinicalFieldText(fieldValue);
  if (!value) return 0;

  const grounding = groundingScore(sourceText, value);
  const hasSignal = hasMinimumClinicalSignal(value) ? 0.15 : 0;
  const hasNoisePenalty = hasConversationalNoiseOnly(value) ? -0.35 : 0;

  const fieldHints = {
    chiefComplaint: /\bqueixa|dor|vomit|diarre|tosse|apat|prostr|manc/,
    anamnesis: /\bdesde|histor|evolu|comec|pior|melhor|dias?|horas?/,
    physicalExam: /\bexame|temperat|fc|fr|mucos|palpa|auscult|desidrat/,
    diagnosis:
      /\bdiagnost|suspeit|sindrome|avaliacao|enterop|otite|mastite|colica/,
    treatment: /\bconduta|trat|suporte|hidrata|dieta|anti|monitor|retorn/,
    medications: /\bmg\/kg|sid|bid|tid|medic|prescr|antibio|antiinflam/,
    examDetails: /\bhemogram|ultra|radiograf|cultura|copro|exame/,
    returnRecommendation: /\bretorn|reavali|24|48|72|dias?/,
  };

  const hint = fieldHints[fieldName];
  const hintScore = hint && hint.test(normalizeText(value)) ? 0.12 : 0;

  const finalScore = Math.max(
    0,
    Math.min(1, grounding + hasSignal + hintScore + hasNoisePenalty),
  );
  return Number(finalScore.toFixed(3));
}

function applyFieldQualityGate(
  fieldName = '',
  fieldValue = '',
  sourceText = '',
  options = {},
) {
  const value = normalizeClinicalFieldText(fieldValue);
  if (!value)
    return {
      value: '',
      confidence: 0,
      lowConfidence: false,
      suppressedByConservativeMode: false,
      threshold: 0,
    };

  const confidence = computeFieldConfidence(fieldName, value, sourceText);
  const minThresholdByField = {
    chiefComplaint: 0.12,
    anamnesis: 0.1,
    physicalExam: 0.08,
    diagnosis: 0.08,
    treatment: 0.14,
    medications: 0.12,
    examDetails: 0.12,
    returnRecommendation: 0.12,
  };
  const threshold = minThresholdByField[fieldName] || 0.12;
  const conservativeEnabled = options?.conservativeEnabled !== false;
  const conservativeMinConfidence = Number.isFinite(
    Number(options?.conservativeMinConfidence),
  )
    ? Math.max(0, Math.min(1, Number(options?.conservativeMinConfidence)))
    : 0.08;
  const effectiveLowConfidenceThreshold = conservativeEnabled
    ? Math.max(threshold, conservativeMinConfidence)
    : threshold;
  const lowConfidence = confidence < effectiveLowConfidenceThreshold;

  if (hasConversationalNoiseOnly(value)) {
    return {
      value: '',
      confidence,
      lowConfidence,
      suppressedByConservativeMode: false,
      threshold,
    };
  }

  const source = normalizeText(sourceText || '');
  const preserveByEvidence =
    (fieldName === 'diagnosis' &&
      /\bdiagnost|suspeit|enterop|gastro|otite|mastite|reticul|colica|pododerm/.test(
        source,
      )) ||
    (fieldName === 'physicalExam' &&
      /\bexame|temperat|fc|fr|mucos|desidrat|palpac|dor|motilid|auscult/.test(
        source,
      )) ||
    (fieldName === 'treatment' &&
      /\bconduta|trat|hidrata|dieta|monitor|retorn|anti|exame|proced/.test(
        source,
      ));
  if (preserveByEvidence) {
    return {
      value,
      confidence,
      lowConfidence,
      suppressedByConservativeMode: false,
      threshold,
    };
  }

  if (conservativeEnabled && confidence < conservativeMinConfidence) {
    return {
      value: '',
      confidence,
      lowConfidence: true,
      suppressedByConservativeMode: true,
      threshold,
    };
  }

  if (confidence < threshold && value.length < 40) {
    return {
      value: '',
      confidence,
      lowConfidence: true,
      suppressedByConservativeMode: false,
      threshold: effectiveLowConfidenceThreshold,
    };
  }

  return {
    value,
    confidence,
    lowConfidence,
    suppressedByConservativeMode: false,
    threshold: effectiveLowConfidenceThreshold,
  };
}

function extractFieldEvidenceFromSource(fieldName = '', sourceText = '') {
  const source = normalizeClinicalFieldText(sourceText);
  if (!source) return '';

  const fieldCues = {
    chiefComplaint: /\bqueixa|motivo|dor|vomit|diarre|tosse|apat|manc|prostr/,
    anamnesis: /\bdesde|ha\s+\d|histor|evolu|comec|pior|melhor|dias?|horas?/,
    physicalExam:
      /\bexame|temperat|fc|fr|mucos|palpac|auscult|desidrat|tpc|motilid/,
    diagnosis:
      /\bdiagnost|suspeit|sindrome|enterop|gastro|otite|mastite|colica|pododerm/,
    treatment:
      /\btrat|conduta|hidrata|dieta|monitor|retorn|anti|proced|suporte/,
    medications: /\bmg\/kg|sid|bid|tid|antibio|anti[- ]?inflam|prescr/,
    examDetails: /\bhemogram|ultra|radiograf|cultura|copro|exame complementar/,
    returnRecommendation: /\bretorn|reavali|24|48|72|dias?|horas?/,
  };

  const cue = fieldCues[fieldName];
  const phrases = splitClinicalPhrases(source);
  if (!cue || !phrases.length) return '';

  const ranked = phrases
    .map((phrase) => {
      const normalized = normalizeText(phrase);
      const cueScore = cue.test(normalized) ? 1 : 0;
      const densityScore = Math.min(0.6, tokenizeText(phrase).length / 20);
      return { phrase, score: cueScore + densityScore };
    })
    .filter((item) => item.score > 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.phrase);

  return ranked.join('. ');
}

function ensembleFieldSelection({
  fieldName = '',
  sourceText = '',
  aiValue = '',
  heuristicValue = '',
  stabilizedValue = '',
}) {
  const evidence = extractFieldEvidenceFromSource(fieldName, sourceText);
  const useRawEvidence = ['chiefComplaint', 'anamnesis'].includes(fieldName);
  const candidates = [
    normalizeClinicalFieldText(stabilizedValue),
    normalizeClinicalFieldText(aiValue),
    normalizeClinicalFieldText(heuristicValue),
    useRawEvidence ? normalizeClinicalFieldText(evidence) : '',
  ].filter(Boolean);

  if (!candidates.length) return '';

  const uniqueCandidates = Array.from(new Set(candidates));
  let best = uniqueCandidates[0];
  let bestScore = -1;

  for (const candidate of uniqueCandidates) {
    const grounding = groundingScore(sourceText, candidate);
    const evidenceOverlap = evidence
      ? lexicalOverlapScore(candidate, evidence)
      : 0;
    const confidence = computeFieldConfidence(fieldName, candidate, sourceText);
    const stableBonus =
      normalizeClinicalFieldText(candidate) ===
      normalizeClinicalFieldText(stabilizedValue)
        ? 0.12
        : 0;
    const verbosityPenalty = candidate.length > 320 ? -0.12 : 0;
    const score =
      grounding * 0.42 +
      evidenceOverlap * 0.14 +
      confidence * 0.32 +
      stableBonus +
      verbosityPenalty;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function reconcileFieldByPriority({
  fieldName = '',
  sourceText = '',
  structuredEvidence = '',
  heuristicValue = '',
  aiValue = '',
} = {}) {
  const evidence = normalizeClinicalFieldText(structuredEvidence);
  const heuristic = normalizeClinicalFieldText(heuristicValue);
  const ai = normalizeClinicalFieldText(aiValue);

  const evidenceConfidence = evidence
    ? computeFieldConfidence(fieldName, evidence, sourceText)
    : 0;
  const evidenceGrounding = evidence ? groundingScore(sourceText, evidence) : 0;
  const hasStrongEvidence =
    evidence && (evidenceConfidence >= 0.16 || evidenceGrounding >= 0.2);

  if (hasStrongEvidence) {
    return {
      value: evidence,
      source: 'evidence',
      confidence: Number(evidenceConfidence.toFixed(3)),
      grounding: Number(evidenceGrounding.toFixed(3)),
    };
  }

  const heuristicConfidence = heuristic
    ? computeFieldConfidence(fieldName, heuristic, sourceText)
    : 0;
  const aiConfidence = ai
    ? computeFieldConfidence(fieldName, ai, sourceText)
    : 0;

  if (
    heuristic &&
    (!ai ||
      heuristicConfidence >= aiConfidence + 0.03 ||
      groundingScore(sourceText, heuristic) >=
        groundingScore(sourceText, ai) + 0.03)
  ) {
    return {
      value: heuristic,
      source: 'heuristic',
      confidence: Number(heuristicConfidence.toFixed(3)),
      grounding: Number(groundingScore(sourceText, heuristic).toFixed(3)),
    };
  }

  return {
    value: ai || heuristic || evidence,
    source: ai
      ? 'ai'
      : heuristic
        ? 'heuristic'
        : evidence
          ? 'evidence'
          : 'empty',
    confidence: Number(Math.max(aiConfidence, heuristicConfidence).toFixed(3)),
    grounding: Number(
      Math.max(
        groundingScore(sourceText, ai),
        groundingScore(sourceText, heuristic),
      ).toFixed(3),
    ),
  };
}

function extractClinicalContradictions(sourceText = '', parsed = {}) {
  const source = normalizeText(sourceText || '');
  const diagnosis = normalizeText(parsed?.diagnosis || '');
  const physicalExam = normalizeText(parsed?.physicalExam || '');
  const treatment = normalizeText(parsed?.treatment || '');

  const contradictions = [];

  const hasFeverPositive =
    /\bfebre\b|\bhiperterm|\btemperatura\b[^.\n]{0,20}\b(?:39|40|41)\b/.test(
      source,
    ) || /\bfebre|hiperterm/.test(diagnosis + physicalExam);
  const hasFeverNegative = /\bsem febre\b|\bafebril\b/.test(source);
  if (hasFeverPositive && hasFeverNegative) {
    contradictions.push({
      id: 'febre_contraditoria',
      severity: 'media',
      message: 'Fonte contem "sem febre" e evidencias de febre/hipertermia.',
      fields: ['diagnosis', 'physicalExam'],
    });
  }

  const hasPainPositive =
    /\bdor\b|\bdolor/.test(source + physicalExam + diagnosis) ||
    /\bcolica\b/.test(source + diagnosis);
  const hasPainNegative = /\bsem dor\b|\bindolor/.test(source);
  if (hasPainPositive && hasPainNegative) {
    contradictions.push({
      id: 'dor_contraditoria',
      severity: 'media',
      message: 'Fonte contem "sem dor" e evidencias de dor.',
      fields: ['diagnosis', 'physicalExam'],
    });
  }

  const hasHydrationPositive =
    /\bdesidrat/.test(source + physicalExam) ||
    /\btpc\b[^.\n]{0,12}\b[3-9]\b/.test(source + physicalExam);
  const hasHydrationNegative = /\bbem hidratad|\bhidratad[oa]\b/.test(source);
  if (hasHydrationPositive && hasHydrationNegative) {
    contradictions.push({
      id: 'hidratacao_contraditoria',
      severity: 'media',
      message:
        'Fonte contem hidratacao normal e sinais de desidratacao/tpc alterado.',
      fields: ['physicalExam'],
    });
  }

  const hasAntibioticPositive = /\bantibio|oxitetr|penic|cef/.test(treatment);
  const hasAntibioticNegative = /\bsem antibiot/.test(source + treatment);
  if (hasAntibioticPositive && hasAntibioticNegative) {
    contradictions.push({
      id: 'antibiotico_contraditorio',
      severity: 'baixa',
      message: 'Tratamento menciona antibiotico e tambem negacao de uso.',
      fields: ['treatment', 'medications'],
    });
  }

  return contradictions;
}

function resolveClinicalContradictions(parsed = {}, sourceText = '') {
  const next = { ...parsed };
  const source = normalizeText(sourceText || '');
  const contradictions = extractClinicalContradictions(sourceText, next);

  const hasFeverNegative = /\bsem febre\b|\bafebril\b/.test(source);
  const hasStrongFeverEvidence =
    /\bfebre alta\b|\bhiperterm|\btemperatura\b[^.\n]{0,20}\b(?:39|40|41)\b/.test(
      source,
    );
  if (hasFeverNegative && hasStrongFeverEvidence) {
    // Prioriza evidência objetiva (temperatura numérica alta).
    if (/sem febre|afebril/i.test(next.diagnosis || '')) {
      next.diagnosis = normalizeClinicalFieldText(next.diagnosis)
        .replace(/sem febre|afebril/gi, 'febre presente')
        .trim();
    }
  }

  const hasPainNegative = /\bsem dor\b|\bindolor/.test(source);
  const hasStrongPainEvidence = /\bdor abdominal\b|\bcolica\b|\bdolor/.test(
    source + (next.physicalExam || ''),
  );
  if (hasPainNegative && hasStrongPainEvidence) {
    if (/sem dor|indolor/i.test(next.physicalExam || '')) {
      next.physicalExam = normalizeClinicalFieldText(next.physicalExam)
        .replace(/sem dor|indolor/gi, 'dor presente')
        .trim();
    }
  }

  const hasAntibioticNegative = /\bsem antibiot/.test(
    source + (next.treatment || ''),
  );
  if (hasAntibioticNegative && /antibiot/i.test(next.treatment || '')) {
    next.treatment = normalizeClinicalFieldText(next.treatment)
      .replace(/antibioticoterapia;?\s*/gi, '')
      .replace(/;;+/g, ';')
      .replace(/:\s*;/g, ': ')
      .trim();
    if (!next.treatment || /^conduta:\s*$/i.test(next.treatment)) {
      next.treatment = 'Conduta: Monitoramento e retorno.';
    }
  }

  return { parsed: next, contradictions };
}

function recoverCriticalClinicalFields(parsed = {}, sourceText = '') {
  const next = { ...parsed };
  const recoveredFields = [];
  const source = normalizeText(sourceText || '');

  const hasDiagnosisEvidence =
    /\bdiagnost|suspeit|colica|mastite|enterop|gastro|otite|pododerm|reticul|prognost/.test(
      source,
    );
  const hasExamEvidence =
    /\bexame|temperat|fc|fr|mucos|tpc|desidrat|palpac|auscult|motilid|dor abdominal\b/.test(
      source,
    );
  const hasTreatmentEvidence =
    /\bconduta|tratamento|trat\b|hidrata|dieta|monitor|retorn|antibio|anti[- ]?inflam|proced|colet|orient/.test(
      source,
    );

  if (!normalizeClinicalFieldText(next.diagnosis) && hasDiagnosisEvidence) {
    const diagnosisEvidence = extractFieldEvidenceFromSource(
      'diagnosis',
      sourceText,
    );
    next.diagnosis =
      stabilizeDiagnosisText(diagnosisEvidence, sourceText) ||
      'Suspeita diagnostica em avaliacao clinica.';
    recoveredFields.push('diagnosis');
  }

  if (!normalizeClinicalFieldText(next.physicalExam) && hasExamEvidence) {
    const examEvidence = extractFieldEvidenceFromSource(
      'physicalExam',
      sourceText,
    );
    next.physicalExam =
      stabilizePhysicalExamText(examEvidence, sourceText) ||
      'Exame fisico: informacoes clinicas limitadas.';
    recoveredFields.push('physicalExam');
  }

  if (!normalizeClinicalFieldText(next.treatment) && hasTreatmentEvidence) {
    const treatmentEvidence = extractFieldEvidenceFromSource(
      'treatment',
      sourceText,
    );
    next.treatment =
      stabilizeTreatmentText(treatmentEvidence, sourceText) ||
      'Conduta: Monitoramento e retorno.';
    recoveredFields.push('treatment');
  }

  for (const fieldName of ['physicalExam', 'diagnosis', 'treatment']) {
    next[fieldName] = normalizeClinicalTerminology(fieldName, next[fieldName]);
  }

  return {
    parsed: next,
    recoveredFields: Array.from(new Set(recoveredFields)),
  };
}

function classifyPorteWithEvidence({ sourceText = '', parsed = {} } = {}) {
  const source = normalizeText(sourceText || '');
  const species = normalizeText(parsed?.especie || '');
  const breed = normalizeText(parsed?.raca || '');
  const owner = normalizeText(parsed?.ownerName || '');
  const combined = `${source} ${species} ${breed} ${owner}`.trim();

  const rules = [
    {
      key: 'grande',
      regex: /\bgrande porte\b/,
      weight: 4,
      reason: 'porte_explicito_grande',
    },
    {
      key: 'pequeno',
      regex: /\bpequeno porte\b/,
      weight: 4,
      reason: 'porte_explicito_pequeno',
    },
    {
      key: 'grande',
      regex: /\bbovin|equin|ovin|caprin|bubal|asinin|muar|suin\b/,
      weight: 3,
      reason: 'especie_grande_porte',
    },
    {
      key: 'grande',
      regex: /\brebanh|lote|fazenda|haras|lacta|rumin|cmt|mastite\b/,
      weight: 2,
      reason: 'contexto_campo_grande',
    },
    {
      key: 'grande',
      regex: /\bcasco|claudic|motilidade ruminal|reticuloperiton/i,
      weight: 2,
      reason: 'semiologia_grande',
    },
    {
      key: 'pequeno',
      regex: /\bcanin|felin|pet|gato|cachorr|filhote\b/,
      weight: 3,
      reason: 'especie_pequeno_porte',
    },
    {
      key: 'pequeno',
      regex: /\btutor|apartament|coleira|passeio|caixa de areia\b/,
      weight: 2,
      reason: 'contexto_domestico_pequeno',
    },
    {
      key: 'pequeno',
      regex: /\botite|dermatit|traqueobronq|cistite felina\b/,
      weight: 1,
      reason: 'casuistica_pequeno',
    },
  ];

  const evidence = [];
  const score = { grande: 0, pequeno: 0 };
  for (const rule of rules) {
    if (rule.regex.test(combined)) {
      score[rule.key] += rule.weight;
      evidence.push({ reason: rule.reason, weight: rule.weight });
    }
  }

  const speciesHintGrande =
    /\bbovin|equin|ovin|caprin|bubal|asinin|muar|suin/.test(species + breed);
  const speciesHintPequeno = /\bcanin|felin/.test(species + breed);
  if (speciesHintGrande) score.grande += 2;
  if (speciesHintPequeno) score.pequeno += 2;

  let porte = 'pequeno';
  if (score.grande > score.pequeno) porte = 'grande';
  else if (score.pequeno > score.grande) porte = 'pequeno';
  else if (speciesHintGrande) porte = 'grande';

  const diff = Math.abs(score.grande - score.pequeno);
  const confidence = Number(
    Math.min(1, 0.4 + diff / 6 + (evidence.length ? 0.1 : 0)).toFixed(3),
  );

  return {
    porte,
    confidence,
    confident: confidence >= 0.65,
    score,
    evidence: evidence.slice(0, 6),
  };
}

function sanitizeAiString(value, maxLen = 1800) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function sanitizeAiObject(raw = {}, schema = {}) {
  const output = {};
  for (const [key, type] of Object.entries(schema)) {
    const value =
      raw && Object.prototype.hasOwnProperty.call(raw, key)
        ? raw[key]
        : undefined;

    if (type === 'string') {
      output[key] = sanitizeAiString(value);
      continue;
    }

    if (type && typeof type === 'object') {
      const nested =
        value && typeof value === 'object' && !Array.isArray(value)
          ? value
          : {};
      output[key] = sanitizeAiObject(nested, type);
      continue;
    }

    output[key] = '';
  }
  return output;
}

function enforceAiResponseSchema(rawParsed = {}) {
  const schema = {
    transcricao_organizada: 'string',
    identificacao: {
      nome_animal: 'string',
      especie: 'string',
      raca: 'string',
      idade: 'string',
      sexo: 'string',
      peso: 'string',
    },
    anamnese: {
      queixa_principal: 'string',
      historico_do_problema: 'string',
      alimentacao: 'string',
      ambiente: 'string',
      vacinacao: 'string',
      vermifugacao: 'string',
      doencas_previas: 'string',
      uso_medicacao: 'string',
    },
    exame_fisico: {
      estado_geral: 'string',
      temperatura: 'string',
      frequencia_cardiaca: 'string',
      frequencia_respiratoria: 'string',
      mucosas: 'string',
      hidratacao: 'string',
      achados_relevantes: 'string',
    },
    avaliacao: {
      suspeitas_clinicas: 'string',
      diagnostico_presuntivo: 'string',
    },
    plano: {
      exames_solicitados: 'string',
      medicacoes_prescritas: 'string',
      orientacoes_ao_tutor: 'string',
      retorno: 'string',
    },
    autoavaliacao: {
      queixa_principal_evidencia: 'string',
      historico_do_problema_evidencia: 'string',
      achados_relevantes_evidencia: 'string',
      diagnostico_presuntivo_evidencia: 'string',
      orientacoes_ao_tutor_evidencia: 'string',
      medicacoes_prescritas_evidencia: 'string',
      exames_solicitados_evidencia: 'string',
      retorno_evidencia: 'string',
    },
  };

  const base =
    rawParsed && typeof rawParsed === 'object' && !Array.isArray(rawParsed)
      ? rawParsed
      : {};
  const sanitized = sanitizeAiObject(base, schema);
  return {
    data: sanitized,
    droppedFieldsCount: Object.keys(base).filter(
      (key) => !Object.prototype.hasOwnProperty.call(schema, key),
    ).length,
  };
}

function evaluateAiSelfCheck(rawParsed = {}, sourceText = '') {
  const source = normalizeClinicalFieldText(sourceText);
  const safe = rawParsed && typeof rawParsed === 'object' ? rawParsed : {};
  const auto = safe.autoavaliacao || {};

  const checks = [
    {
      id: 'queixa_principal',
      value: safe?.anamnese?.queixa_principal || '',
      evidence: auto?.queixa_principal_evidencia || '',
      targetGroup: 'anamnese',
      targetKey: 'queixa_principal',
      minGrounding: 0.05,
    },
    {
      id: 'historico_do_problema',
      value: safe?.anamnese?.historico_do_problema || '',
      evidence: auto?.historico_do_problema_evidencia || '',
      targetGroup: 'anamnese',
      targetKey: 'historico_do_problema',
      minGrounding: 0.05,
    },
    {
      id: 'achados_relevantes',
      value: safe?.exame_fisico?.achados_relevantes || '',
      evidence: auto?.achados_relevantes_evidencia || '',
      targetGroup: 'exame_fisico',
      targetKey: 'achados_relevantes',
      minGrounding: 0.05,
    },
    {
      id: 'diagnostico_presuntivo',
      value: safe?.avaliacao?.diagnostico_presuntivo || '',
      evidence: auto?.diagnostico_presuntivo_evidencia || '',
      targetGroup: 'avaliacao',
      targetKey: 'diagnostico_presuntivo',
      minGrounding: 0.06,
    },
    {
      id: 'orientacoes_ao_tutor',
      value: safe?.plano?.orientacoes_ao_tutor || '',
      evidence: auto?.orientacoes_ao_tutor_evidencia || '',
      targetGroup: 'plano',
      targetKey: 'orientacoes_ao_tutor',
      minGrounding: 0.06,
    },
    {
      id: 'medicacoes_prescritas',
      value: safe?.plano?.medicacoes_prescritas || '',
      evidence: auto?.medicacoes_prescritas_evidencia || '',
      targetGroup: 'plano',
      targetKey: 'medicacoes_prescritas',
      minGrounding: 0.06,
    },
    {
      id: 'exames_solicitados',
      value: safe?.plano?.exames_solicitados || '',
      evidence: auto?.exames_solicitados_evidencia || '',
      targetGroup: 'plano',
      targetKey: 'exames_solicitados',
      minGrounding: 0.06,
    },
    {
      id: 'retorno',
      value: safe?.plano?.retorno || '',
      evidence: auto?.retorno_evidencia || '',
      targetGroup: 'plano',
      targetKey: 'retorno',
      minGrounding: 0.05,
    },
  ];

  const sanitized = {
    ...safe,
    anamnese: { ...(safe.anamnese || {}) },
    exame_fisico: { ...(safe.exame_fisico || {}) },
    avaliacao: { ...(safe.avaliacao || {}) },
    plano: { ...(safe.plano || {}) },
    autoavaliacao: { ...(auto || {}) },
  };

  const byField = {};
  let accepted = 0;
  let evaluated = 0;

  for (const check of checks) {
    const value = normalizeClinicalFieldText(check.value || '');
    if (!value || /nao informado na consulta/i.test(value)) {
      byField[check.id] = {
        accepted: true,
        skipped: true,
        reason: 'vazio_ou_nao_informado',
        valueGrounding: 0,
        evidenceGrounding: 0,
      };
      continue;
    }
    evaluated += 1;
    const evidence = normalizeClinicalFieldText(check.evidence || '');
    const valueGrounding = groundingScore(source, value);
    const evidenceGrounding = evidence ? groundingScore(source, evidence) : 0;
    const hasEvidence =
      evidence && !/nao informado na consulta/i.test(evidence)
        ? evidenceGrounding >= 0.045
        : false;
    const acceptedByGrounding = valueGrounding >= check.minGrounding;
    const acceptedByStrongGrounding =
      valueGrounding >= check.minGrounding + 0.015;
    const acceptedByClinicalSignal =
      hasMinimumClinicalSignal(value) && valueGrounding >= check.minGrounding;
    const acceptedField =
      acceptedByGrounding &&
      (hasEvidence || acceptedByStrongGrounding || acceptedByClinicalSignal);

    if (!acceptedField) {
      if (sanitized[check.targetGroup]) {
        sanitized[check.targetGroup][check.targetKey] = '';
      }
    } else {
      accepted += 1;
    }

    byField[check.id] = {
      accepted: acceptedField,
      skipped: false,
      reason: acceptedField
        ? hasEvidence
          ? 'evidencia_e_grounding_ok'
          : 'grounding_alto_sem_evidencia_explicita'
        : 'sem_evidencia_suficiente',
      valueGrounding,
      evidenceGrounding,
      evidenceProvided: Boolean(evidence),
    };
  }

  const score = evaluated ? Number((accepted / evaluated).toFixed(3)) : 1;
  return {
    sanitized,
    report: {
      score,
      acceptedFields: accepted,
      evaluatedFields: evaluated,
      needsReview: score < 0.65,
      byField,
    },
  };
}

function normalizeSpeakerLabel(value = 'Tutor') {
  const raw = normalizeText(value).trim();
  if (
    raw === 'indefinido' ||
    raw === 'indefinida' ||
    raw === 'unknown' ||
    raw === 'desconhecido'
  ) {
    return 'Indefinido';
  }
  if (
    raw === 'medico' ||
    raw === 'veterinario' ||
    raw === 'veterinaria' ||
    raw === 'vet' ||
    raw === 'dr' ||
    raw === 'dra' ||
    raw === 'doutor' ||
    raw === 'doutora' ||
    raw === 'assistant'
  ) {
    return 'Medico';
  }
  return 'Tutor';
}

function parseTaggedSpeakerPhrase(phrase = '', fallbackSpeaker = 'Tutor') {
  const fallback = normalizeSpeakerLabel(fallbackSpeaker);
  const stripped = String(phrase || '')
    .replace(
      /^\s*(?:\[\d{1,2}:\d{2}(?::\d{2})?\]|\d{1,2}:\d{2}(?::\d{2})?)\s*/,
      '',
    )
    .trim();

  if (!stripped) {
    return { explicit: false, speaker: fallback, text: '' };
  }

  const match = stripped.match(
    /^(Tutor|Responsavel|Responsável|Proprietario|Proprietário|Vet|Veterinario|Veterinário|Veterinaria|Veterinária|Medico|Médico|Dr|Dra|Doutor|Doutora)\s*(?::|-|–|—|->|=>|\|)\s*(.+)$/i,
  );

  if (!match) {
    return { explicit: false, speaker: fallback, text: stripped };
  }

  return {
    explicit: true,
    speaker: normalizeSpeakerLabel(match[1]),
    text: String(match[2] || '').trim(),
  };
}

/**
 * Detecta o speaker (Tutor ou Medico) baseado no texto
 */
function detectSpeakerWithConfidence(
  phrase,
  fallbackSpeaker = 'Tutor',
  options = {},
) {
  const conservative = options?.conservative !== false;
  const minConfidence = Number(options?.minConfidence || 0.58);
  const parsedPhrase = parseTaggedSpeakerPhrase(phrase, fallbackSpeaker);
  const fallback = normalizeSpeakerLabel(fallbackSpeaker);
  if (parsedPhrase.explicit) {
    return {
      speaker: parsedPhrase.speaker,
      confidence: 0.99,
      explicit: true,
      reason: 'tag_explicita',
      tutorScore: 0,
      vetScore: 0,
    };
  }

  const normalized = normalizeText(parsedPhrase.text || '');
  if (!normalized) {
    return {
      speaker: conservative ? 'Indefinido' : fallback,
      confidence: 0.2,
      explicit: false,
      reason: 'texto_vazio',
      tutorScore: 0,
      vetScore: 0,
    };
  }

  const tutorSignals = [
    'doutor',
    'doutora',
    'dr ',
    'dra ',
    'ele ta',
    'ela ta',
    'ele está',
    'ela está',
    'em casa',
    'desde ontem',
    'desde hoje',
    'nao come',
    'nao bebe',
    'vomito',
    'diarreia',
    'tosse',
    'coceira',
    'percebi',
    'notei',
    'estou preocupado',
    'meu cachorro',
    'meu gato',
    'meu animal',
    'o dog',
    'o gato',
    'o pet',
    'aqui em casa',
    'em casa',
    'ele nao',
    'ela nao',
    'estou',
    'to ',
    'minha',
    'meu',
    'comecou',
    'piorou',
    'melhorou',
    'quando',
    'desde',
    'faz',
    'ontem',
    'hoje',
    'de noite',
    'de manha',
  ];

  const vetSignals = [
    'no exame',
    'ao exame',
    'diagnostico',
    'conduta',
    'tratamento',
    'prescrevo',
    'prescricao',
    'oriento',
    'retorno',
    'solicito exame',
    'vamos medicar',
    'fc ',
    'fr ',
    'temperatura',
    'avaliacao clinica',
    'exame fisico',
    'palpacao',
    'ausculta',
    'suspeita',
    'prescrito',
    'recomendo',
    'encaminhar',
    'coletar',
    'orientação',
    'orientacao',
    'vamos fazer',
    'vamos iniciar',
    'iniciar',
    'prescrevo',
    'prescrever',
    'avaliacao',
    'suspeito',
    'hipotese',
    'prognostico',
    'vamos solicitar',
    'solicito',
    'ultrassom',
    'hemograma',
  ];

  let tutorScore = 0;
  let vetScore = 0;

  for (const signal of tutorSignals) {
    if (normalized.includes(signal)) tutorScore += 2;
  }
  for (const signal of vetSignals) {
    if (normalized.includes(signal)) vetScore += 2;
  }

  if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) {
    tutorScore += 1;
  }
  if (/\?$/.test(String(phrase || '').trim())) tutorScore += 1;
  if (/\b(fc|fr|trc|mucosa|ausculta|palpacao)\b/.test(normalized))
    vetScore += 2;
  if (/\b(prescricao|receita|mg\/kg|sid|bid|tid)\b/.test(normalized))
    vetScore += 2;

  const diff = Math.abs(tutorScore - vetScore);
  const sum = tutorScore + vetScore;
  let confidence = 0.35;
  if (sum > 0) {
    confidence = Math.min(0.97, 0.45 + diff / (sum + 2));
  }

  let speaker = fallback;
  let reason = 'fallback';
  if (tutorScore > vetScore) {
    speaker = 'Tutor';
    reason = 'sinais_tutor';
  } else if (vetScore > tutorScore) {
    speaker = 'Medico';
    reason = 'sinais_medico';
  } else {
    speaker = fallback;
    reason = 'empate';
  }

  if (conservative && confidence < minConfidence) {
    return {
      speaker: 'Indefinido',
      confidence: Number(confidence.toFixed(3)),
      explicit: false,
      reason: 'baixa_confianca',
      tutorScore,
      vetScore,
    };
  }

  return {
    speaker,
    confidence: Number(confidence.toFixed(3)),
    explicit: false,
    reason,
    tutorScore,
    vetScore,
  };
}

function summarizeDiarization(segments = []) {
  const normalized = Array.isArray(segments) ? segments : [];
  const counts = { Tutor: 0, Medico: 0, Indefinido: 0 };
  let confidenceSum = 0;
  let withConfidence = 0;
  let lowConfidenceSegments = 0;

  for (const seg of normalized) {
    const speaker = normalizeSpeakerLabel(seg?.speaker || 'Indefinido');
    if (speaker in counts) counts[speaker] += 1;
    const confidence = Number(seg?.speakerConfidence || 0);
    if (confidence > 0) {
      confidenceSum += confidence;
      withConfidence += 1;
      if (confidence < 0.58) lowConfidenceSegments += 1;
    } else if (speaker === 'Indefinido') {
      lowConfidenceSegments += 1;
    }
  }

  const avgConfidence = withConfidence
    ? Number((confidenceSum / withConfidence).toFixed(3))
    : 0;

  return {
    counts,
    avgConfidence,
    lowConfidenceSegments,
    needsReview: lowConfidenceSegments > 0 || counts.Indefinido > 0,
  };
}

function extractVitalSignsFromText(sourceText = '') {
  const text = String(sourceText || '');
  if (!text) {
    return {
      temperatura: '',
      frequencia_cardiaca: '',
      frequencia_respiratoria: '',
    };
  }

  const toNumber = (raw = '') => {
    const num = Number(
      String(raw || '')
        .replace(',', '.')
        .trim(),
    );
    return Number.isFinite(num) ? num : null;
  };

  let temperatura = '';
  const tempMatch =
    text.match(
      /\b(?:temperatura|temp)\D{0,12}(\d{2}(?:[.,]\d)?)\s*(?:°?\s*c|graus?)?\b/i,
    ) || text.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:°?\s*c|graus?)\b/i);
  const temp = toNumber(tempMatch?.[1] || '');
  if (temp !== null && temp >= 34 && temp <= 43) {
    temperatura = `${temp.toFixed(1)} C`;
  }

  let frequenciaCardiaca = '';
  const fcMatch = text.match(
    /\b(?:fc|frequ[eê]ncia\s+card[ií]aca)\D{0,10}(\d{2,3})\s*(?:bpm)?\b/i,
  );
  const fc = toNumber(fcMatch?.[1] || '');
  if (fc !== null && fc >= 20 && fc <= 260) {
    frequenciaCardiaca = `${Math.round(fc)} bpm`;
  }

  let frequenciaRespiratoria = '';
  const frMatch = text.match(
    /\b(?:fr|frequ[eê]ncia\s+respirat[oó]ria)\D{0,10}(\d{1,3})\s*(?:mpm|irpm)?\b/i,
  );
  const fr = toNumber(frMatch?.[1] || '');
  if (fr !== null && fr >= 5 && fr <= 180) {
    frequenciaRespiratoria = `${Math.round(fr)} mpm`;
  }

  return {
    temperatura,
    frequencia_cardiaca: frequenciaCardiaca,
    frequencia_respiratoria: frequenciaRespiratoria,
  };
}

/**
 * Normaliza transcrição com timestamps removendo marcações de tempo
 */
function normalizeTimestampedTranscript(transcript = '') {
  const text = String(transcript || '').trim();
  if (!text) return '';
  // Remove timestamps no formato [mm:ss] ou mm:ss do início das linhas
  return text.replace(/^\[?\d{1,2}:\d{2}\]?\s*/gm, '').trim();
}

function normalizeClinicalTranscriptForParsing(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\bf\s*c\b/gi, 'FC')
    .replace(/\bf\s*r\b/gi, 'FR')
    .replace(/\bt\s*r\s*c\b/gi, 'TPC')
    .replace(/\bfrequ[eê]ncia\s+card[ií]aca\b/gi, 'FC')
    .replace(/\bfrequ[eê]ncia\s+respirat[oó]ria\b/gi, 'FR')
    .replace(/\bmiligramas?\s+por\s+quilo\b/gi, 'mg/kg')
    .replace(/\bmg\s+kg\b/gi, 'mg/kg')
    .replace(/\bduas\s+vezes\s+ao\s+dia\b/gi, 'BID')
    .replace(/\btr[eê]s\s+vezes\s+ao\s+dia\b/gi, 'TID')
    .replace(/\buma\s+vez\s+ao\s+dia\b/gi, 'SID')
    .replace(/\bde\s+12\s+em\s+12\s+horas\b/gi, 'BID')
    .replace(/\bde\s+8\s+em\s+8\s+horas\b/gi, 'TID')
    .replace(/\bafebril\b/gi, 'sem febre')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extrai transcrição das notas do prontuário (campo notes)
 */
function extractTranscriptFromNotes(notes = '') {
  const text = String(notes || '');
  // Procura por seções de transcrição nas notas
  const transcriptMatch = text.match(
    /(?:transcri[cç][ãa]o|transcription|audio)[\s:]*([\s\S]*?)(?=\n\n|$)/i,
  );
  if (transcriptMatch && transcriptMatch[1]) {
    return transcriptMatch[1].trim();
  }
  return normalizeTimestampedTranscript(text);
}

/**
 * Constrói segmentos simples quando só temos texto sem timestamp
 */
function buildSimpleSegments(text = '') {
  const words = text.split(/\s+/);
  let elapsed = 0;
  const segments = [];
  let currentSegment = { stamp: '00:00', speaker: 'Tutor', text: '' };
  let wordCount = 0;

  words.forEach((word) => {
    if (wordCount > 0 && wordCount % 8 === 0) {
      // Detecta speaker antes de salvar o segmento
      currentSegment.text = currentSegment.text.trim();
      if (currentSegment.text) {
        const detection = detectSpeakerWithConfidence(
          currentSegment.text,
          currentSegment.speaker,
          { conservative: true },
        );
        currentSegment.speaker = detection.speaker;
        currentSegment.speakerConfidence = detection.confidence;
      }
      segments.push(currentSegment);
      elapsed += Math.ceil(wordCount / 3);
      currentSegment = {
        stamp: `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`,
        speaker: 'Tutor',
        text: '',
      };
    }
    currentSegment.text = `${currentSegment.text}${word} `;
    wordCount += 1;
  });

  if (currentSegment.text.trim()) {
    currentSegment.text = currentSegment.text.trim();
    const detection = detectSpeakerWithConfidence(
      currentSegment.text,
      currentSegment.speaker,
      { conservative: true },
    );
    currentSegment.speaker = detection.speaker;
    currentSegment.speakerConfidence = detection.confidence;
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Extração básica de campos clínicos (fallback) - definida antes de parseClinicalFieldsFromSegments
 */
function basicFieldExtraction(text = '') {
  const result = {};

  // Extrai queixa principal
  const queixaMatch = text.match(
    /(?:queixa|principal|problema)[\s:]*([^.!?\n]+)/i,
  );
  if (queixaMatch && queixaMatch[1]) {
    result.chiefComplaint = queixaMatch[1].trim();
  }

  // Extrai anamnese
  const anamneseMatch = text.match(
    /(?:anamnese|hist[óo]rico)[\s:]*([^.!?\n]+)/i,
  );
  if (anamneseMatch && anamneseMatch[1]) {
    result.anamnesis = anamneseMatch[1].trim();
  }

  // Extrai diagnóstico
  const diagnosticoMatch = text.match(
    /(?:diagn[óo]stico|suspeita)[\s:]*([^.!?\n]+)/i,
  );
  if (diagnosticoMatch && diagnosticoMatch[1]) {
    result.diagnosis = diagnosticoMatch[1].trim();
  }

  // Extrai tratamento
  const tratamentoMatch = text.match(
    /(?:tratamento|conduta)[\s:]*([^.!?\n]+)/i,
  );
  if (tratamentoMatch && tratamentoMatch[1]) {
    result.treatment = tratamentoMatch[1].trim();
  }

  return result;
}

function splitClinicalPhrases(text = '') {
  return normalizeClinicalTranscriptForParsing(text || '')
    .replace(/\r/g, '\n')
    .split(/[.!?;\n]+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueJoin(items = [], max = 5) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const value = String(item || '').trim();
    if (!value) continue;
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= max) break;
  }
  return result.join('. ');
}

function scoreFieldCandidate(phrase = '', field = '', speaker = 'Tutor') {
  const normalized = normalizeText(phrase);
  if (!normalized) return 0;

  const cues = {
    chiefComplaint: ['queixa', 'motivo', 'trouxe', 'principal', 'reclam'],
    anamnesis: [
      'desde',
      'historico',
      'evolucao',
      'comecou',
      'piorou',
      'melhorou',
    ],
    physicalExam: [
      'exame',
      'palpacao',
      'ausculta',
      'mucosa',
      'temperatura',
      'fc',
      'fr',
    ],
    diagnosis: ['diagnostico', 'suspeita', 'hipotese', 'compativel'],
    treatment: ['tratamento', 'conduta', 'oriento', 'recomendo', 'iniciar'],
    medications: [
      'prescrevo',
      'prescricao',
      'medicacao',
      'receita',
      'mg/kg',
      'sid',
      'bid',
      'tid',
    ],
    returnRecommendation: ['retorno', 'reavaliar', 'voltar', 'revisao'],
    examDetails: [
      'hemograma',
      'ultrassom',
      'radiografia',
      'exame complementar',
      'solicito exame',
    ],
    procedures: ['coleta', 'curativo', 'procedimento', 'drenagem', 'sutura'],
  };

  let score = 0;
  for (const cue of cues[field] || []) {
    if (normalized.includes(cue)) score += 2;
  }

  if (speaker === 'Tutor') {
    if (field === 'chiefComplaint' || field === 'anamnesis') score += 1;
    if (
      field === 'physicalExam' ||
      field === 'diagnosis' ||
      field === 'treatment'
    )
      score -= 1;
  }
  if (speaker === 'Medico') {
    if (
      field === 'physicalExam' ||
      field === 'diagnosis' ||
      field === 'treatment' ||
      field === 'medications' ||
      field === 'examDetails' ||
      field === 'procedures'
    ) {
      score += 1;
    }
  }

  return score;
}

/**
 * Parses clinical fields from conversation segments
 * @param {Array} segments - Array de segmentos da conversa
 * @param {string} sourceText - Texto original da conversa
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.skipUnifiedBrain - Se true, pula a chamada ao runUnifiedClinicalBrain para evitar loop infinito
 */
function parseClinicalFieldsFromSegments(
  segments = [],
  sourceText = '',
  options = {},
) {
  try {
    const skipUnifiedBrain = Boolean(options?.skipUnifiedBrain);
    const normalizedSourceText = normalizeClinicalTranscriptForParsing(
      Array.isArray(sourceText) ? sourceText.join(' ') : sourceText,
    );
    const allText = normalizedSourceText || '';
    const baseSegments = Array.isArray(segments) ? segments : [];
    const parsedSegments = baseSegments.length
      ? baseSegments.map((seg) => ({
          ...seg,
          text: normalizeClinicalTranscriptForParsing(seg?.text || ''),
        }))
      : buildSimpleSegments(allText);

    const normalizedSegments = parsedSegments
      .map((seg) => {
        const detection = detectSpeakerWithConfidence(
          seg?.text || '',
          seg?.speaker || 'Tutor',
          { conservative: true },
        );
        return {
          stamp: seg?.stamp || '00:00',
          speaker: detection.speaker,
          speakerConfidence: detection.confidence,
          text: String(seg?.text || '').trim(),
        };
      })
      .filter((seg) => seg.text);

    const buckets = {
      chiefComplaint: [],
      anamnesis: [],
      physicalExam: [],
      diagnosis: [],
      treatment: [],
      medications: [],
      procedures: [],
      examDetails: [],
      returnRecommendation: [],
    };

    const speakerStats = { Tutor: 0, Medico: 0, Indefinido: 0 };

    for (const seg of normalizedSegments) {
      const speaker = normalizeSpeakerLabel(seg.speaker || 'Indefinido');
      speakerStats[speaker] += 1;
      const phrases = splitClinicalPhrases(seg.text);
      for (const phrase of phrases) {
        const scored = Object.keys(buckets)
          .map((field) => ({
            field,
            score: scoreFieldCandidate(phrase, field, speaker),
          }))
          .sort((a, b) => b.score - a.score);

        const best = scored[0];
        if (best && best.score >= 2) {
          buckets[best.field].push(phrase);
        } else if (speaker === 'Tutor') {
          if (buckets.chiefComplaint.length < 2)
            buckets.chiefComplaint.push(phrase);
          else buckets.anamnesis.push(phrase);
        } else if (buckets.physicalExam.length < 2)
          buckets.physicalExam.push(phrase);
        else if (speaker === 'Indefinido') {
          buckets.anamnesis.push(phrase);
        } else buckets.treatment.push(phrase);
      }
    }

    const tutorText = normalizedSegments
      .filter((seg) => seg.speaker === 'Tutor')
      .map((seg) => seg.text)
      .join(' ');
    const medicoText = normalizedSegments
      .filter((seg) => seg.speaker === 'Medico')
      .map((seg) => seg.text)
      .join(' ');
    const fallbackText = `${tutorText} ${medicoText} ${allText}`.trim();

    const fallback = basicFieldExtraction(fallbackText);

    const parsed = {
      chiefComplaint:
        uniqueJoin(buckets.chiefComplaint, 3) ||
        fallback.chiefComplaint ||
        splitClinicalPhrases(tutorText)[0] ||
        '',
      anamnesis: uniqueJoin(buckets.anamnesis, 5) || fallback.anamnesis || '',
      physicalExam:
        uniqueJoin(buckets.physicalExam, 5) || fallback.physicalExam || '',
      diagnosis: uniqueJoin(buckets.diagnosis, 4) || fallback.diagnosis || '',
      treatment: uniqueJoin(buckets.treatment, 5) || fallback.treatment || '',
      medications: uniqueJoin(buckets.medications, 5) || '',
      procedures: uniqueJoin(buckets.procedures, 4) || '',
      examDetails: uniqueJoin(buckets.examDetails, 4) || '',
      returnRecommendation: uniqueJoin(buckets.returnRecommendation, 3) || '',
    };

    const coreFields = [
      'chiefComplaint',
      'anamnesis',
      'physicalExam',
      'diagnosis',
      'treatment',
      'medications',
      'examDetails',
      'returnRecommendation',
    ];
    for (const fieldName of coreFields) {
      parsed[fieldName] = normalizeClinicalTerminology(
        fieldName,
        parsed[fieldName],
      );
    }

    const speakerTotal = speakerStats.Tutor + speakerStats.Medico || 1;
    const speakerDiff = Math.abs(speakerStats.Tutor - speakerStats.Medico);
    const roleReliability = Number(
      Math.min(
        1,
        (speakerDiff + Math.min(speakerStats.Tutor, speakerStats.Medico)) /
          speakerTotal,
      ).toFixed(2),
    );

    const context = {
      tutorContent: tutorText || '',
      medicoContent: medicoText || '',
      skipUnifiedBrain,
      roleReliability: {
        score: roleReliability,
        reliable: roleReliability >= 0.45,
      },
      diarization: summarizeDiarization(normalizedSegments),
    };

    const missingCore = [
      'chiefComplaint',
      'anamnesis',
      'physicalExam',
      'diagnosis',
      'treatment',
    ].filter((key) => !String(parsed[key] || '').trim());

    const pipeline = {
      semanticRules: {
        alerts: missingCore.length
          ? [
              {
                id: 'missing_core_fields',
                severity: 'media',
                message: `Campos clinicos com baixa evidencia: ${missingCore.join(', ')}`,
              },
            ]
          : [],
      },
    };

    return { parsed, context, pipeline };
  } catch (err) {
    logger.error('parseClinicalFieldsFromSegments erro:', err.message, {
      stack: err.stack,
    });
    return { parsed: {}, context: {}, pipeline: {} };
  }
}

/**
 * Analisa conversa de campo (áudio/transcrição)
 */
async function analyzeFieldConversation({
  requestId,
  audioBuffer,
  mimeType,
  filename,
  segments,
  transcript,
  conservativeMode,
  conservativeMinConfidence,
  promptContextMode,
}) {
  const pipelineTracker = createFieldAssistPipelineTracker(requestId);
  const resolvedRequestId = pipelineTracker.requestId;
  const transcriptFallback = normalizeTimestampedTranscript(transcript) || '';
  let workingAudioBuffer = audioBuffer;
  let workingMimeType = mimeType;
  let finalTranscription = '';
  let finalSegments = [];
  let usedTranscriptFallback = false;
  let audioStandardization = {
    applied: false,
    skipped: true,
    reason: 'audio_ausente',
    stages: [],
    metrics: {},
  };
  let transcriptionMeta = {
    selectedProvider: 'none',
    usedTranscriptFallback: false,
    attempts: [],
  };
  let audioValidation = {
    provided: false,
    passed: false,
    blocked: false,
    reasons: ['audio_nao_fornecido'],
    warnings: [],
    metrics: { bytes: 0, mimeType: String(mimeType || '') },
  };
  let diarizationSummary = {
    counts: { Tutor: 0, Medico: 0, Indefinido: 0 },
    avgConfidence: 0,
    lowConfidenceSegments: 0,
    needsReview: false,
  };
  const conservativeEnabled =
    typeof conservativeMode === 'boolean'
      ? conservativeMode
      : String(process.env.FIELD_ASSIST_CONSERVATIVE_MODE || 'true')
          .trim()
          .toLowerCase() !== 'false';
  const resolvedConservativeMinConfidence = Number.isFinite(
    Number(conservativeMinConfidence),
  )
    ? Math.max(0, Math.min(1, Number(conservativeMinConfidence)))
    : Number.isFinite(
          Number(process.env.FIELD_ASSIST_CONSERVATIVE_MIN_CONFIDENCE),
        )
      ? Math.max(
          0,
          Math.min(
            1,
            Number(process.env.FIELD_ASSIST_CONSERVATIVE_MIN_CONFIDENCE),
          ),
        )
      : 0.08;

  // Debug: log dos parâmetros recebidos
  logger.info('analyzeFieldConversation chamado', {
    requestId: resolvedRequestId,
    hasAudioBuffer: !!(audioBuffer && audioBuffer.length > 0),
    audioBufferLength: audioBuffer ? audioBuffer.length : 0,
    mimeType,
    filename,
    segmentsCount: Array.isArray(segments) ? segments.length : 0,
    transcriptLength: transcript ? transcript.length : 0,
  });

  // Se há buffer de áudio, transcreve em cascata
  if (workingAudioBuffer && workingAudioBuffer.length > 0) {
    pipelineTracker.startStage('audio_standardization');
    const standardized = standardizeAudioInputForFieldAssist({
      audioBuffer: workingAudioBuffer,
      mimeType: workingMimeType,
      filename,
    });
    workingAudioBuffer = standardized.buffer;
    workingMimeType = standardized.mimeType;
    audioStandardization = {
      applied: standardized.applied,
      skipped: standardized.skipped,
      reason: standardized.reason,
      stages: standardized.stages,
      metrics: standardized.metrics,
    };
    pipelineTracker.endStage('audio_standardization', {
      applied: audioStandardization.applied,
      skipped: audioStandardization.skipped,
      reason: audioStandardization.reason,
    });
    logger.info('Padronizacao de audio (field-assist)', {
      requestId: resolvedRequestId,
      ...audioStandardization,
    });

    pipelineTracker.startStage('audio_validation');
    audioValidation = validateAudioForFieldAssist({
      audioBuffer: workingAudioBuffer,
      mimeType: workingMimeType,
      filename,
      transcriptFallback,
    });
    pipelineTracker.endStage('audio_validation', {
      passed: audioValidation.passed,
      blocked: audioValidation.blocked,
      reasons: audioValidation.reasons,
    });
    logger.info('Validacao de audio (field-assist)', {
      requestId: resolvedRequestId,
      ...audioValidation,
    });

    if (audioValidation.blocked) {
      logger.warn('Audio bloqueado na validacao pre-IA', {
        requestId: resolvedRequestId,
        reasons: audioValidation.reasons,
        warnings: audioValidation.warnings,
      });
    }

    if (!audioValidation.blocked) {
      try {
        pipelineTracker.startStage('transcription');
        const apiKey = process.env.OPENAI_API_KEY;
        logger.info('Verificando OPENAI_API_KEY para transcricao', {
          requestId: resolvedRequestId,
          hasApiKey: !!apiKey,
          apiKeyPrefix: apiKey ? apiKey.substring(0, 10) : 'undefined',
        });

        if (apiKey) {
          logger.info('Preparando transcricao em cascata', {
            requestId: resolvedRequestId,
            bufferLength: workingAudioBuffer.length,
            mimeType: workingMimeType,
            filename,
          });
          const cascadeResult = await transcribeAudioCascade({
            apiKey,
            audioBuffer: workingAudioBuffer,
            mimeType: workingMimeType,
            filename,
            transcriptFallback,
            inputSegments: segments,
          });
          finalTranscription = cascadeResult.transcript || '';
          finalSegments = cascadeResult.segments || [];
          usedTranscriptFallback = Boolean(
            cascadeResult.usedTranscriptFallback,
          );
          transcriptionMeta = {
            selectedProvider: cascadeResult.selectedProvider,
            usedTranscriptFallback,
            attempts: cascadeResult.attempts || [],
          };

          logger.info('Transcricao em cascata concluida', {
            requestId: resolvedRequestId,
            selectedProvider: transcriptionMeta.selectedProvider,
            attempts: transcriptionMeta.attempts.length,
            usedTranscriptFallback,
            transcriptionLength: finalTranscription.length,
            segmentsCount: finalSegments.length,
          });
        } else {
          logger.warn('OPENAI_API_KEY nao configurada para transcricao', {
            requestId: resolvedRequestId,
          });
        }
        pipelineTracker.endStage('transcription', {
          provider: transcriptionMeta.selectedProvider,
          attempts: transcriptionMeta.attempts.length,
          usedTranscriptFallback: transcriptionMeta.usedTranscriptFallback,
        });
      } catch (audioError) {
        logger.error('Erro ao transcrever audio:', audioError.message, {
          requestId: resolvedRequestId,
          stack: audioError.stack,
        });
        pipelineTracker.endStage('transcription', {
          status: 'erro',
          error: audioError.message,
        });
      }
    }
  } else {
    pipelineTracker.endStage('audio_standardization', {
      skipped: true,
      reason: 'audio_ausente',
    });
    pipelineTracker.endStage('audio_validation', {
      skipped: true,
      reason: 'audio_ausente',
    });
    pipelineTracker.endStage('transcription', {
      skipped: true,
      reason: 'audio_ausente',
    });
    logger.info('Sem audioBuffer - usando transcricao fornecida ou segmentos', {
      requestId: resolvedRequestId,
    });
  }

  // Se tem segmentos direto da requisição usa eles
  if (
    !finalTranscription &&
    finalSegments.length === 0 &&
    segments &&
    segments.length > 0
  ) {
    finalSegments = normalizeSegmentsInput(segments);
    if (finalSegments.length > 0) {
      transcriptionMeta.selectedProvider = 'local_segments';
      transcriptionMeta.usedTranscriptFallback = true;
    }
  }

  // Usa a transcrição fornecida diretamente na requisição como fallback
  if (!finalTranscription && finalSegments.length === 0) {
    finalTranscription = transcriptFallback;
    if (finalTranscription) {
      transcriptionMeta.selectedProvider = 'payload_transcript';
      transcriptionMeta.usedTranscriptFallback = true;
    }
  }

  pipelineTracker.startStage('source_assembly');
  const sourceTextFinal =
    finalSegments.length > 0
      ? finalSegments.map((s) => s.text).join(' ')
      : finalTranscription;
  pipelineTracker.endStage('source_assembly', {
    transcriptLength: sourceTextFinal.length,
    segmentsCount: finalSegments.length,
  });
  const extractedVitals = extractVitalSignsFromText(sourceTextFinal);
  diarizationSummary = summarizeDiarization(finalSegments);

  logger.info('Iniciando análise em paralelo: IA + Heurística', {
    requestId: resolvedRequestId,
    transcriptLength: sourceTextFinal.length,
    segmentsCount: finalSegments.length,
  });

  // Roda IA e Heurística em paralelo
  pipelineTracker.startStage('ai_analysis');
  pipelineTracker.startStage('heuristic_parse');
  const [aiResult, heuristicResult] = await Promise.all([
    // IA: análise com OpenAI
    analyzeWithAI(sourceTextFinal, finalSegments, {
      contextMode: promptContextMode,
    }).catch((err) => {
      logger.error('Erro na análise com IA:', err.message);
      return null;
    }),
    // Heurística: parse tradicional
    Promise.resolve(
      parseClinicalFieldsFromSegments(finalSegments, sourceTextFinal),
    ),
  ]);
  pipelineTracker.endStage('ai_analysis', {
    success: Boolean(aiResult),
    provider: aiResult ? 'openai' : 'none',
  });
  pipelineTracker.endStage('heuristic_parse', {
    success: Boolean(heuristicResult?.parsed),
  });

  // Combina os resultados com reconciliacao por prioridade
  let combinedParsed = {};
  let combinedSegments = finalSegments;
  let reconciliation = {};

  if (aiResult) {
    pipelineTracker.startStage('reconciliation_merge');
    // Usa segments da IA se disponíveis
    if (aiResult.segments && aiResult.segments.length > 0) {
      combinedSegments = aiResult.segments;
      logger.info('Usando segments da IA');
    }

    // Combina campos - IA é mais detalhada, mas usa heurística como backup
    const aiFields = aiResult.fields || {};
    const heuristicFields = heuristicResult?.parsed || {};
    const sourceForGrounding =
      sourceTextFinal ||
      combinedSegments.map((segment) => segment.text).join(' ');

    const selectedTreatment = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.orientacoes_ao_tutor || aiFields.tratamento,
      heuristicFields.treatment,
    );
    const selectedDiagnosis = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.diagnostico_presuntivo || aiFields.diagnostico_sugestivo,
      heuristicFields.diagnosis,
    );
    const selectedPhysicalExam = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.achados_relevantes || aiFields.exame_fisico,
      heuristicFields.physicalExam,
    );
    const selectedMedications = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.medicacoes_prescritas,
      heuristicFields.medications,
    );
    const selectedExamDetails = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.exames_solicitados,
      heuristicFields.examDetails,
    );
    const selectedReturnRecommendation = selectGroundedFieldValue(
      sourceForGrounding,
      aiFields.retorno || aiFields.recomendacoes,
      heuristicFields.returnRecommendation,
    );
    const stabilizedDiagnosis = stabilizeDiagnosisText(
      selectedDiagnosis,
      sourceForGrounding,
    );
    const stabilizedPhysicalExam = stabilizePhysicalExamText(
      selectedPhysicalExam,
      sourceForGrounding,
    );
    const stabilizedTreatment = stabilizeTreatmentText(
      selectedTreatment,
      sourceForGrounding,
    );

    const finalChiefComplaint = ensembleFieldSelection({
      fieldName: 'chiefComplaint',
      sourceText: sourceForGrounding,
      aiValue: aiFields.queixa_principal,
      heuristicValue: heuristicFields.chiefComplaint,
      stabilizedValue:
        aiFields.queixa_principal || heuristicFields.chiefComplaint,
    });
    const finalAnamnesis = ensembleFieldSelection({
      fieldName: 'anamnesis',
      sourceText: sourceForGrounding,
      aiValue: aiFields.historico_do_problema || aiFields.anamnese,
      heuristicValue: heuristicFields.anamnesis,
      stabilizedValue:
        aiFields.historico_do_problema ||
        aiFields.anamnese ||
        heuristicFields.anamnesis,
    });

    const reconciliationCandidates = {
      chiefComplaint: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'chiefComplaint',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.chiefComplaint,
        aiValue: finalChiefComplaint,
      },
      anamnesis: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'anamnesis',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.anamnesis,
        aiValue: finalAnamnesis,
      },
      physicalExam: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'physicalExam',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.physicalExam,
        aiValue: stabilizedPhysicalExam,
      },
      diagnosis: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'diagnosis',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.diagnosis,
        aiValue: stabilizedDiagnosis,
      },
      treatment: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'treatment',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.treatment,
        aiValue: stabilizedTreatment,
      },
      medications: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'medications',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.medications,
        aiValue: selectedMedications,
      },
      examDetails: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'examDetails',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.examDetails,
        aiValue: selectedExamDetails,
      },
      returnRecommendation: {
        structuredEvidence: extractFieldEvidenceFromSource(
          'returnRecommendation',
          sourceForGrounding,
        ),
        heuristicValue: heuristicFields.returnRecommendation,
        aiValue: selectedReturnRecommendation,
      },
    };

    const reconciled = {};
    for (const [fieldName, values] of Object.entries(
      reconciliationCandidates,
    )) {
      reconciled[fieldName] = reconcileFieldByPriority({
        fieldName,
        sourceText: sourceForGrounding,
        ...values,
      });
    }
    reconciliation = reconciled;

    // Mapeia os novos campos da IA para o formato do frontend
    combinedParsed = {
      // Identificação (novos campos)
      nome_animal: aiFields.nome_animal || '',
      especie: aiFields.especie || '',
      raca: aiFields.raca || '',
      idade: aiFields.idade || '',
      sexo: aiFields.sexo || '',
      peso: aiFields.peso || '',

      // Anamnese
      chiefComplaint: reconciled.chiefComplaint?.value || '',
      anamnese: reconciled.anamnesis?.value || '',
      anamnesis: reconciled.anamnesis?.value || '',
      alimentacao: aiFields.alimentacao || '',
      ambiente: aiFields.ambiente || '',
      vacinacao: aiFields.vacinacao || '',
      vermifugacao: aiFields.vermifugacao || '',
      doencas_previas: aiFields.doencas_previas || '',
      uso_medicacao: aiFields.uso_medicacao || '',

      // Exame físico
      physicalExam: reconciled.physicalExam?.value || '',
      estado_geral: aiFields.estado_geral || '',
      temperatura: aiFields.temperatura || '',
      frequencia_cardiaca: aiFields.frequencia_cardiaca || '',
      frequencia_respiratoria: aiFields.frequencia_respiratoria || '',
      mucosas: aiFields.mucosas || '',
      hidratacao: aiFields.hidratacao || '',

      // Avaliação
      diagnosis: reconciled.diagnosis?.value || '',
      suspeitas_clinicas: aiFields.suspeitas_clinicas || '',

      // Plano
      treatment: reconciled.treatment?.value || '',
      medications: reconciled.medications?.value || '',
      examDetails: reconciled.examDetails?.value || '',
      returnRecommendation: reconciled.returnRecommendation?.value || '',

      // Transcrição organizada
      transcricao_organizada: aiFields.transcricao_organizada || '',
    };

    logger.info('Resultado combinado: IA + Heuristica + Reconciliacao', {
      requestId: resolvedRequestId,
      hasChiefComplaint: !!combinedParsed.chiefComplaint,
      hasAnamnese: !!combinedParsed.anamnese,
      hasDiagnosis: !!combinedParsed.diagnosis,
      hasTreatment: !!combinedParsed.treatment,
    });
    pipelineTracker.endStage('reconciliation_merge', {
      source: 'ai_plus_heuristic',
    });
  } else {
    // Sem IA - usa só heurística
    pipelineTracker.endStage('reconciliation_merge', {
      source: 'heuristic_only',
    });
    logger.info('Usando apenas heurística (IA indisponível)', {
      requestId: resolvedRequestId,
    });
    combinedParsed = {
      chiefComplaint: heuristicResult?.parsed?.chiefComplaint || '',
      anamnese: heuristicResult?.parsed?.anamnesis || '',
      anamnesis: heuristicResult?.parsed?.anamnesis || '',
      physicalExam: heuristicResult?.parsed?.physicalExam || '',
      diagnosis: heuristicResult?.parsed?.diagnosis || '',
      treatment: heuristicResult?.parsed?.treatment || '',
      procedures: heuristicResult?.parsed?.procedures || '',
      medications: heuristicResult?.parsed?.medications || '',
      examDetails: heuristicResult?.parsed?.examDetails || '',
      notes: heuristicResult?.parsed?.notes || '',
      returnRecommendation: heuristicResult?.parsed?.returnRecommendation || '',
    };
    reconciliation = {
      chiefComplaint: { source: 'heuristic' },
      anamnesis: { source: 'heuristic' },
      physicalExam: { source: 'heuristic' },
      diagnosis: { source: 'heuristic' },
      treatment: { source: 'heuristic' },
      medications: { source: 'heuristic' },
      examDetails: { source: 'heuristic' },
      returnRecommendation: { source: 'heuristic' },
    };
  }

  const qualityFields = [
    'chiefComplaint',
    'anamnesis',
    'physicalExam',
    'diagnosis',
    'treatment',
    'medications',
    'examDetails',
    'returnRecommendation',
  ];

  for (const fieldName of qualityFields) {
    combinedParsed[fieldName] = normalizeClinicalTerminology(
      fieldName,
      combinedParsed[fieldName],
    );
  }

  const fieldConfidence = {};
  const lowConfidenceFields = [];
  const suppressedFields = [];
  pipelineTracker.startStage('quality_gate');
  for (const fieldName of qualityFields) {
    const gate = applyFieldQualityGate(
      fieldName,
      combinedParsed[fieldName],
      sourceTextFinal,
      {
        conservativeEnabled,
        conservativeMinConfidence: resolvedConservativeMinConfidence,
      },
    );
    combinedParsed[fieldName] = gate.value;
    fieldConfidence[fieldName] = gate.confidence;
    if (gate.lowConfidence) {
      lowConfidenceFields.push(fieldName);
    }
    if (gate.suppressedByConservativeMode) suppressedFields.push(fieldName);
  }
  pipelineTracker.endStage('quality_gate', {
    lowConfidenceFieldsCount: lowConfidenceFields.length,
    suppressedFieldsCount: suppressedFields.length,
  });

  pipelineTracker.startStage('critical_field_recovery');
  const criticalRecovery = recoverCriticalClinicalFields(
    combinedParsed,
    sourceTextFinal,
  );
  combinedParsed = criticalRecovery.parsed;
  for (const fieldName of criticalRecovery.recoveredFields) {
    fieldConfidence[fieldName] = computeFieldConfidence(
      fieldName,
      combinedParsed[fieldName],
      sourceTextFinal,
    );
    const lowConfidenceIndex = lowConfidenceFields.indexOf(fieldName);
    if (lowConfidenceIndex >= 0)
      lowConfidenceFields.splice(lowConfidenceIndex, 1);
    const suppressedIndex = suppressedFields.indexOf(fieldName);
    if (suppressedIndex >= 0) suppressedFields.splice(suppressedIndex, 1);
  }
  pipelineTracker.endStage('critical_field_recovery', {
    recoveredFieldsCount: criticalRecovery.recoveredFields.length,
    recoveredFields: criticalRecovery.recoveredFields,
  });

  if ('anamnesis' in combinedParsed) {
    combinedParsed.anamnese = combinedParsed.anamnesis;
  }

  if (!String(combinedParsed.temperatura || '').trim()) {
    combinedParsed.temperatura = extractedVitals.temperatura;
  }
  if (!String(combinedParsed.frequencia_cardiaca || '').trim()) {
    combinedParsed.frequencia_cardiaca = extractedVitals.frequencia_cardiaca;
  }
  if (!String(combinedParsed.frequencia_respiratoria || '').trim()) {
    combinedParsed.frequencia_respiratoria =
      extractedVitals.frequencia_respiratoria;
  }

  pipelineTracker.startStage('contradiction_resolution');
  const contradictionResolution = resolveClinicalContradictions(
    combinedParsed,
    sourceTextFinal,
  );
  combinedParsed = contradictionResolution.parsed;
  const porteDecision = classifyPorteWithEvidence({
    sourceText: sourceTextFinal,
    parsed: combinedParsed,
  });
  if (!String(combinedParsed.porte || '').trim()) {
    combinedParsed.porte = porteDecision.porte;
  }
  pipelineTracker.endStage('contradiction_resolution', {
    contradictionsCount: contradictionResolution.contradictions.length,
    porte: porteDecision.porte,
  });

  const pipelineSummary = pipelineTracker.buildSummary();

  const debugArtifactPath = await persistFieldAssistDebugArtifact({
    requestId: resolvedRequestId,
    payload: {
      requestId: resolvedRequestId,
      pipeline: pipelineSummary,
      transcriptionMeta,
      audioValidation,
      aiPrompt: aiResult?.prompt || null,
      aiSelfCheck: aiResult?.selfCheck || null,
      reconciliation,
      parsed: combinedParsed,
    },
  });
  if (debugArtifactPath) {
    pipelineSummary.debugArtifactPath = debugArtifactPath;
  }

  // Retorna também transcript e segments para o frontend
  return {
    parsed: combinedParsed,
    transcript: sourceTextFinal,
    segments: combinedSegments,
    quality: {
      fieldConfidence,
      lowConfidenceFields,
      needsReview: lowConfidenceFields.length > 0,
      conservativeMode: {
        enabled: conservativeEnabled,
        minConfidence: resolvedConservativeMinConfidence,
        suppressedFields,
      },
      contradictions: contradictionResolution.contradictions,
      porteDecision,
      aiSchema:
        aiResult && aiResult.schema
          ? {
              strict: true,
              droppedFieldsCount: aiResult.schema.droppedFieldsCount || 0,
            }
          : { strict: false, droppedFieldsCount: 0 },
      aiPrompt: aiResult?.prompt
        ? {
            version: aiResult.prompt.version || 'unknown',
            requestedVersion: aiResult.prompt.requestedVersion || 'unknown',
            fallbackApplied: Boolean(aiResult.prompt.fallbackApplied),
            contextMode: aiResult.prompt.contextMode || 'unknown',
            species: aiResult.prompt.species || 'unknown',
            porte: aiResult.prompt.porte || 'unknown',
            fewShotCount: Array.isArray(aiResult.prompt.fewShotExamples)
              ? aiResult.prompt.fewShotExamples.length
              : 0,
            fewShotExampleIds: Array.isArray(aiResult.prompt.fewShotExamples)
              ? aiResult.prompt.fewShotExamples.map((item) => item.id)
              : [],
          }
        : {
            version: 'heuristic_only',
            requestedVersion: 'heuristic_only',
            fallbackApplied: false,
            contextMode: 'heuristic_only',
            species: 'heuristic_only',
            porte: 'heuristic_only',
            fewShotCount: 0,
            fewShotExampleIds: [],
          },
      aiSelfCheck: aiResult?.selfCheck
        ? {
            score: Number(aiResult.selfCheck.score || 0),
            acceptedFields: Number(aiResult.selfCheck.acceptedFields || 0),
            evaluatedFields: Number(aiResult.selfCheck.evaluatedFields || 0),
            needsReview: Boolean(aiResult.selfCheck.needsReview),
            byField: aiResult.selfCheck.byField || {},
          }
        : {
            score: 0,
            acceptedFields: 0,
            evaluatedFields: 0,
            needsReview: false,
            byField: {},
          },
      reconciliation,
      audioValidation,
      transcriptionMeta,
      diarization: diarizationSummary,
      audioStandardization,
      pipeline: pipelineSummary,
    },
  };
}

/**
 * Escreve memória heurística
 */
function writeHeuristicMemory(inputData) {
  try {
    const data = Array.isArray(inputData) ? inputData : [];
    // Armazena em memória global como fallback
    global.vetProHeuristicMemory = data;
  } catch (e) {
    logger.warn('Falha ao salvar memoria heuristica:', e.message);
    global.vetProHeuristicMemory = [];
  }
}

/**
 * Lê memória heurística
 */
function readHeuristicMemory() {
  try {
    return global.vetProHeuristicMemory || [];
  } catch (e) {
    logger.warn('Falha ao ler memoria heuristica:', e.message);
    return [];
  }
}

/**
 * Usa IA para separar speakers e extrair campos clínicos detalhados
 * Segue pipeline de 4 etapas:
 * 1) Whisper/ASR → Transcrição bruta
 * 2) LLM 1 → Separação Vet / Tutor
 * 3) LLM 2 → Extração estruturada
 * 4) LLM 3 → Refinamento clínico
 */
async function analyzeWithAI(
  transcript = '',
  existingSegments = [],
  options = {},
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY não configurada para análise com IA');
    return null;
  }

  const combinedText =
    existingSegments.length > 0
      ? existingSegments.map((s) => s.text).join(' ')
      : transcript;

  if (!combinedText || combinedText.length < 20) {
    logger.info('Texto muito curto para análise com IA');
    return null;
  }

  const promptBundle = resolveFieldAssistPrompt({
    combinedText,
    contextMode: options?.contextMode,
  });
  const { systemPrompt, userPrompt } = promptBundle;
  logger.info('Field-assist prompt selecionado', {
    version: promptBundle.version,
    requestedVersion: promptBundle.requestedVersion,
    fallbackApplied: promptBundle.fallbackApplied,
    status: promptBundle.status,
  });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erro na API OpenAI:', {
        status: response.status,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      logger.warn('Resposta vazia da OpenAI');
      return null;
    }

    const parsedRaw = JSON.parse(content);
    const enforced = enforceAiResponseSchema(parsedRaw);
    const selfCheck = evaluateAiSelfCheck(enforced.data, combinedText);
    const parsed = selfCheck.sanitized;
    logger.info('Análise IA concluída', {
      hasTranscricao: !!parsed.transcricao_organizada,
      hasIdentificacao: !!parsed.identificacao,
      hasAnamnese: !!parsed.anamnese,
      hasExameFisico: !!parsed.exame_fisico,
      hasAvaliacao: !!parsed.avaliacao,
      hasPlano: !!parsed.plano,
      droppedFieldsCount: enforced.droppedFieldsCount,
      promptVersion: promptBundle.version,
      aiSelfCheckScore: selfCheck.report.score,
    });

    // Mapeia a nova estrutura para o formato esperado pelo frontend
    const mappedFields = {
      // Transcrição organizada
      transcricao_organizada: parsed.transcricao_organizada || '',

      // Identificação
      nome_animal: parsed.identificacao?.nome_animal || '',
      especie: parsed.identificacao?.especie || '',
      raca: parsed.identificacao?.raca || '',
      idade: parsed.identificacao?.idade || '',
      sexo: parsed.identificacao?.sexo || '',
      peso: parsed.identificacao?.peso || '',

      // Anamnese
      queixa_principal: parsed.anamnese?.queixa_principal || '',
      historico_do_problema: parsed.anamnese?.historico_do_problema || '',
      alimentacao: parsed.anamnese?.alimentacao || '',
      ambiente: parsed.anamnese?.ambiente || '',
      vacinacao: parsed.anamnese?.vacinacao || '',
      vermifugacao: parsed.anamnese?.vermifugacao || '',
      doencas_previas: parsed.anamnese?.doencas_previas || '',
      uso_medicacao: parsed.anamnese?.uso_medicacao || '',

      // Exame físico
      estado_geral: parsed.exame_fisico?.estado_geral || '',
      temperatura: parsed.exame_fisico?.temperatura || '',
      frequencia_cardiaca: parsed.exame_fisico?.frequencia_cardiaca || '',
      frequencia_respiratoria:
        parsed.exame_fisico?.frequencia_respiratoria || '',
      mucosas: parsed.exame_fisico?.mucosas || '',
      hidratacao: parsed.exame_fisico?.hidratacao || '',
      achados_relevantes: parsed.exame_fisico?.achados_relevantes || '',

      // Avaliação
      suspeitas_clinicas: parsed.avaliacao?.suspeitas_clinicas || '',
      diagnostico_presuntivo: parsed.avaliacao?.diagnostico_presuntivo || '',

      // Plano
      exames_solicitados: parsed.plano?.exames_solicitados || '',
      medicacoes_prescritas: parsed.plano?.medicacoes_prescritas || '',
      orientacoes_ao_tutor: parsed.plano?.orientacoes_ao_tutor || '',
      retorno: parsed.plano?.retorno || '',
    };

    // Gera segments a partir da transcrição organizada
    const segments = [];
    if (parsed.transcricao_organizada) {
      const lines = parsed.transcricao_organizada.split('\n');
      let currentSpeaker = 'Tutor';
      let currentText = '';

      for (const line of lines) {
        const vetMatch = line.match(/^\[VETERINÁRIO\]:\s*(.*)/i);
        const tutorMatch = line.match(/^\[TUTOR\]:\s*(.*)/i);
        const indefinidoMatch = line.match(/^\[INDEFINIDO\]:\s*(.*)/i);

        if (vetMatch) {
          const [, vetText = ''] = vetMatch;
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Medico';
          currentText = vetText;
        } else if (tutorMatch) {
          const [, tutorText = ''] = tutorMatch;
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Tutor';
          currentText = tutorText;
        } else if (indefinidoMatch) {
          const [, indefinidoText = ''] = indefinidoMatch;
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Tutor';
          currentText = indefinidoText;
        } else if (line.trim()) {
          currentText += ` ${line}`;
        }
      }

      if (currentText && currentSpeaker) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
    }

    return {
      fields: mappedFields,
      segments,
      raw: parsed, // Mantém resultado sanitizado para debug seguro
      prompt: {
        version: promptBundle.version,
        requestedVersion: promptBundle.requestedVersion,
        fallbackApplied: promptBundle.fallbackApplied,
        contextMode: promptBundle.contextMode,
        species: promptBundle.species,
        porte: promptBundle.porte,
        fewShotExamples: promptBundle.fewShotExamples || [],
      },
      selfCheck: selfCheck.report,
      schema: {
        strict: true,
        droppedFieldsCount: enforced.droppedFieldsCount,
      },
    };
  } catch (error) {
    logger.error('Erro na análise com IA:', error.message);
    return null;
  }
}

module.exports = {
  analyzeFieldConversation,
  parseClinicalFieldsFromSegments,
  extractTranscriptFromNotes,
  normalizeTimestampedTranscript,
  writeHeuristicMemory,
  readHeuristicMemory,
  analyzeWithAI,
};
