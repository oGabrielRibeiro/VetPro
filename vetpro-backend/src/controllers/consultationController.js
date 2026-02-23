const consultationService = require("../services/consultationService");
const pdfService = require("../services/pdfService");
const {
  generatePrescriptionBuffer,
  sendPrescriptionDownload
} = require("../services/prescriptionService");
const {
  analyzeFieldConversation,
  parseClinicalFieldsFromSegments,
  extractTranscriptFromNotes,
  normalizeTimestampedTranscript,
  readHeuristicMemory,
  writeHeuristicMemory
} = require("../services/fieldAssistService");
const {
  generateRecordDraftFromChat,
  refineRecordField
} = require("../services/recordChatAssistService");
const prisma = require("../lib/prisma");
const fs = require("fs");
const path = require("path");

function resolveConsultationError(error, fallback) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("paciente nao encontrado")) {
    return "Paciente nao encontrado.";
  }
  if (message.includes("consulta nao encontrada")) {
    return "Consulta nao encontrada.";
  }
  if (message.includes("consulta anterior nao encontrada")) {
    return "Consulta anterior nao encontrada.";
  }
  if (message.includes("consulta original nao encontrada")) {
    return "Consulta original nao encontrada.";
  }
  return fallback;
}

const CHAT_MARK_START = "[[AI_CHAT_HISTORY]]";
const CHAT_MARK_END = "[[/AI_CHAT_HISTORY]]";

function parseChatHistoryFromNotes(notes = "") {
  const text = String(notes || "");
  const start = text.indexOf(CHAT_MARK_START);
  const end = text.indexOf(CHAT_MARK_END);
  if (start < 0 || end < 0 || end <= start) return [];

  const raw = text
    .slice(start + CHAT_MARK_START.length, end)
    .trim();
  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeChatHistoryToNotes(notes = "", history = []) {
  const base = String(notes || "");
  const serialized = `${CHAT_MARK_START}\n${JSON.stringify(history)}\n${CHAT_MARK_END}`;

  const start = base.indexOf(CHAT_MARK_START);
  const end = base.indexOf(CHAT_MARK_END);
  if (start >= 0 && end > start) {
    const before = base.slice(0, start).trimEnd();
    const after = base.slice(end + CHAT_MARK_END.length).trimStart();
    return [before, serialized, after].filter(Boolean).join("\n\n").trim();
  }

  return [base.trim(), serialized].filter(Boolean).join("\n\n").trim();
}

async function list(req, res) {
  try {
    const consultations = await consultationService.getConsultations(req.user.id);
    return res.json(consultations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar consultas" });
  }
}

async function generatePrescriptionPDF(req, res) {
  try {
    const { id } = req.params;
    const shouldDownload =
      req.method === "GET" ||
      req.query.download === "true" ||
      req.body?.download === true;

    const consultation = await prisma.consultation.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        patient: true,
        clinic: true,
        user: true
      }
    });

    if (!consultation) {
      return res.status(404).json({ error: "Consulta nao encontrada." });
    }

    const hasMedication =
      consultation.medications &&
      !/n[aã]o prescrita/i.test(String(consultation.medications));

    if (consultation.consultationType === "retorno" && !hasMedication) {
      return res.status(400).json({
        error: "Este retorno nao possui nova medicacao para receita."
      });
    }

    const payload = {
      consultation,
      patient: consultation.patient,
      clinic: consultation.clinic,
      vet: consultation.user
    };

    const buffer = await generatePrescriptionBuffer(payload);

    const prescriptionsDir = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      "consultations",
      "prescriptions"
    );
    fs.mkdirSync(prescriptionsDir, { recursive: true });

    const filename = `prescription-${consultation.id}-${Date.now()}.pdf`;
    const fullPath = path.join(prescriptionsDir, filename);
    fs.writeFileSync(fullPath, buffer);

    let storedFile = null;
    try {
      storedFile = await prisma.consultationFile.create({
        data: {
          filename,
          originalName: `receita-${consultation.recipeNumber || consultation.id}.pdf`,
          mimeType: "application/pdf",
          size: buffer.length,
          path: fullPath,
          examType: "DOCUMENT",
          consultationId: consultation.id
        }
      });
    } catch (attachError) {
      console.error("Erro ao anexar receita no prontuario:", attachError);
    }

    if (shouldDownload) {
      return sendPrescriptionDownload(res, payload, buffer);
    }

    return res.status(201).json({
      message: "Receita anexada ao prontuario.",
      fileId: storedFile?.id || null,
      consultationId: consultation.id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar receita" });
  }
}

async function create(req, res) {
  try {
    const currentYear = new Date().getFullYear();

    const lastRecipe = await prisma.consultation.findFirst({
      where: {
        clinicId: req.user.clinicId,
        recipeYear: currentYear
      },
      orderBy: {
        recipeNumber: "desc"
      }
    });

    const nextRecipeNumber = lastRecipe ? (lastRecipe.recipeNumber || 0) + 1 : 1;
    const { patientId, ...data } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Selecione um paciente para continuar." });
    }

    const consultation = await consultationService.createConsultation({
      userId: req.user.id,
      patientId,
      data,
      recipeNumber: nextRecipeNumber,
      recipeYear: currentYear,
      clinicId: req.user.clinicId
    });

    try {
      const notesTranscript = extractTranscriptFromNotes(data?.notes || data?.observations || "");
      const sourceText = normalizeTimestampedTranscript(notesTranscript || data?.transcript || "");
      const parsed = {
        chiefComplaint: String(data?.chiefComplaint || "").trim(),
        anamnesis: String(data?.anamnesis || "").trim(),
        physicalExam: String(data?.physicalExam || data?.clinicalAssessment || "").trim(),
        diagnosis: String(data?.diagnosis || "").trim(),
        treatment: String(data?.treatment || "").trim(),
        medications: String(data?.medications || "").trim()
      };

      const populatedCount = Object.values(parsed).filter((value) => String(value || "").trim()).length;
      if (sourceText.length >= 40 && populatedCount >= 2) {
        const current = readHeuristicMemory();
        current.push({
          createdAt: new Date().toISOString(),
          sourceText,
          parsed
        });
        writeHeuristicMemory(current);
      }
    } catch (learnError) {
      console.error("Falha ao registrar memoria heuristica:", learnError.message);
    }

    return res.status(201).json(consultation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: resolveConsultationError(
        error,
        "Nao foi possivel salvar a consulta. Tente novamente.",
      )
    });
  }
}

async function listByPatient(req, res) {
  try {
    const consultations = await consultationService.getConsultationsByPatient(
      req.user.id,
      req.params.patientId
    );

    return res.json(consultations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar consultas do paciente" });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const consultation = await consultationService.getConsultationById(req.user.id, id);
    return res.json(consultation);
  } catch (error) {
    console.error(error);
    return res.status(404).json({
      error: resolveConsultationError(error, "Consulta nao encontrada.")
    });
  }
}

async function downloadPDF(req, res) {
  try {
    const { id } = req.params;
    const consultation = await consultationService.getConsultationById(req.user.id, id);

    const returnHistoryRaw = await prisma.consultation.findMany({
      where: {
        userId: req.user.id,
        patientId: consultation.patientId,
        consultationType: "retorno"
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        previousConsultation: {
          select: {
            numeroProntuario: true
          }
        }
      }
    });

    consultation.returnHistory = returnHistoryRaw.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      numeroProntuario: item.numeroProntuario,
      previousNumeroProntuario: item.previousConsultation?.numeroProntuario || null
    }));

    return pdfService.generateConsultationPDF(consultation, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar PDF" });
  }
}

async function createReturn(req, res) {
  try {
    const { id } = req.params;

    const consultation = await consultationService.createReturnFromConsultation(
      req.user.id,
      req.user.clinicId,
      id
    );

    return res.status(201).json(consultation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: resolveConsultationError(
        error,
        "Nao foi possivel criar o retorno agora. Tente novamente.",
      )
    });
  }
}

async function fieldAssist(req, res) {
  try {
    const segmentsRaw = req.body?.segments || "[]";
    const transcript = req.body?.transcript || "";

    let segments = [];
    try {
      segments = JSON.parse(segmentsRaw);
    } catch {
      segments = [];
    }

    const audioBuffer = req.file?.buffer || null;
    const mimeType = req.file?.mimetype || req.body?.mimeType || "audio/webm";

    const result = await analyzeFieldConversation({
      audioBuffer,
      mimeType,
      filename: req.file?.originalname || "field-audio.webm",
      segments,
      transcript
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao analisar conversa de campo" });
  }
}

async function heuristicParse(req, res) {
  try {
    const segmentsRaw = req.body?.segments || "[]";
    const transcript = String(req.body?.transcript || "").trim();

    let segments = [];
    try {
      segments = JSON.parse(segmentsRaw);
    } catch {
      segments = [];
    }

    const normalizedSegments = Array.isArray(segments)
      ? segments.map((segment) => ({
          stamp: segment?.stamp || "00:00",
          speaker: segment?.speaker || "Tutor",
          text: String(segment?.text || "").trim()
        }))
      : [];

    const sourceText =
      transcript || normalizedSegments.map((segment) => segment.text).join(" ").trim();
    const { parsed, context } = parseClinicalFieldsFromSegments(
      normalizedSegments,
      sourceText
    );

    return res.json({
      provider: "heuristic",
      transcript: sourceText,
      segments: normalizedSegments,
      parsed,
      context
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao aplicar heuristica clinica." });
  }
}

async function chatAssist(req, res) {
  try {
    const mode = req.body?.mode === "retorno" ? "retorno" : "nova";
    const patientId = req.body?.patientId || null;
    const text = String(req.body?.text || "").trim();
    const transcript = String(req.body?.transcript || "").trim();
    const messagesRaw = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const segmentsRaw = Array.isArray(req.body?.segments) ? req.body.segments : [];

    const messagesFromSegments = segmentsRaw
      .map((segment) => {
        const speaker = String(segment?.speaker || "").trim().toLowerCase();
        const content = String(segment?.text || "").trim();
        if (!content) return null;
        return {
          role: speaker === "medico" || speaker === "médico" || speaker === "vet" || speaker === "veterinario"
            ? "assistant"
            : "user",
          content
        };
      })
      .filter(Boolean);

    const messages = messagesRaw.length
      ? messagesRaw
      : messagesFromSegments.length
        ? messagesFromSegments
      : text
        ? [{ role: "user", content: text }]
      : transcript
        ? [{ role: "user", content: transcript }]
        : [];
    const recordProfileRaw = req.body?.recordProfile;
    const recordProfile =
      recordProfileRaw && typeof recordProfileRaw === "object"
        ? {
            porte: String(recordProfileRaw.porte || "").trim().toLowerCase(),
            specificFieldKeys: Array.isArray(recordProfileRaw.specificFieldKeys)
              ? recordProfileRaw.specificFieldKeys
              : []
          }
        : null;

    let patient = null;
    if (patientId) {
      const patientRow = await prisma.patient.findFirst({
        where: { id: patientId, userId: req.user.id },
        select: {
          id: true,
          name: true,
          specie: true,
          subcategory: true,
          breed: true,
          ownerName: true,
          porte: true
        }
      });
      if (patientRow) {
        patient = {
          ...patientRow,
          species: patientRow.specie
        };
      }
    }

    const result = await generateRecordDraftFromChat({
      messages,
      mode,
      patient,
      recordProfile
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar rascunho por chat." });
  }
}

async function refineField(req, res) {
  try {
    const field = String(req.body?.field || "").trim();
    const text = String(req.body?.text || "").trim();
    const mode = req.body?.mode === "retorno" ? "retorno" : "nova";
    const patientId = req.body?.patientId || null;

    if (!field || !text) {
      return res.status(400).json({ error: "Campo e texto sao obrigatorios." });
    }

    let patient = null;
    if (patientId) {
      const patientRow = await prisma.patient.findFirst({
        where: { id: patientId, userId: req.user.id },
        select: {
          id: true,
          name: true,
          specie: true,
          subcategory: true,
          breed: true,
          ownerName: true,
          porte: true
        }
      });
      if (patientRow) {
        patient = {
          ...patientRow,
          species: patientRow.specie
        };
      }
    }

    const result = await refineRecordField({
      field,
      text,
      mode,
      patient
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao refinar texto com IA." });
  }
}

async function getChatHistory(req, res) {
  try {
    const { id } = req.params;
    const consultation = await prisma.consultation.findFirst({
      where: { id, userId: req.user.id },
      select: { notes: true }
    });

    if (!consultation) {
      return res.status(404).json({ error: "Consulta nao encontrada." });
    }

    const history = parseChatHistoryFromNotes(consultation.notes);
    return res.json({ consultationId: id, history });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar historico de chat." });
  }
}

async function appendChatHistory(req, res) {
  try {
    const { id } = req.params;
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!incoming.length) {
      return res.status(400).json({ error: "Nenhuma mensagem informada." });
    }

    const consultation = await prisma.consultation.findFirst({
      where: { id, userId: req.user.id },
      select: { id: true, notes: true }
    });

    if (!consultation) {
      return res.status(404).json({ error: "Consulta nao encontrada." });
    }

    const currentHistory = parseChatHistoryFromNotes(consultation.notes);
    const normalizedIncoming = incoming
      .map((item) => ({
        role: item?.role === "assistant" ? "assistant" : "user",
        content: String(item?.content || "").trim(),
        createdAt: item?.createdAt || new Date().toISOString()
      }))
      .filter((item) => item.content);

    const merged = [...currentHistory, ...normalizedIncoming].slice(-100);
    const nextNotes = writeChatHistoryToNotes(consultation.notes, merged);

    await prisma.consultation.update({
      where: { id: consultation.id },
      data: { notes: nextNotes }
    });

    return res.status(201).json({ consultationId: id, history: merged });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar historico de chat." });
  }
}

module.exports = {
  create,
  list,
  listByPatient,
  getById,
  downloadPDF,
  generatePrescriptionPDF,
  createReturn,
  fieldAssist,
  heuristicParse,
  chatAssist,
  refineField,
  getChatHistory,
  appendChatHistory
};
