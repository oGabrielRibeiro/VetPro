const {
  parseClinicalFieldsFromSegments,
  analyzeFieldConversation,
} = require('../services/fieldAssistFunctions');

describe('fieldAssistFunctions.parseClinicalFieldsFromSegments', () => {
  it('deve separar conteúdo clínico por campo com base em falas de Tutor e Medico', () => {
    const segments = [
      {
        stamp: '00:05',
        speaker: 'Tutor',
        text: 'Doutor, ele esta vomitando desde ontem e nao quer comer.',
      },
      {
        stamp: '00:20',
        speaker: 'Medico',
        text: 'No exame fisico, mucosas rosadas e temperatura 39.5 graus.',
      },
      {
        stamp: '00:33',
        speaker: 'Medico',
        text: 'Diagnostico presuntivo de gastroenterite. Vou iniciar tratamento com hidratacao e prescrevo ondansetrona 0,2 mg/kg BID.',
      },
      {
        stamp: '00:45',
        speaker: 'Medico',
        text: 'Solicito hemograma e retorno em 48 horas.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.parsed.chiefComplaint).toMatch(/vomitando|nao quer comer/i);
    expect(result.parsed.anamnesis).toMatch(/desde ontem|vomitando/i);
    expect(result.parsed.physicalExam).toMatch(/mucosas|temperatura/i);
    expect(result.parsed.diagnosis).toMatch(/gastroenterite/i);
    expect(result.parsed.treatment).toMatch(/tratamento|hidratacao/i);
    expect(result.parsed.medications).toMatch(/ondansetrona|mg\/kg|bid/i);
    expect(result.parsed.examDetails).toMatch(/hemograma/i);
  });

  it('deve reclassificar speaker quando a frase tem forte evidência de fala médica', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Tutor',
        text: 'Dr ele esta com diarreia ha dois dias.',
      },
      {
        stamp: '00:12',
        speaker: 'Tutor',
        text: 'No exame fisico observei dor abdominal e suspeita de gastrite.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.medicoContent).toMatch(/exame fisico|suspeita/i);
    expect(result.parsed.diagnosis).toMatch(/gastrite|suspeita/i);
  });

  it('deve gerar alerta semântico quando faltam campos clínicos centrais', () => {
    const segments = [
      {
        stamp: '00:02',
        speaker: 'Tutor',
        text: 'Ele esta mais quieto hoje.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(Array.isArray(result.pipeline?.semanticRules?.alerts)).toBe(true);
    expect(result.pipeline.semanticRules.alerts.length).toBeGreaterThan(0);
    expect(result.pipeline.semanticRules.alerts[0].id).toBe(
      'missing_core_fields',
    );
  });

  it('deve funcionar sem segmentos usando texto livre como fallback', () => {
    const text =
      'Queixa principal: tosse seca. Anamnese: começou ontem. Diagnostico: traqueite. Tratamento: repouso e nebulizacao.';

    const result = parseClinicalFieldsFromSegments([], text);

    expect(result.parsed.chiefComplaint).toMatch(/tosse/i);
    expect(result.parsed.anamnesis).toMatch(/ontem|anamnese/i);
    expect(result.parsed.diagnosis).toMatch(/traqueite/i);
    expect(result.parsed.treatment).toMatch(/repouso|nebulizacao/i);
  });

  it('deve respeitar prefixo explicito de speaker com timestamp e separador hifen', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Tutor',
        text: '[00:01] Tutor - Ele esta mancando desde ontem.',
      },
      {
        stamp: '00:10',
        speaker: 'Tutor',
        text: '[00:10] Vet - No exame fisico: dor a palpacao e edema local.',
      },
      {
        stamp: '00:19',
        speaker: 'Tutor',
        text: '[00:19] Medico - Diagnostico: entorse. Tratamento com anti-inflamatorio.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.tutorContent).toMatch(/mancando desde ontem/i);
    expect(result.context.medicoContent).toMatch(
      /exame fisico|diagnostico|tratamento/i,
    );
    expect(result.parsed.diagnosis).toMatch(/entorse|diagnostico/i);
    expect(result.parsed.treatment).toMatch(/tratamento|anti-inflamatorio/i);
  });

  it('deve normalizar alias de speaker Vet no fallback do segmento', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Vet',
        text: 'Solicito hemograma e ultrassom abdominal.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.context.medicoContent).toMatch(/hemograma|ultrassom/i);
    expect(result.parsed.examDetails).toMatch(/hemograma|ultrassom/i);
  });

  it('deve normalizar siglas e unidades no parser heuristico antes do merge final', () => {
    const segments = [
      {
        stamp: '00:01',
        speaker: 'Medico',
        text: 'No exame: frequencia cardiaca 120 e frequencia respiratoria 36, trc 2 segundos.',
      },
      {
        stamp: '00:10',
        speaker: 'Medico',
        text: 'Prescrevo dipirona 25 mg kg duas vezes ao dia.',
      },
    ];

    const result = parseClinicalFieldsFromSegments(segments, '');

    expect(result.parsed.physicalExam).toMatch(/FC|FR|TPC/i);
    expect(result.parsed.medications).toMatch(/mg\/kg/i);
    expect(result.parsed.medications).toMatch(/\bBID\b/i);
  });
});

describe('fieldAssistFunctions.analyzeFieldConversation', () => {
  function buildStereoWavTestBuffer({
    sampleRate = 44100,
    durationSec = 1.2,
    silenceHeadSec = 0.2,
    silenceTailSec = 0.2,
    freq = 440,
  } = {}) {
    const channels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;
    const totalFrames = Math.floor(sampleRate * durationSec);
    const dataSize = totalFrames * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8, 'ascii');
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * blockAlign, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(dataSize, 40);

    const headFrames = Math.floor(sampleRate * silenceHeadSec);
    const tailFrames = Math.floor(sampleRate * silenceTailSec);
    const activeStart = headFrames;
    const activeEnd = Math.max(activeStart, totalFrames - tailFrames);

    for (let i = 0; i < totalFrames; i += 1) {
      let sampleVal = 0;
      if (i >= activeStart && i < activeEnd) {
        sampleVal = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.12;
      }
      const intVal = Math.round(sampleVal * 32767);
      const frameOffset = 44 + i * blockAlign;
      buffer.writeInt16LE(intVal, frameOffset);
      buffer.writeInt16LE(intVal, frameOffset + 2);
    }

    return buffer;
  }

  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (typeof originalApiKey === 'undefined') {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    jest.restoreAllMocks();
  });

  it('deve transcrever audio e preencher campos estruturados com IA', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata tosse desde ontem e vomito em duas ocasioes.',
          duration: 9.4,
          segments: [
            { start: 0, text: 'Tutor relata tosse desde ontem.' },
            { start: 4, text: 'Vet orienta hidratacao e retorno em 48 horas.' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Tutor relata tosse desde ontem e vomito em duas ocasioes.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Tosse e vomito',
                    historico_do_problema: 'Sinais iniciaram ontem',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Gastroenterite em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Hidratacao oral e repouso',
                    medicacoes_prescritas: 'Antiemetico conforme prescricao',
                    retorno: 'Reavaliar em 48 horas',
                    exames_solicitados: 'Nao informado na consulta',
                  },
                  autoavaliacao: {
                    queixa_principal_evidencia:
                      'Tutor relata tosse desde ontem e vomito',
                    historico_do_problema_evidencia: 'Sinais iniciaram ontem',
                    achados_relevantes_evidencia: 'Nao informado na consulta',
                    diagnostico_presuntivo_evidencia: 'vomito em duas ocasioes',
                    orientacoes_ao_tutor_evidencia:
                      'Vet orienta hidratacao e retorno em 48 horas',
                    medicacoes_prescritas_evidencia:
                      'Antiemetico conforme prescricao',
                    exames_solicitados_evidencia: 'Nao informado na consulta',
                    retorno_evidencia: 'retorno em 48 horas',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/audio/transcriptions');
    expect(fetchMock.mock.calls[1][0]).toContain('/chat/completions');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer test-openai-key',
    );
    expect(result.transcript).toMatch(/tosse desde ontem/i);
    expect(result.parsed.chiefComplaint).toMatch(/tosse|vomito/i);
    expect(result.parsed.diagnosis).toMatch(
      /^$|gastroenterite|enteropatia aguda em avaliacao/i,
    );
    expect(result.parsed.treatment).toMatch(/hidric|hidrat|monitor|repouso/i);
    expect(Array.isArray(result.segments)).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.quality).toBeDefined();
    expect(result.quality.fieldConfidence).toBeDefined();
    expect(result.quality.aiPrompt).toBeDefined();
    expect(result.quality.aiPrompt.version).toMatch(
      /^field_assist_extraction_v/i,
    );
    expect(result.quality.aiPrompt.contextMode).toBe('campo');
    expect(result.quality.aiPrompt.fewShotCount).toBeGreaterThan(0);
    expect(Array.isArray(result.quality.aiPrompt.fewShotExampleIds)).toBe(true);
    expect(result.quality.aiSelfCheck).toBeDefined();
    expect(result.quality.aiSelfCheck.evaluatedFields).toBeGreaterThan(0);
    expect(result.quality.pipeline).toBeDefined();
    expect(result.quality.pipeline.requestId).toMatch(/^fa-/i);
    expect(result.quality.pipeline.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.quality.pipeline.stages).toHaveProperty('ai_analysis');
    expect(result.quality.pipeline.stages).toHaveProperty('quality_gate');
  });

  it('deve aplicar prompt por contexto clinico de retorno', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[TUTOR]: Retorno para reavaliacao de melhora parcial.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Retorno para reavaliacao',
                  historico_do_problema: 'Melhora parcial apos tratamento',
                },
                exame_fisico: {
                  achados_relevantes: 'Nao informado na consulta',
                },
                avaliacao: {
                  diagnostico_presuntivo: 'Evolucao em avaliacao',
                },
                plano: {
                  orientacoes_ao_tutor: 'Manter monitoramento',
                  medicacoes_prescritas: '',
                  retorno: 'Reavaliar em 48 horas',
                  exames_solicitados: '',
                },
              }),
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [],
      transcript: 'Consulta de retorno com melhora parcial.',
      promptContextMode: 'retorno',
    });

    expect(result.quality.aiPrompt.contextMode).toBe('retorno');
    expect(result.quality.aiPrompt.fewShotCount).toBeGreaterThan(0);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.messages[0].content).toMatch(
      /CONTEXTO CLINICO: RETORNO/i,
    );
    expect(requestBody.messages[0].content).toMatch(/EXEMPLOS CURADOS/i);
  });

  it('deve aplicar self-check da IA e bloquear campo sem evidencia suficiente', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[TUTOR]: Animal ativo, sem sinais de dor ou febre.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Animal ativo',
                  historico_do_problema: 'Sem alteracoes segundo o tutor',
                },
                exame_fisico: {
                  achados_relevantes: 'Nao informado na consulta',
                },
                avaliacao: {
                  diagnostico_presuntivo:
                    'Septicemia bacteriana grave com foco pulmonar',
                },
                plano: {
                  orientacoes_ao_tutor: 'Manter observacao e retorno',
                  medicacoes_prescritas: '',
                  retorno: '48 horas',
                  exames_solicitados: '',
                },
                autoavaliacao: {
                  diagnostico_presuntivo_evidencia: 'Nao informado na consulta',
                },
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [],
      transcript: 'Tutor refere animal ativo e sem febre.',
      promptContextMode: 'nova',
    });

    expect(result.parsed.diagnosis).toBe('');
    expect(
      result.quality.aiSelfCheck.byField.diagnostico_presuntivo,
    ).toBeDefined();
    expect(
      result.quality.aiSelfCheck.byField.diagnostico_presuntivo.accepted,
    ).toBe(false);
  });

  it('deve usar transcript fallback quando Whisper retornar texto com baixo sinal clinico', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'ruido teste',
          duration: 2.1,
          segments: [{ start: 0, text: 'ruido teste' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Animal com febre alta e apatia desde ontem.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Febre e apatia',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Doenca infecciosa em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar temperatura',
                    medicacoes_prescritas: 'Conforme prescricao',
                    retorno: 'Reavaliar em 24 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const fallbackTranscript =
      'Tutor relata febre alta e apatia desde ontem. No exame fisico temperatura 39.8. Diagnostico presuntivo infeccioso.';

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: fallbackTranscript,
    });

    expect(result.transcript).toMatch(/febre alta/i);
    expect(result.transcript).not.toMatch(/^ruido teste$/i);
    expect(result.parsed.chiefComplaint).toMatch(/febre|apatia/i);
  });

  it('deve priorizar tratamento heuristico quando a sugestao da IA tiver baixa aderencia ao transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata diarreia e medico orienta hidratacao oral com dieta leve por 48 horas.',
          duration: 8.2,
          segments: [
            {
              start: 0,
              text: 'Tutor relata diarreia desde ontem e apatia.',
            },
            {
              start: 4,
              text: 'Medico orienta tratamento com hidratacao oral e dieta leve por 48 horas.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Tutor relata diarreia desde ontem.\n[VETERINÁRIO]: Medico orienta conduta.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Diarreia aguda',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Enteropatia em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor:
                      'Internacao imediata e cirurgia exploratoria de urgencia.',
                    medicacoes_prescritas: 'Nao informado na consulta',
                    retorno: 'Reavaliar em 48 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.treatment).toMatch(
      /hidratacao|dieta leve|suporte hidrico|ajuste nutricional/i,
    );
    expect(result.parsed.treatment).not.toMatch(/cirurgia exploratoria/i);
  });

  it('deve estabilizar diagnostico e exame fisico com base no contexto clinico do transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Bovino com dor abdominal, temperatura 39.8 e frequencia cardiaca elevada. Suspeita de reticuloperitonite traumatica.',
          duration: 7.6,
          segments: [
            {
              start: 0,
              text: 'Bovino com dor abdominal e motilidade reduzida.',
            },
            {
              start: 3,
              text: 'No exame fisico temperatura 39.8 e frequencia cardiaca alta.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Dor abdominal.\n[VETERINÁRIO]: Exame fisico alterado.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Dor abdominal',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Sem alteracoes clinicas relevantes.',
                  },
                  avaliacao: {
                    diagnostico_presuntivo:
                      'Quadro inespecifico sem definicao.',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar',
                    medicacoes_prescritas: 'Conforme prescricao',
                    retorno: 'Reavaliar',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.diagnosis).toMatch(/reticuloperitonite|avaliacao/i);
    expect(result.parsed.physicalExam).toMatch(
      /exame fisico|frequencia|temperatura|semiolog/i,
    );
    expect(result.parsed.porte).toBe('grande');
    expect(result.quality.porteDecision).toBeDefined();
    expect(result.quality.porteDecision.porte).toBe('grande');
  });

  it('deve aplicar gate e limpar conteudo conversacional sem evidencia clinica', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Conversa curta sem conteudo clinico estruturado.',
          duration: 4,
          segments: [{ start: 0, text: 'Bom dia doutor, tudo bem com voce?' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada: '[TUTOR]: Bom dia doutor, tudo bem?',
                  identificacao: {},
                  anamnese: { queixa_principal: 'Bom dia doutor' },
                  exame_fisico: { achados_relevantes: 'Bom dia' },
                  avaliacao: { diagnostico_presuntivo: 'Tudo bem' },
                  plano: { orientacoes_ao_tutor: 'Obrigado doutor' },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.chiefComplaint).toBe('');
    expect(result.parsed.diagnosis).toBe('');
    expect(result.parsed.treatment).toBe('');
    expect(result.quality.needsReview).toBe(true);
    expect(result.quality.conservativeMode).toBeDefined();
  });

  it('deve aplicar modo conservador e suprimir campo de baixa confianca', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[TUTOR]: Animal ativo sem alteracoes relevantes.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Animal ativo sem alteracoes',
                },
                exame_fisico: {
                  achados_relevantes: 'Nao informado na consulta',
                },
                avaliacao: {
                  diagnostico_presuntivo:
                    'Suspeita de processo infeccioso bacteriano sistemico com necessidade de abordagem escalonada imediata',
                },
                plano: {
                  orientacoes_ao_tutor:
                    'Manter observacao e reavaliar conforme orientacao',
                  medicacoes_prescritas: '',
                  retorno: '48 horas',
                  exames_solicitados: '',
                },
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [],
      transcript: 'Tutor relata apenas que o animal esta ativo e bem disposto.',
      conservativeMode: true,
      conservativeMinConfidence: 0.25,
    });

    expect(result.parsed.diagnosis).toBe('');
    expect(result.quality.lowConfidenceFields.length).toBeGreaterThan(0);
    expect(result.quality.needsReview).toBe(true);
    expect(result.quality.conservativeMode.enabled).toBe(true);
    expect(
      result.quality.conservativeMode.suppressedFields.length,
    ).toBeGreaterThan(0);
  });

  it('deve respeitar negacao e manter temporalidade na conduta', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata melhora parcial. Vet orienta monitoramento e retorno em 48 horas, sem antibioticoterapia.',
          duration: 6,
          segments: [
            {
              start: 0,
              text: 'Melhora parcial nas ultimas horas.',
            },
            {
              start: 3,
              text: 'Conduta de monitoramento e retorno em 48 horas, sem antibiotico.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Melhorou parcialmente.\n[VETERINÁRIO]: Sem antibiotico, retorno em 48 horas.',
                  identificacao: {},
                  anamnese: { queixa_principal: 'Melhora parcial' },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: { diagnostico_presuntivo: 'Evolucao parcial' },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar e retornar em 48 horas.',
                    medicacoes_prescritas: 'Sem antibiotico no momento.',
                    retorno: 'Retorno em 48 horas',
                    exames_solicitados: 'Nao informado na consulta',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.treatment).toMatch(/monitoramento e retorno/i);
    expect(result.parsed.treatment).toMatch(/48h|48horas|48 horas/i);
    expect(result.parsed.treatment).not.toMatch(/antibioticoterapia/i);
  });

  it('deve detectar contradicoes clinicas e resolver conflito no plano', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata sem febre, mas no exame temperatura 39.8. Conduta: sem antibiotico.',
          duration: 6,
          segments: [
            { start: 0, text: 'Tutor diz que estava sem febre em casa.' },
            {
              start: 3,
              text: 'No exame fisico temperatura 39.8 e dor abdominal.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Sem febre em casa.\n[VETERINÁRIO]: Temperatura 39.8 no exame.',
                  identificacao: {},
                  anamnese: { queixa_principal: 'Apatia' },
                  exame_fisico: {
                    achados_relevantes: 'Temperatura elevada e dor abdominal',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Sem febre, quadro inespecifico',
                  },
                  plano: {
                    orientacoes_ao_tutor:
                      'Antibioticoterapia e monitoramento em 48 horas; sem antibiotico se melhorar.',
                    medicacoes_prescritas: 'Antibiotico conforme prescricao',
                    retorno: 'Retorno em 48 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(Array.isArray(result.quality.contradictions)).toBe(true);
    expect(result.quality.contradictions.length).toBeGreaterThan(0);
    expect(result.parsed.treatment).not.toMatch(/antibioticoterapia/i);
    expect(result.parsed.diagnosis).toMatch(
      /avaliacao|febre|enterop|sindrome/i,
    );
  });

  it('deve usar ensemble para priorizar diagnostico com melhor ancoragem no transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Animal com otite externa, conduto hiperemico e dor ao toque.',
          duration: 5,
          segments: [
            { start: 0, text: 'Tutor refere otite e secrecao no ouvido.' },
            { start: 2, text: 'No exame conduto hiperemico e doloroso.' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: otite no ouvido.\n[VETERINÁRIO]: conduto hiperemico.',
                  identificacao: {},
                  anamnese: { queixa_principal: 'Dor de ouvido' },
                  exame_fisico: { achados_relevantes: 'Conduto alterado' },
                  avaliacao: {
                    diagnostico_presuntivo:
                      'Quadro inespecifico sem definicao.',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Limpeza e retorno',
                    medicacoes_prescritas: 'Conforme prescricao',
                    retorno: '7 dias',
                    exames_solicitados: '',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.diagnosis).toMatch(/otite|avaliacao/i);
  });

  it('deve descartar campos invalidos da IA com schema estrito', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata febre e apatia.',
          duration: 4,
          segments: [{ start: 0, text: 'Tutor relata febre e apatia.' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada: ['tipo_invalido'],
                  identificacao: {
                    nome_animal: { obj: true },
                    especie: 'Bovino',
                  },
                  anamnese: {
                    queixa_principal: 'Febre e apatia',
                    historico_do_problema: 12345,
                  },
                  exame_fisico: 'tipo_invalido',
                  avaliacao: {
                    diagnostico_presuntivo: 'Suspeita de infeccao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar e retornar',
                  },
                  campo_extra_nao_permitido: 'deve_ser_descartado',
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.chiefComplaint).toMatch(/febre|apatia/i);
    expect(result.parsed.especie).toBe('Bovino');
    expect(result.parsed.nome_animal).toBe('');
    expect(result.quality.aiSchema.strict).toBe(true);
    expect(result.quality.aiSchema.droppedFieldsCount).toBeGreaterThan(0);
  });

  it('deve normalizar siglas, negacoes e unidades clinicas no merge final', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[VETERINÁRIO]: Exame fisico afebril, trc 2 segundos, fc 90 bpm, fr 28 mpm. Prescrito dipirona 25 mg kg bid.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Apatia leve',
                },
                exame_fisico: {
                  achados_relevantes:
                    'Animal afebril, trc 2s, fc 90 bpm e fr 28 mpm',
                },
                avaliacao: {
                  diagnostico_presuntivo: 'Quadro estavel em observacao',
                },
                plano: {
                  orientacoes_ao_tutor:
                    'Medicar com dipirona 25 mg kg bid e retornar em 48 horas',
                  medicacoes_prescritas: 'dipirona 25 mg kg bid',
                  retorno: '48 horas',
                  exames_solicitados: '',
                },
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [],
      transcript:
        'Exame fisico afebril, trc 2 segundos, fc 90 bpm, fr 28 mpm. Dipirona 25 mg kg bid e retorno em 48 horas.',
    });

    expect(result.parsed.medications).toMatch(/mg\/kg/i);
    expect(result.parsed.medications).toMatch(/\bBID\b/i);
  });

  it('deve reconciliar por prioridade favorecendo evidencia estruturada sobre IA generativa', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata vomito e diarreia ha 2 dias. No exame, medico confirma desidratacao leve.',
          duration: 7,
          segments: [
            {
              start: 0,
              text: 'Tutor relata vomito e diarreia ha 2 dias.',
            },
            {
              start: 4,
              text: 'No exame fisico ha desidratacao leve.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Vomito e diarreia.\n[VETERINÁRIO]: Exame com desidratacao.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Tosse cronica e espirros',
                    historico_do_problema: 'Quadro respiratorio antigo',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Desidratacao leve',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Doenca respiratoria',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar',
                    medicacoes_prescritas: '',
                    retorno: '48 horas',
                    exames_solicitados: 'Hemograma',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('fake-audio-buffer'),
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    expect(result.parsed.chiefComplaint).toMatch(/vomito|diarreia/i);
    expect(result.parsed.chiefComplaint).not.toMatch(/tosse cronica/i);
    expect(result.quality.reconciliation).toBeDefined();
    expect(result.quality.reconciliation.chiefComplaint.source).toBe(
      'evidence',
    );
  });

  it('deve bloquear audio invalido antes da IA e seguir com fallback de transcript', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'erro simulado',
    });
    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: Buffer.from('conteudo invalido'),
      mimeType: 'text/plain',
      filename: 'audio.txt',
      segments: [],
      transcript:
        'Tutor relata vomito ha 2 dias. No exame fisico, desidratacao leve.',
    });

    const calledWhisper = fetchMock.mock.calls.some((call) =>
      String(call?.[0] || '').includes('/audio/transcriptions'),
    );
    expect(calledWhisper).toBe(false);
    expect(result.quality.audioValidation).toBeDefined();
    expect(result.quality.audioValidation.blocked).toBe(true);
    expect(result.quality.audioValidation.reasons).toContain('mime_invalido');
    expect(result.transcript).toMatch(/vomito|desidratacao/i);
  });

  it('deve aplicar cascata de transcricao quando a primeira tentativa falhar', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const fakeAudio = Buffer.alloc(2048, 0);
    fakeAudio.write('RIFF', 0, 'ascii');
    fakeAudio.write('WAVE', 8, 'ascii');

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'temporary unavailable',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata febre e apatia. Veterinario orienta retorno em 48 horas.',
          duration: 6,
          segments: [
            { start: 0, text: 'Tutor relata febre e apatia.' },
            {
              start: 3,
              text: 'Veterinario orienta retorno em 48 horas.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Febre e apatia.\n[VETERINÁRIO]: Retorno em 48 horas.',
                  identificacao: {},
                  anamnese: { queixa_principal: 'Febre e apatia' },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: {
                    diagnostico_presuntivo: 'Sindrome febril em avaliacao',
                  },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar e retornar em 48 horas',
                    medicacoes_prescritas: '',
                    retorno: '48 horas',
                    exames_solicitados: '',
                  },
                }),
              },
            },
          ],
        }),
      });

    global.fetch = fetchMock;

    const result = await analyzeFieldConversation({
      audioBuffer: fakeAudio,
      mimeType: 'audio/wav',
      filename: 'consulta.wav',
      segments: [],
      transcript: '',
    });

    const audioCalls = fetchMock.mock.calls.filter((call) =>
      String(call?.[0] || '').includes('/audio/transcriptions'),
    );
    expect(audioCalls.length).toBe(2);
    expect(result.quality.transcriptionMeta).toBeDefined();
    expect(result.quality.transcriptionMeta.selectedProvider).toBe(
      'openai_whisper_verbose_auto',
    );
    expect(Array.isArray(result.quality.transcriptionMeta.attempts)).toBe(true);
    expect(result.quality.transcriptionMeta.attempts.length).toBeGreaterThan(1);
    expect(result.parsed.chiefComplaint).toMatch(/febre|apatia/i);
  });

  it('deve marcar speaker como Indefinido em diarizacao ambigua no modo conservador', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[INDEFINIDO]: certo.\n[INDEFINIDO]: ok.\n[VETERINÁRIO]: no exame fisico temperatura 39.7.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Nao informado na consulta',
                },
                exame_fisico: {
                  achados_relevantes: 'Temperatura 39.7',
                },
                avaliacao: {
                  diagnostico_presuntivo: 'Sindrome febril em avaliacao',
                },
                plano: {
                  orientacoes_ao_tutor: 'Retorno em 48 horas',
                  medicacoes_prescritas: '',
                  retorno: '48 horas',
                  exames_solicitados: '',
                },
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [
        { stamp: '00:00', speaker: 'Tutor', text: 'certo' },
        { stamp: '00:01', speaker: 'Tutor', text: 'ok' },
        {
          stamp: '00:03',
          speaker: 'Tutor',
          text: 'No exame fisico temperatura 39.7 e mucosas rosadas.',
        },
      ],
      transcript: '',
    });

    expect(result.quality.diarization).toBeDefined();
    expect(result.quality.diarization.counts.Indefinido).toBeGreaterThan(0);
    expect(result.quality.diarization.lowConfidenceSegments).toBeGreaterThan(0);
    expect(result.quality.diarization.needsReview).toBe(true);
  });

  it('deve padronizar audio WAV (mono/16k/trim/ganho) antes da transcricao', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Tutor relata apatia e reducao de apetite.',
          duration: 0.9,
          segments: [
            { start: 0, text: 'Tutor relata apatia e reducao de apetite.' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  transcricao_organizada:
                    '[TUTOR]: Apatia e reducao de apetite.',
                  identificacao: {},
                  anamnese: {
                    queixa_principal: 'Apatia',
                    historico_do_problema: 'Reducao de apetite',
                  },
                  exame_fisico: {
                    achados_relevantes: 'Nao informado na consulta',
                  },
                  avaliacao: { diagnostico_presuntivo: 'Quadro inespecifico' },
                  plano: {
                    orientacoes_ao_tutor: 'Monitorar e retornar',
                    medicacoes_prescritas: '',
                    retorno: '48 horas',
                    exames_solicitados: '',
                  },
                }),
              },
            },
          ],
        }),
      });
    global.fetch = fetchMock;

    const rawWav = buildStereoWavTestBuffer();
    const result = await analyzeFieldConversation({
      audioBuffer: rawWav,
      mimeType: 'audio/wav',
      filename: 'padrao.wav',
      segments: [],
      transcript: '',
    });

    expect(result.quality.audioStandardization).toBeDefined();
    expect(result.quality.audioStandardization.applied).toBe(true);
    expect(result.quality.audioStandardization.stages).toEqual(
      expect.arrayContaining(['downmix_mono', 'resample']),
    );
    expect(
      result.quality.audioStandardization.metrics.details.outputSampleRate,
    ).toBe(16000);
    expect(result.quality.audioValidation.blocked).toBe(false);
  });

  it('deve extrair temperatura, FC e FR do transcript quando IA nao preencher vitais', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transcricao_organizada:
                  '[VETERINÁRIO]: Exame fisico com temperatura 39,7, FC 120 bpm e FR 36 mpm.',
                identificacao: {},
                anamnese: {
                  queixa_principal: 'Apatia',
                  historico_do_problema: 'Inicio ha 1 dia',
                },
                exame_fisico: {
                  estado_geral: 'Alerta',
                  temperatura: '',
                  frequencia_cardiaca: '',
                  frequencia_respiratoria: '',
                  mucosas: 'Rosadas',
                  hidratacao: 'Leve desidratacao',
                  achados_relevantes:
                    'Temperatura 39,7, FC 120 bpm e FR 36 mpm.',
                },
                avaliacao: {
                  diagnostico_presuntivo: 'Sindrome febril em avaliacao',
                },
                plano: {
                  exames_solicitados: '',
                  medicacoes_prescritas: '',
                  orientacoes_ao_tutor: 'Retorno em 24 horas',
                  retorno: '24 horas',
                },
              }),
            },
          },
        ],
      }),
    });

    const result = await analyzeFieldConversation({
      audioBuffer: null,
      mimeType: '',
      filename: '',
      segments: [],
      transcript:
        'Exame fisico com temperatura 39,7, FC 120 bpm e FR 36 mpm. Animal apatico.',
    });

    expect(result.parsed.temperatura).toMatch(/39\.7 C/i);
    expect(result.parsed.frequencia_cardiaca).toMatch(/120 bpm/i);
    expect(result.parsed.frequencia_respiratoria).toMatch(/36 mpm/i);
  });
});
