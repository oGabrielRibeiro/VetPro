const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

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

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function renderPrescription(doc, data) {
  const accent = "#0f766e";
  const muted = "#475569";
  const dark = "#0f172a";

  doc
    .fontSize(10)
    .fillColor(muted)
    .text(
      `Receita No ${String(data.consultation.recipeNumber || 0).padStart(6, "0")}/${data.consultation.recipeYear || new Date().getFullYear()}`,
      { align: "right" }
    );

  const logoPath = resolveClinicLogoPath(data.clinic);
  if (logoPath) {
    doc.image(logoPath, 50, 45, { width: 70 });
  }

  // bloco clinica
  doc
    .fontSize(10)
    .fillColor(dark)
    .text(data.clinic?.name || "Clinica Veterinaria", 140, 45, { align: "left" })
    .fontSize(9)
    .fillColor(muted)
    .text(data.clinic?.address || "", 140, 60, { align: "left" })
    .text(
      `Tel: ${data.clinic?.phone || "-"}   |   Email: ${data.clinic?.email || "-"}`,
      140,
      74,
      { align: "left" },
    );

  doc.moveDown(1.1);
  doc
    .fontSize(20)
    .fillColor(accent)
    .text("RECEITA VETERINARIA", { align: "center" });
  doc.moveDown(0.4);
  doc
    .fontSize(10)
    .fillColor(muted)
    .text("Documento clinico oficial", { align: "center" });
  doc.moveDown(1.2);
  doc
    .strokeColor("#cbd5e1")
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(1.2);

  doc.fontSize(12).fillColor(dark).text(`Paciente: ${data.patient.name}`);
  doc.fillColor(muted).text(`Tutor: ${data.patient.ownerName || "Nao informado"}`);
  doc.text(`Especie: ${data.patient.specie || data.patient.species || "Nao informado"}`);
  doc.text(`Peso: ${data.consultation.weight || "Nao informado"} kg`);
  doc.moveDown(1);

  doc
    .roundedRect(50, doc.y, 495, 140, 10)
    .fillAndStroke("#f8fafc", "#e2e8f0");
  doc
    .fillColor(accent)
    .fontSize(14)
    .text("Prescricao", 65, doc.y - 130);
  doc
    .fillColor(dark)
    .fontSize(12)
    .text(
      data.consultation.medications ||
        data.consultation.treatment ||
        "Conforme orientacao clinica.",
      65,
      doc.y - 108,
      { width: 465 }
    );
  doc.moveDown(2);

  const today = new Date().toLocaleDateString("pt-BR");
  doc.fillColor(muted).text(`Data: ${today}`);
  doc.moveDown(3);

  doc.fillColor("#94a3b8").text("________________________________________");
  doc.fillColor(dark).text(`${data.vet.name || "Veterinario"}`);
  doc.fillColor(muted).text(`CRMV: ${data.vet.crmv || "Nao informado"}`);
}

function generatePrescriptionBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderPrescription(doc, data);
    doc.end();
  });
}

function sendPrescriptionDownload(res, data, buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=receita_${data.patient.name}.pdf`
  );
  res.send(buffer);
}

module.exports = {
  generatePrescriptionBuffer,
  sendPrescriptionDownload
};
