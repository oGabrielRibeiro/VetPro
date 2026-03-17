const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const PORTE_NOTES_MARK_START = '[[PORTE_CLINICO]]';
const PORTE_NOTES_MARK_END = '[[/PORTE_CLINICO]]';
const CHAT_NOTES_MARK_START = '[[AI_CHAT_HISTORY]]';
const CHAT_NOTES_MARK_END = '[[/AI_CHAT_HISTORY]]';

const PORTE_FIELD_LABELS = {
  vaccinationStatus: 'Vacinacao',
  vaccinationProtocol: 'Protocolo vacinal',
  lastVaccines: 'Ultimas vacinas aplicadas',
  dewormingStatus: 'Vermifugacao',
  ectoparasiteControl: 'Controle de ectoparasitas',
  diet: 'Dieta',
  rationBrand: 'Racao / marca',
  feedingFrequency: 'Frequencia alimentar',
  waterIntakeSmall: 'Ingestao de agua',
  housing: 'Ambiente',
  lifestyle: 'Estilo de vida',
  contactWithAnimals: 'Contato com outros animais',
  reproductiveStatusSmall: 'Estado reprodutivo',
  preventiveCare: 'Preventivos em uso',
  behavior: 'Comportamento',
  allergyHistory: 'Historico alergico',
  chronicDiseases: 'Doencas cronicas',
  currentSupplements: 'Suplementos em uso',
  farmName: 'Propriedade',
  productionSystem: 'Sistema de producao',
  animalFunction: 'Finalidade zootecnica',
  batch: 'Lote',
  animalId: 'Identificacao do animal',
  bodyConditionScore: 'Escore corporal',
  reproductiveStatus: 'Estado reprodutivo',
  daysInMilk: 'Dias em lactacao',
  parity: 'Numero de partos',
  herdVaccination: 'Vacinacao do rebanho',
  herdDeworming: 'Vermifugacao do rebanho',
  forage: 'Volumoso',
  concentrate: 'Concentrado',
  waterIntake: 'Consumo de agua',
  mineralSupplementation: 'Suplementacao mineral',
  hoofStatus: 'Casco e locomocao',
  rumenMotility: 'Motilidade ruminal',
  fecesAndUrine: 'Fezes e urina',
  milkProduction: 'Producao de leite',
  historicalDiseases: 'Historico sanitario',
  propertyAndManagement: 'Propriedade e manejo',
  contactAnimals: 'Contactantes',
  animalIdentificationDetails: 'Animal atendido - identificacao detalhada',
  neonateAndReproduction: 'Neonato / reproducao',
  previousTreatmentHistory: 'Tratamento anterior',
  physicalExamDetailed: 'Exame fisico detalhado',
  requestedExamPanel: 'Exames complementares solicitados',
};

function safe(value, fallback = '-') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function drawSectionTitle(doc, title, color) {
  doc
    .moveDown(0.8)
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(color)
    .text(title.toUpperCase());

  doc
    .moveTo(50, doc.y + 4)
    .lineTo(545, doc.y + 4)
    .lineWidth(0.6)
    .strokeColor('#e5e7eb')
    .stroke();

  doc.moveDown(0.6).fillColor('#111827');
}

function drawKeyValue(doc, label, value) {
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .fillColor('#1f2937')
    .text(safe(value));
}

function drawKeyValueInline(doc, label, value) {
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#111827')
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .fillColor('#374151')
    .text(safe(value), { continued: true })
    .text('  ');
}

function formatMedicationRows(rows = []) {
  return rows
    .filter((row) => row?.name || row?.dose || row?.route)
    .map((row) => {
      const parts = [
        row.name || '',
        row.dose ? `Dose: ${row.dose}` : '',
        row.route ? `Via: ${row.route}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');
}

function formatPrescriptionItems(items = []) {
  return items
    .filter((row) => row?.name || row?.dose || row?.route || row?.frequency || row?.duration)
    .map((row) => {
      const parts = [
        row.name || '',
        row.dose ? `Dose: ${row.dose}` : '',
        row.route ? `Via: ${row.route}` : '',
        row.frequency ? `Freq: ${row.frequency}` : '',
        row.duration ? `Duracao: ${row.duration}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');
}

function decodeDataUrlImage(dataUrl = '') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

function renderAnesthesiaPdf(doc, consultation, accent) {
  const anesthesia = consultation.customFormData?.anesthesia || {};

  drawSectionTitle(doc, 'Ficha anestesica', accent);
  drawKeyValue(doc, 'Nome animal', anesthesia.animalName);
  drawKeyValue(doc, 'Nome proprietario', anesthesia.ownerName);
  drawKeyValue(doc, 'Prontuario', anesthesia.recordNumber);
  drawKeyValue(doc, 'Especie', anesthesia.species);
  drawKeyValue(doc, 'Raca', anesthesia.breed);
  drawKeyValue(doc, 'Peso (kg)', anesthesia.weight);
  drawKeyValue(doc, 'Idade', anesthesia.age);
  drawKeyValue(doc, 'Sexo', anesthesia.sex);

  drawSectionTitle(doc, 'Procedimento e equipe', accent);
  drawKeyValue(doc, 'Cirurgia', anesthesia.surgeryName);
  drawKeyValue(doc, 'Diagnostico pre-op', anesthesia.preOpDiagnosis);
  drawKeyValue(doc, 'Cirurgiao', anesthesia.surgeon);
  drawKeyValue(doc, 'Anestesista', anesthesia.anesthetist);
  drawKeyValue(doc, 'Auxiliar', anesthesia.assistant);
  drawKeyValue(doc, 'ASA', anesthesia.asaClass);
  drawKeyValue(doc, 'Inicio anestesia', anesthesia.anesthesiaStart);
  drawKeyValue(doc, 'Fim anestesia', anesthesia.anesthesiaEnd);
  drawKeyValue(doc, 'Inicio cirurgia', anesthesia.surgeryStart);
  drawKeyValue(doc, 'Fim cirurgia', anesthesia.surgeryEnd);
  drawKeyValue(doc, 'Data', anesthesia.procedureDate);
  if (anesthesia.consentSignature) {
    drawKeyValue(doc, 'Consentimento tutor', 'Assinatura anexada');
    if (anesthesia.consentMeta?.capturedAt || anesthesia.consentMeta?.capturedByName) {
      drawKeyValue(
        doc,
        'Consentimento capturado em',
        formatDateTime(anesthesia.consentMeta.capturedAt),
      );
      drawKeyValue(
        doc,
        'Responsavel pela captura',
        anesthesia.consentMeta.capturedByName || anesthesia.consentMeta.capturedByUserId,
      );
    }
    const buffer = decodeDataUrlImage(anesthesia.consentSignature);
    if (buffer) {
      doc.image(buffer, { width: 140 });
      doc.moveDown(0.3);
    }
  }

  drawSectionTitle(doc, 'EPA', accent);
  drawKeyValueInline(doc, 'Hidratacao', anesthesia.hydration);
  drawKeyValueInline(doc, 'Temp', anesthesia.preOpTemperature);
  drawKeyValueInline(doc, 'FC', anesthesia.preOpHeartRate);
  drawKeyValueInline(doc, 'FR', anesthesia.preOpRespiratoryRate);
  drawKeyValueInline(doc, 'Mucosas', anesthesia.mucosaColor);
  drawKeyValueInline(doc, 'TPC', anesthesia.tpc);
  drawKeyValueInline(doc, 'TGO/AST', anesthesia.tgoAst);
  drawKeyValueInline(doc, 'TP', anesthesia.tp);
  drawKeyValueInline(doc, 'Prot totais', anesthesia.totalProteins);
  drawKeyValueInline(doc, 'Hematocrito', anesthesia.hematocrit);
  drawKeyValueInline(doc, 'Ureia', anesthesia.urea);
  drawKeyValueInline(doc, 'Creatinina', anesthesia.creatinine);
  drawKeyValueInline(doc, 'Fibrinogenio', anesthesia.fibrinogen);
  drawKeyValueInline(doc, 'FA', anesthesia.fa);
  doc.moveDown(0.4);

  drawSectionTitle(doc, 'Protocolos', accent);
  const premed = formatMedicationRows(anesthesia.premedication || []);
  const induction = formatMedicationRows(anesthesia.induction || []);
  const maintenance = formatMedicationRows(anesthesia.maintenance || []);
  const analgesia = formatMedicationRows(anesthesia.analgesia || []);
  const rescue = formatMedicationRows(anesthesia.rescue || []);
  drawKeyValue(doc, 'Premedicacao', premed);
  drawKeyValue(doc, 'Inducao', induction);
  drawKeyValue(doc, 'Manutencao', maintenance);
  drawKeyValue(doc, 'Analgesia', analgesia);
  drawKeyValue(doc, 'Resgate', rescue);

  drawSectionTitle(doc, 'Monitorizacao', accent);
  const legendText = (anesthesia.legendMarkers || [])
    .filter((item) => item?.code || item?.label)
    .map((item) => `${item.code || ''} ${item.label || ''}`.trim())
    .join(' | ');
  drawKeyValue(doc, 'Legenda', legendText);
  const gridLines = (anesthesia.vitalsGrid || [])
    .filter((row) =>
      Object.values(row || {}).some((value) => String(value || '').trim()),
    )
    .map(
      (row) =>
        `T=${row.time || '-'} | FC=${row.fc || '-'} | FR=${row.fr || '-'} | Temp=${row.temp || '-'} | SpO2=${row.spo2 || '-'} | PAM=${row.pa || '-'} | EtCO2=${row.co2 || '-'}`,
    );
  if (gridLines.length) {
    drawKeyValue(doc, 'Tabela', gridLines.join('\n'));
  }

  drawSectionTitle(doc, 'Respiracao e suporte', accent);
  drawKeyValue(doc, 'Resp espontanea', anesthesia.respSpontaneous);
  drawKeyValue(doc, 'Resp assistida', anesthesia.respAssisted);
  drawKeyValue(doc, 'Anestesia local', anesthesia.localAnesthesia);
  drawKeyValue(doc, 'Anestesia geral', anesthesia.generalAnesthesia);
  drawKeyValue(doc, 'Intubacao', anesthesia.intubation);
  drawKeyValue(doc, 'Sonda', anesthesia.tubeProbe);
  drawKeyValue(doc, 'Numero sonda', anesthesia.tubeProbeNumber);
  drawKeyValue(doc, 'Tubo / numero', anesthesia.tubeNumber);
  drawKeyValue(doc, 'Oxigenio', anesthesia.oxygen);
  drawKeyValue(doc, 'Ventilacao', anesthesia.ventilation);
  drawKeyValue(doc, 'Posicao', anesthesia.animalPosition);
  drawKeyValue(doc, 'Circuito', anesthesia.circuit);
  drawKeyValue(doc, 'Fluidoterapia', anesthesia.fluidTherapy);
  drawKeyValue(doc, 'Resultado final', anesthesia.finalOutcome);
  drawKeyValue(doc, 'Condicoes', anesthesia.conditions);

  if (anesthesia.notes) {
    drawKeyValue(doc, 'Observacoes', anesthesia.notes);
  }
}

function renderPatientSummary(doc, consultation, accent) {
  const patient = consultation.patient || {};
  drawSectionTitle(doc, 'Paciente e tutor', accent);
  drawKeyValue(doc, 'Paciente', patient.name);
  drawKeyValue(doc, 'Especie', patient.specie || patient.species);
  drawKeyValue(doc, 'Raca', patient.breed);
  drawKeyValue(doc, 'Idade', patient.age);
  drawKeyValue(doc, 'Tutor', patient.ownerName);
  drawKeyValue(doc, 'Telefone', patient.ownerPhone);
}

function renderMedicationPdf(doc, consultation, accent) {
  const medication = consultation.customFormData?.medication || {};

  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Prescricao / Medicacao', accent);
  drawKeyValue(doc, 'Diagnostico', medication.diagnosis);
  drawKeyValue(doc, 'Itens prescritos', formatPrescriptionItems(medication.items || []));
  drawKeyValue(doc, 'Observacoes', medication.notes);
}

function renderProcedurePdf(doc, consultation, accent) {
  const procedure = consultation.customFormData?.procedure || {};
  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Procedimento cirurgico', accent);
  drawKeyValue(doc, 'Procedimento', procedure.procedureName);
  drawKeyValue(doc, 'Indicacao', procedure.indication);
  drawKeyValue(doc, 'Tecnica', procedure.technique);
  drawKeyValue(doc, 'Anestesia utilizada', procedure.anesthesiaUsed);
  drawKeyValue(doc, 'Cirurgiao', procedure.surgeon);
  drawKeyValue(doc, 'Auxiliar', procedure.assistant);
  drawKeyValue(doc, 'Consentimento', procedure.consentGiven);
  drawKeyValue(doc, 'Data do consentimento', procedure.consentDate);
  if (procedure.consentSignature) {
    drawKeyValue(doc, 'Assinatura do tutor', 'Assinatura anexada');
    if (procedure.consentMeta?.capturedAt || procedure.consentMeta?.capturedByName) {
      drawKeyValue(
        doc,
        'Consentimento capturado em',
        formatDateTime(procedure.consentMeta.capturedAt),
      );
      drawKeyValue(
        doc,
        'Responsavel pela captura',
        procedure.consentMeta.capturedByName || procedure.consentMeta.capturedByUserId,
      );
    }
    const buffer = decodeDataUrlImage(procedure.consentSignature);
    if (buffer) {
      doc.image(buffer, { width: 140 });
      doc.moveDown(0.3);
    }
  }
  drawKeyValue(doc, 'Achados', procedure.findings);
  drawKeyValue(doc, 'Complicacoes', procedure.complications);
  drawKeyValue(doc, 'Plano pos-operatorio', procedure.postOpPlan);
  drawKeyValue(doc, 'Medicacoes', formatMedicationRows(procedure.medications || []));
}

function renderHospitalizationPdf(doc, consultation, accent) {
  const hospitalization = consultation.customFormData?.hospitalization || {};
  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Evolucao / Internacao', accent);
  drawKeyValue(doc, 'Admissao', hospitalization.admissionDate);
  drawKeyValue(doc, 'Alta', hospitalization.dischargeDate);
  drawKeyValue(doc, 'Diagnostico principal', hospitalization.mainDiagnosis);
  drawKeyValue(doc, 'Responsavel', hospitalization.responsible);
  drawKeyValue(doc, 'Evolucao diaria', hospitalization.dailyEvolution);
  drawKeyValue(doc, 'Sinais vitais', hospitalization.vitalsNotes);
  drawKeyValue(doc, 'Medicacoes', formatMedicationRows(hospitalization.medications || []));
  drawKeyValue(doc, 'Alimentacao', hospitalization.feeding);
  drawKeyValue(doc, 'Hidratacao', hospitalization.hydration);
  drawKeyValue(doc, 'Eliminacoes', hospitalization.elimination);
  drawKeyValue(doc, 'Observacoes', hospitalization.observations);
}

function renderVaccinationPdf(doc, consultation, accent) {
  const vaccination = consultation.customFormData?.vaccination || {};
  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Vacinacao e vermifugacao', accent);
  drawKeyValue(doc, 'Vacina', vaccination.vaccineName);
  drawKeyValue(doc, 'Fabricante', vaccination.vaccineManufacturer);
  drawKeyValue(doc, 'Lote', vaccination.vaccineLot);
  drawKeyValue(doc, 'Validade', vaccination.vaccineExpiry);
  drawKeyValue(doc, 'Dose', vaccination.vaccineDose);
  drawKeyValue(doc, 'Via', vaccination.vaccineRoute);
  drawKeyValue(doc, 'Data de aplicacao', vaccination.vaccineDate);
  drawKeyValue(doc, 'Proxima dose', vaccination.vaccineNextDate);
  drawKeyValue(doc, 'Vermifugo', vaccination.dewormerName);
  drawKeyValue(doc, 'Fabricante vermifugo', vaccination.dewormerManufacturer);
  drawKeyValue(doc, 'Lote vermifugo', vaccination.dewormerLot);
  drawKeyValue(doc, 'Data de aplicacao', vaccination.dewormerDate);
  drawKeyValue(doc, 'Proxima dose', vaccination.dewormerNextDate);
  drawKeyValue(doc, 'Observacoes', vaccination.notes);
}

function renderFollowUpPdf(doc, consultation, accent) {
  const followUp = consultation.customFormData?.followUp || {};
  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Retorno / Follow-up', accent);
  drawKeyValue(doc, 'Diagnostico anterior', followUp.previousDiagnosis);
  drawKeyValue(doc, 'Status atual', followUp.currentStatus);
  drawKeyValue(doc, 'Resposta ao tratamento', followUp.responseToTreatment);
  drawKeyValue(doc, 'Ajustes', followUp.adjustments);
  drawKeyValue(doc, 'Proximo retorno', followUp.nextVisitDate);
  drawKeyValue(doc, 'Observacoes', followUp.notes);
}

function renderReportPdf(doc, consultation, accent) {
  const report = consultation.customFormData?.report || {};
  renderPatientSummary(doc, consultation, accent);
  drawSectionTitle(doc, 'Laudo / Atestado', accent);
  drawKeyValue(doc, 'Titulo', report.title);
  drawKeyValue(doc, 'Data', report.reportDate);
  drawKeyValue(doc, 'Resumo', report.summary);
  drawKeyValue(doc, 'Achados', report.findings);
  drawKeyValue(doc, 'Conclusao', report.conclusion);
  drawKeyValue(doc, 'Recomendacoes', report.recommendations);
}

function resolveClinicalParameters(consultation = {}) {
  const patient = consultation?.patient || {};
  const previous = consultation?.previousConsultation || {};
  const latest = consultation?.latestVitals || {};

  const pick = (...values) => {
    for (const value of values) {
      if (value == null) continue;
      const text = String(value).trim();
      if (!text) continue;
      return value;
    }
    return null;
  };

  return {
    weight: pick(
      consultation.weight,
      previous.weight,
      latest.weight,
      patient.weight,
    ),
    temperature: pick(
      consultation.temperature,
      previous.temperature,
      latest.temperature,
    ),
    heartRate: pick(
      consultation.heartRate,
      previous.heartRate,
      latest.heartRate,
    ),
    respiratoryRate: pick(
      consultation.respiratoryRate,
      previous.respiratoryRate,
      latest.respiratoryRate,
    ),
  };
}

function parsePorteDataFromNotes(notes = '') {
  const text = String(notes || '');
  const start = text.indexOf(PORTE_NOTES_MARK_START);
  const end = text.indexOf(PORTE_NOTES_MARK_END);
  if (start < 0 || end <= start) return null;

  const raw = text.slice(start + PORTE_NOTES_MARK_START.length, end).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const fields =
      parsed?.fields && typeof parsed.fields === 'object'
        ? parsed.fields
        : null;
    if (!fields) return null;
    return {
      porte: parsed?.porte === 'grande' ? 'grande' : 'pequeno',
      fields,
    };
  } catch {
    return null;
  }
}

function removeMarkedBlock(text = '', startMarker = '', endMarker = '') {
  let content = String(text || '');
  while (true) {
    const start = content.indexOf(startMarker);
    const end = content.indexOf(endMarker);
    if (start < 0 || end <= start) break;
    const before = content.slice(0, start).trimEnd();
    const after = content.slice(end + endMarker.length).trimStart();
    content = [before, after].filter(Boolean).join('\n\n').trim();
  }
  return content;
}

function sanitizeNotesForPdf(notes = '') {
  const noPorte = removeMarkedBlock(
    notes,
    PORTE_NOTES_MARK_START,
    PORTE_NOTES_MARK_END,
  );
  const noChat = removeMarkedBlock(
    noPorte,
    CHAT_NOTES_MARK_START,
    CHAT_NOTES_MARK_END,
  );
  return String(noChat || '').trim();
}

function resolveClinicLogoPath(clinic = {}) {
  const candidates = [];
  if (clinic.logoUrl) {
    candidates.push(path.join(__dirname, '../../', clinic.logoUrl));
  }
  if (clinic.id) {
    candidates.push(
      path.join(__dirname, '../assets/clinics', `${clinic.id}.png`),
    );
    candidates.push(
      path.join(__dirname, '../../uploads/clinics', `${clinic.id}.png`),
    );
    candidates.push(
      path.join(__dirname, '../assets/logos', `${clinic.id}.png`),
    );
  }
  candidates.push(path.join(__dirname, '../assets/logo.png'));
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function drawReturnRegistryPage(doc, consultation) {
  const patient = consultation.patient || {};
  const previous = consultation.previousConsultation || null;
  const isReturnOfReturn =
    Boolean(previous?.previousConsultationId) ||
    previous?.consultationType === 'retorno';

  doc.addPage();

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#0f172a')
    .text('REGISTRO DE RETORNO', { align: 'center' });

  doc.moveDown(0.7);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#334155')
    .text(
      `Paciente: ${safe(patient.name)}   |   Prontuario atual: ${safe(consultation.numeroProntuario)}`,
    )
    .text(`Data do retorno: ${formatDate(consultation.createdAt)}`);

  doc.moveDown(0.6);

  const tableTop = doc.y + 4;
  const left = 50;
  const right = 545;
  const colDate = 128;
  const colRecord = 228;
  const colPrevious = 375;
  const rowH = 24;

  doc
    .rect(left, tableTop, right - left, rowH)
    .fillColor('#e2e8f0')
    .fill();

  doc
    .rect(left, tableTop, right - left, rowH)
    .lineWidth(1)
    .strokeColor('#94a3b8')
    .stroke();
  doc
    .moveTo(colDate, tableTop)
    .lineTo(colDate, tableTop + rowH)
    .stroke();
  doc
    .moveTo(colRecord, tableTop)
    .lineTo(colRecord, tableTop + rowH)
    .stroke();
  doc
    .moveTo(colPrevious, tableTop)
    .lineTo(colPrevious, tableTop + rowH)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0f172a')
    .text('DATA', left + 8, tableTop + 7)
    .text('No PRONTUARIO', colDate + 8, tableTop + 7, {
      width: colRecord - colDate - 12,
    })
    .text('PRONT. ANTERIOR', colRecord + 8, tableTop + 7, {
      width: colPrevious - colRecord - 12,
    })
    .text('REGISTRO', colPrevious + 8, tableTop + 7, {
      width: right - colPrevious - 12,
    });

  const rows = consultation.returnHistory?.length
    ? consultation.returnHistory
    : [
        {
          createdAt: consultation.createdAt,
          numeroProntuario: consultation.numeroProntuario,
          previousNumeroProntuario: previous?.numeroProntuario || null,
        },
      ];

  let rowTop = tableTop + rowH;
  rows.forEach((row, idx) => {
    if (idx >= 8) return;

    if (idx % 2 === 0) {
      doc
        .rect(left, rowTop, right - left, rowH)
        .fillColor('#f8fafc')
        .fill();
    }

    doc
      .rect(left, rowTop, right - left, rowH)
      .lineWidth(1)
      .strokeColor('#cbd5e1')
      .stroke();
    doc
      .moveTo(colDate, rowTop)
      .lineTo(colDate, rowTop + rowH)
      .stroke();
    doc
      .moveTo(colRecord, rowTop)
      .lineTo(colRecord, rowTop + rowH)
      .stroke();
    doc
      .moveTo(colPrevious, rowTop)
      .lineTo(colPrevious, rowTop + rowH)
      .stroke();

    const isCurrentRow =
      String(row.numeroProntuario) === String(consultation.numeroProntuario);
    const rowLabel =
      isCurrentRow && isReturnOfReturn
        ? 'Retorno do retorno'
        : isCurrentRow
          ? 'Retorno atual'
          : 'Retorno anterior';

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#111827')
      .text(formatDate(row.createdAt), left + 8, rowTop + 7, {
        width: colDate - left - 12,
      })
      .text(safe(row.numeroProntuario), colDate + 8, rowTop + 7, {
        width: colRecord - colDate - 12,
      })
      .text(safe(row.previousNumeroProntuario), colRecord + 8, rowTop + 7, {
        width: colPrevious - colRecord - 12,
      })
      .text(rowLabel, colPrevious + 8, rowTop + 7, {
        width: right - colPrevious - 12,
      });

    rowTop += rowH;
  });

  doc.y = rowTop + 14;
  doc.x = left;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text('MOTIVO DO RETORNO E PRESCRICAO ANTERIOR', left, doc.y, {
      width: right - left,
      align: 'left',
    });
  doc.moveDown(0.4);

  const previousDate = formatDate(previous?.createdAt);
  const previousNumber = safe(previous?.numeroProntuario);
  const previousOccurrence = safe(previous?.chiefComplaint, 'Nao informado');
  const previousPrescription = safe(
    previous?.treatment || previous?.medications,
    'Nao informado',
  );

  const motivo = [
    `Referencia anterior: prontuario ${previousNumber} em ${previousDate}.`,
    `Ocorrido anterior: ${previousOccurrence}.`,
    `Prescrito anteriormente: ${previousPrescription}.`,
  ].join(' ');

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#1f2937')
    .text(motivo, left, doc.y, {
      width: right - left,
      align: 'left',
      lineGap: 2,
    });
}

function generateConsultationPDF(consultation, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  const accent = '#0f766e';

  const patient = consultation.patient || {};
  const clinic = consultation.clinic || {};
  const vet = consultation.user || {};
  const sanitizedNotes = sanitizeNotesForPdf(consultation.notes);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=prontuario-${consultation.numeroProntuario}.pdf`,
  );

  doc.pipe(res);

  const logoPath = resolveClinicLogoPath(clinic);
  if (logoPath) {
    try {
      doc.image(logoPath, 50, 38, { width: 72 });
    } catch {
      // no logo file, keep rendering
    }
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#0f172a')
    .text('PRONTUARIO VETERINARIO', 140, 45);

  // bloco de identificacao no topo direito
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#0f172a')
    .text(
      `Nº ${safe(consultation.numeroProntuario)} | ${
        consultation.consultationType || 'nova'
      }`,
      360,
      45,
      { align: 'right', width: 190 },
    )
    .text(`Data: ${formatDateTime(consultation.createdAt)}`, 360, 60, {
      align: 'right',
      width: 190,
    })
    .text(`Receita: ${consultation.recipeNumber || '-'}`, 360, 75, {
      align: 'right',
      width: 190,
    });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text(safe(clinic.name, 'Clinica'), 140, 70)
    .text(safe(clinic.address, ''), 140, 84)
    .text(
      `Tel: ${safe(clinic.phone, '-')}  |  Email: ${safe(clinic.email, '-')}`,
      140,
      98,
    );

  doc
    .moveTo(50, 125)
    .lineTo(545, 125)
    .lineWidth(1)
    .strokeColor('#cbd5e1')
    .stroke();

  doc.y = 140;

  if (consultation.consultationType === 'anestesia' && consultation.customFormData) {
    renderAnesthesiaPdf(doc, consultation, accent);
    doc.moveDown(1.2);
    const signaturePath = path.join(
      __dirname,
      `../assets/signatures/${consultation.userId}.png`,
    );
    try {
      doc.image(signaturePath, { width: 130 });
      doc.moveDown(0.4);
    } catch {
      // no signature file
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111827')
      .text('________________________________________')
      .text(safe(consultation.veterinarianName, vet.name || 'Veterinario(a)'))
      .font('Helvetica')
      .text(`CRMV: ${safe(consultation.veterinarianCrmv || vet.crmv, '-')}`);
    doc.end();
    return;
  }

  if (consultation.customFormData) {
    const type = consultation.consultationType;
    if (type === 'medicacao') {
      renderMedicationPdf(doc, consultation, accent);
    } else if (type === 'procedimento') {
      renderProcedurePdf(doc, consultation, accent);
    } else if (type === 'internacao') {
      renderHospitalizationPdf(doc, consultation, accent);
    } else if (type === 'vacinacao') {
      renderVaccinationPdf(doc, consultation, accent);
    } else if (type === 'retorno') {
      renderFollowUpPdf(doc, consultation, accent);
    } else if (type === 'laudo') {
      renderReportPdf(doc, consultation, accent);
    }

    if (
      type === 'medicacao' ||
      type === 'procedimento' ||
      type === 'internacao' ||
      type === 'vacinacao' ||
      type === 'retorno' ||
      type === 'laudo'
    ) {
      doc.moveDown(1.2);
      const signaturePath = path.join(
        __dirname,
        `../assets/signatures/${consultation.userId}.png`,
      );
      try {
        doc.image(signaturePath, { width: 130 });
        doc.moveDown(0.4);
      } catch {
        // no signature file
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#111827')
        .text('________________________________________')
        .text(safe(consultation.veterinarianName, vet.name || 'Veterinario(a)'))
        .font('Helvetica')
        .text(`CRMV: ${safe(consultation.veterinarianCrmv || vet.crmv, '-')}`);
      doc.end();
      return;
    }
  }

  drawSectionTitle(doc, 'Paciente e tutor', accent);
  drawKeyValue(doc, 'Paciente', patient.name);
  drawKeyValue(doc, 'Especie', patient.specie || patient.species);
  drawKeyValue(doc, 'Raca', patient.breed);
  drawKeyValue(doc, 'Idade', patient.age);
  drawKeyValue(doc, 'Tutor', patient.ownerName);
  drawKeyValue(doc, 'Telefone', patient.ownerPhone);

  drawSectionTitle(doc, 'Parametros clinicos', accent);
  const clinicalParams = resolveClinicalParameters(consultation);
  drawKeyValue(doc, 'Peso (kg)', clinicalParams.weight);
  drawKeyValue(doc, 'Temperatura', clinicalParams.temperature);
  drawKeyValue(doc, 'FC', clinicalParams.heartRate);
  drawKeyValue(doc, 'FR', clinicalParams.respiratoryRate);

  if (
    consultation.consultationType === 'retorno' &&
    consultation.previousConsultation
  ) {
    const prev = consultation.previousConsultation;
    drawSectionTitle(doc, 'Avaliacao anterior', accent);
    drawKeyValue(doc, 'Data anterior', formatDateTime(prev.createdAt));
    drawKeyValue(doc, 'Prontuario anterior', prev.numeroProntuario);
    drawKeyValue(
      doc,
      'Ocorrido anterior',
      prev.chiefComplaint || 'Nao informado',
    );
    drawKeyValue(
      doc,
      'Prescricao/conduta anterior',
      prev.treatment || prev.medications || 'Nao informado',
    );
    drawKeyValue(
      doc,
      'Diagnostico anterior',
      prev.diagnosis || 'Nao informado',
    );
  }

  drawSectionTitle(doc, 'Avaliacao atual', accent);
  drawKeyValue(doc, 'Queixa principal', consultation.chiefComplaint);
  drawKeyValue(doc, 'Anamnese', consultation.anamnesis);
  drawKeyValue(doc, 'Exame fisico', consultation.physicalExam);
  drawKeyValue(doc, 'Diagnostico', consultation.diagnosis);
  drawKeyValue(doc, 'Conduta / tratamento', consultation.treatment);
  drawKeyValue(doc, 'Procedimentos', consultation.procedures);
  drawKeyValue(doc, 'Medicacoes', consultation.medications);
  drawKeyValue(doc, 'Observacoes', sanitizedNotes);
  drawKeyValue(
    doc,
    'Recomendacao de retorno',
    consultation.returnRecommendation,
  );

  if (consultation.consultationType === 'anestesia' && consultation.customFormData) {
    const anesthesia = consultation.customFormData?.anesthesia || {};
    drawSectionTitle(doc, 'Ficha anestesica (resumo)', accent);
    drawKeyValue(doc, 'Animal', anesthesia.animalName);
    drawKeyValue(doc, 'Tutor', anesthesia.ownerName);
    drawKeyValue(doc, 'Procedimento', anesthesia.surgeryName);
    drawKeyValue(doc, 'Diagnostico pre-op', anesthesia.preOpDiagnosis);
    drawKeyValue(doc, 'Anestesista', anesthesia.anesthetist);
    drawKeyValue(doc, 'Cirurgiao', anesthesia.surgeon);
    drawKeyValue(doc, 'ASA', anesthesia.asaClass);
    drawKeyValue(doc, 'Inicio anestesia', anesthesia.anesthesiaStart);
    drawKeyValue(doc, 'Fim anestesia', anesthesia.anesthesiaEnd);
    drawKeyValue(doc, 'Data', anesthesia.procedureDate);

    const legendText = (anesthesia.legendMarkers || [])
      .filter((item) => item?.code || item?.label)
      .map((item) => `${item.code || ''} ${item.label || ''}`.trim())
      .join(' | ');
    if (legendText) {
      drawKeyValue(doc, 'Legenda', legendText);
    }

    const gridLines = (anesthesia.vitalsGrid || [])
      .filter((row) =>
        Object.values(row || {}).some((value) => String(value || '').trim()),
      )
      .map(
        (row) =>
          `T=${row.time || '-'} | FC=${row.fc || '-'} | FR=${row.fr || '-'} | Temp=${row.temp || '-'} | SpO2=${row.spo2 || '-'} | PAM=${row.pa || '-'} | EtCO2=${row.co2 || '-'}`,
      );
    if (gridLines.length) {
      drawKeyValue(doc, 'Monitorizacao', gridLines.join('\n'));
    }
  }
  const porteData = parsePorteDataFromNotes(consultation.notes);
  if (porteData) {
    drawSectionTitle(
      doc,
      `Ficha complementar - ${porteData.porte === 'grande' ? 'grande porte' : 'pequeno porte'}`,
      accent,
    );
    Object.entries(porteData.fields)
      .filter(([, value]) => String(value || '').trim())
      .forEach(([key, value]) => {
        drawKeyValue(doc, PORTE_FIELD_LABELS[key] || key, value);
      });
  }

  doc.moveDown(1.5);
  const signaturePath = path.join(
    __dirname,
    `../assets/signatures/${consultation.userId}.png`,
  );
  try {
    doc.image(signaturePath, { width: 130 });
    doc.moveDown(0.4);
  } catch {
    // no signature file
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text('________________________________________')
    .text(safe(consultation.veterinarianName, vet.name || 'Veterinario(a)'))
    .font('Helvetica')
    .text(`CRMV: ${safe(consultation.veterinarianCrmv || vet.crmv, '-')}`);

  if (consultation.consultationType === 'retorno') {
    drawReturnRegistryPage(doc, consultation);
  }

  doc.end();
}

module.exports = { generateConsultationPDF };
