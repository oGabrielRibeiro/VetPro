const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

function safe(value, fallback = "-") {
  if (value == null || value === "") return fallback;
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function drawSectionTitle(doc, title, color) {
  doc
    .moveDown(0.8)
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(color)
    .text(title.toUpperCase());

  doc
    .moveTo(50, doc.y + 4)
    .lineTo(545, doc.y + 4)
    .lineWidth(0.6)
    .strokeColor("#e5e7eb")
    .stroke();

  doc.moveDown(0.6).fillColor("#111827");
}

function drawKeyValue(doc, label, value) {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(`${label}: `, { continued: true })
    .font("Helvetica")
    .fillColor("#1f2937")
    .text(safe(value));
}

function resolveClinicLogoPath(clinic = {}) {
  const candidates = [];
  if (clinic.logoUrl) {
    candidates.push(path.join(__dirname, "../../", clinic.logoUrl));
  }
  if (clinic.id) {
    candidates.push(path.join(__dirname, "../assets/clinics", `${clinic.id}.png`));
    candidates.push(path.join(__dirname, "../../uploads/clinics", `${clinic.id}.png`));
    candidates.push(path.join(__dirname, "../assets/logos", `${clinic.id}.png`));
  }
  candidates.push(path.join(__dirname, "../assets/logo.png"));
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function drawReturnRegistryPage(doc, consultation) {
  const patient = consultation.patient || {};
  const previous = consultation.previousConsultation || null;
  const isReturnOfReturn =
    Boolean(previous?.previousConsultationId) ||
    previous?.consultationType === "retorno";

  doc.addPage();

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#0f172a")
    .text("REGISTRO DE RETORNO", { align: "center" });

  doc.moveDown(0.7);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
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
    .fillColor("#e2e8f0")
    .fill();

  doc
    .rect(left, tableTop, right - left, rowH)
    .lineWidth(1)
    .strokeColor("#94a3b8")
    .stroke();
  doc.moveTo(colDate, tableTop).lineTo(colDate, tableTop + rowH).stroke();
  doc.moveTo(colRecord, tableTop).lineTo(colRecord, tableTop + rowH).stroke();
  doc
    .moveTo(colPrevious, tableTop)
    .lineTo(colPrevious, tableTop + rowH)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#0f172a")
    .text("DATA", left + 8, tableTop + 7)
    .text("No PRONTUARIO", colDate + 8, tableTop + 7, {
      width: colRecord - colDate - 12,
    })
    .text("PRONT. ANTERIOR", colRecord + 8, tableTop + 7, {
      width: colPrevious - colRecord - 12,
    })
    .text("REGISTRO", colPrevious + 8, tableTop + 7, {
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
        .fillColor("#f8fafc")
        .fill();
    }

    doc
      .rect(left, rowTop, right - left, rowH)
      .lineWidth(1)
      .strokeColor("#cbd5e1")
      .stroke();
    doc.moveTo(colDate, rowTop).lineTo(colDate, rowTop + rowH).stroke();
    doc.moveTo(colRecord, rowTop).lineTo(colRecord, rowTop + rowH).stroke();
    doc.moveTo(colPrevious, rowTop).lineTo(colPrevious, rowTop + rowH).stroke();

    const isCurrentRow = String(row.numeroProntuario) === String(consultation.numeroProntuario);
    const rowLabel =
      isCurrentRow && isReturnOfReturn
        ? "Retorno do retorno"
        : isCurrentRow
          ? "Retorno atual"
          : "Retorno anterior";

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#111827")
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
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0f172a")
    .text("MOTIVO DO RETORNO E PRESCRICAO ANTERIOR", left, doc.y, {
      width: right - left,
      align: "left",
    });
  doc.moveDown(0.4);

  const previousDate = formatDate(previous?.createdAt);
  const previousNumber = safe(previous?.numeroProntuario);
  const previousOccurrence = safe(previous?.chiefComplaint, "Nao informado");
  const previousPrescription = safe(
    previous?.treatment || previous?.medications,
    "Nao informado",
  );

  const motivo = [
    `Referencia anterior: prontuario ${previousNumber} em ${previousDate}.`,
    `Ocorrido anterior: ${previousOccurrence}.`,
    `Prescrito anteriormente: ${previousPrescription}.`,
  ].join(" ");

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#1f2937")
    .text(motivo, left, doc.y, {
      width: right - left,
      align: "left",
      lineGap: 2,
    });
}

function generateConsultationPDF(consultation, res) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const accent = "#0f766e";

  const patient = consultation.patient || {};
  const clinic = consultation.clinic || {};
  const vet = consultation.user || {};

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
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
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0f172a")
    .text("PRONTUARIO VETERINARIO", 140, 45);

  // bloco de identificacao no topo direito
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#0f172a")
    .text(
      `Nº ${safe(consultation.numeroProntuario)} | ${
        consultation.consultationType || "nova"
      }`,
      360,
      45,
      { align: "right", width: 190 },
    )
    .text(`Data: ${formatDateTime(consultation.createdAt)}`, 360, 60, {
      align: "right",
      width: 190,
    })
    .text(`Receita: ${consultation.recipeNumber || "-"}`, 360, 75, {
      align: "right",
      width: 190,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#475569")
    .text(safe(clinic.name, "Clinica"), 140, 70)
    .text(safe(clinic.address, ""), 140, 84)
    .text(`Tel: ${safe(clinic.phone, "-")}  |  Email: ${safe(clinic.email, "-")}`, 140, 98);

  doc
    .moveTo(50, 125)
    .lineTo(545, 125)
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .stroke();

  doc.y = 140;

  drawSectionTitle(doc, "Paciente e tutor", accent);
  drawKeyValue(doc, "Paciente", patient.name);
  drawKeyValue(doc, "Especie", patient.specie || patient.species);
  drawKeyValue(doc, "Raca", patient.breed);
  drawKeyValue(doc, "Idade", patient.age);
  drawKeyValue(doc, "Tutor", patient.ownerName);
  drawKeyValue(doc, "Telefone", patient.ownerPhone);

  drawSectionTitle(doc, "Parametros clinicos", accent);
  drawKeyValue(doc, "Peso (kg)", consultation.weight);
  drawKeyValue(doc, "Temperatura", consultation.temperature);
  drawKeyValue(doc, "FC", consultation.heartRate);
  drawKeyValue(doc, "FR", consultation.respiratoryRate);

  if (consultation.consultationType === "retorno" && consultation.previousConsultation) {
    const prev = consultation.previousConsultation;
    drawSectionTitle(doc, "Avaliacao anterior", accent);
    drawKeyValue(doc, "Data anterior", formatDateTime(prev.createdAt));
    drawKeyValue(doc, "Prontuario anterior", prev.numeroProntuario);
    drawKeyValue(doc, "Ocorrido anterior", prev.chiefComplaint || "Nao informado");
    drawKeyValue(
      doc,
      "Prescricao/conduta anterior",
      prev.treatment || prev.medications || "Nao informado",
    );
    drawKeyValue(doc, "Diagnostico anterior", prev.diagnosis || "Nao informado");
  }

  drawSectionTitle(doc, "Avaliacao atual", accent);
  drawKeyValue(doc, "Queixa principal", consultation.chiefComplaint);
  drawKeyValue(doc, "Anamnese", consultation.anamnesis);
  drawKeyValue(doc, "Exame fisico", consultation.physicalExam);
  drawKeyValue(doc, "Diagnostico", consultation.diagnosis);
  drawKeyValue(doc, "Conduta / tratamento", consultation.treatment);
  drawKeyValue(doc, "Procedimentos", consultation.procedures);
  drawKeyValue(doc, "Medicacoes", consultation.medications);
  drawKeyValue(doc, "Observacoes", consultation.notes);
  drawKeyValue(doc, "Recomendacao de retorno", consultation.returnRecommendation);

  doc.moveDown(1.5);
  const signaturePath = path.join(__dirname, `../assets/signatures/${consultation.userId}.png`);
  try {
    doc.image(signaturePath, { width: 130 });
    doc.moveDown(0.4);
  } catch {
    // no signature file
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text("________________________________________")
    .text(safe(consultation.veterinarianName, vet.name || "Veterinario(a)"))
    .font("Helvetica")
    .text(`CRMV: ${safe(consultation.veterinarianCrmv || vet.crmv, "-")}`);

  if (consultation.consultationType === "retorno") {
    drawReturnRegistryPage(doc, consultation);
  }

  doc.end();
}

module.exports = { generateConsultationPDF };
