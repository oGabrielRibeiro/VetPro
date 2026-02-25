const PDFDocument = require('pdfkit');

function normalizePrescriptionText(value = '') {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fitTextToHeight(doc, text, options = {}) {
  const source = normalizePrescriptionText(text);
  if (!source) return '';

  const width = Number(options.width || 0);
  const height = Number(options.height || 0);
  if (!width || !height) return source;

  const baseOptions = {
    width,
    align: options.align || 'left',
    lineGap: options.lineGap == null ? 1 : options.lineGap,
  };

  const fullHeight = doc.heightOfString(source, baseOptions);
  if (fullHeight <= height) return source;

  const ellipsis = ' (...)';
  let low = 0;
  let high = source.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${source.slice(0, mid).trim()}${ellipsis}`;
    const candidateHeight = doc.heightOfString(candidate, baseOptions);
    if (candidateHeight <= height) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best || source.slice(0, 180).trim();
}

function renderPrescription(doc, data) {
  const accent = '#39bdb8';
  const accentDark = '#2ea39f';
  const accentSoft = '#9fe1dc';
  const dark = '#1f4259';
  const muted = '#6b7f91';
  const lightBorder = '#d6dee5';
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 28;
  const sheetX = margin;
  const sheetY = margin;
  const sheetW = pageWidth - margin * 2;
  const sheetH = pageHeight - margin * 2;

  // Background sheet
  doc.rect(sheetX, sheetY, sheetW, sheetH).fill('#ffffff');

  // Left accent band
  const bandW = 16;
  doc.rect(sheetX, sheetY, bandW, sheetH).fill(accentDark);

  // Header geometric ribbons
  const headerH = 76;
  const headerX = sheetX + bandW;
  const headerY = sheetY;
  const headerW = sheetW - bandW;
  doc.rect(headerX, headerY, headerW, headerH).fill(accent);
  doc
    .polygon(
      [headerX + headerW * 0.52, headerY],
      [headerX + headerW * 0.7, headerY],
      [headerX + headerW * 0.58, headerY + headerH],
    )
    .fill(accentSoft);
  doc
    .polygon(
      [headerX + headerW * 0.68, headerY],
      [headerX + headerW * 0.84, headerY],
      [headerX + headerW * 0.72, headerY + headerH],
    )
    .fill('#d7f3f0');

  // Top right circle icon
  const iconR = 24;
  const iconCx = sheetX + sheetW - 46;
  const iconCy = headerY + headerH / 2;
  doc.circle(iconCx, iconCy, iconR).fill('#7bd3cd');
  doc
    .lineWidth(2)
    .strokeColor('#ffffff')
    .roundedRect(iconCx - 7, iconCy - 9, 14, 18, 4)
    .stroke();
  doc
    .moveTo(iconCx + 7, iconCy + 2)
    .lineTo(iconCx + 13, iconCy + 9)
    .stroke();

  // Main header text
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#ffffff')
    .text(
      data.vet?.name || data.clinic?.name || 'Dr. Vet',
      headerX + 14,
      headerY + 16,
      {
        width: headerW - 90,
        align: 'left',
      },
    );
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#d9fffb')
    .text('QUALIFICACAO VETERINARIA', headerX + 14, headerY + 42, {
      width: headerW - 100,
      align: 'left',
      characterSpacing: 2,
    });

  // Body start
  const bodyLeft = headerX + 14;
  const bodyRight = sheetX + sheetW - 18;
  const bodyWidth = bodyRight - bodyLeft;
  let y = headerY + headerH + 18;

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(muted)
    .text(
      `Receita No ${String(data.consultation.recipeNumber || 0).padStart(6, '0')}/${data.consultation.recipeYear || new Date().getFullYear()}`,
      bodyLeft,
      y,
      {
        width: bodyWidth,
        align: 'right',
      },
    );
  y += 12;

  const clinicLine = `${data.clinic?.name || 'Clinica Veterinaria'}  |  Tel: ${data.clinic?.phone || '-'}  |  Email: ${data.clinic?.email || '-'}`;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(muted)
    .text(clinicLine, bodyLeft, y, { width: bodyWidth, align: 'left' });
  y += 18;

  doc
    .lineWidth(0.8)
    .strokeColor(lightBorder)
    .moveTo(bodyLeft, y)
    .lineTo(bodyRight, y)
    .stroke();
  y += 14;

  // Patient info grid (sem sobreposicao: rotulo em cima, valor abaixo)
  const colGap = 14;
  const colW = (bodyWidth - colGap * 3) / 4;
  const fields = [
    { label: 'Paciente', value: data.patient.name || '-' },
    { label: 'Idade', value: data.patient.age || 'Nao informado' },
    { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
    {
      label: 'Peso',
      value: `${data.consultation.weight || 'Nao informado'} kg`,
    },
  ];
  fields.forEach((item, idx) => {
    const x = bodyLeft + idx * (colW + colGap);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(muted)
      .text(item.label, x, y, { width: colW, align: 'left' });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(dark)
      .text(String(item.value), x, y + 10, { width: colW, align: 'left' });
    doc
      .lineWidth(0.8)
      .strokeColor('#9fb1c1')
      .moveTo(x, y + 24)
      .lineTo(x + colW, y + 24)
      .stroke();
  });
  y += 34;

  // Diagnosis line
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(muted)
    .text('Diagnostico:', bodyLeft, y, { width: bodyWidth });
  doc
    .lineWidth(0.8)
    .strokeColor('#9fb1c1')
    .moveTo(bodyLeft, y + 24)
    .lineTo(bodyRight, y + 24)
    .stroke();
  const diagnosis = fitTextToHeight(doc, data.consultation?.diagnosis || '-', {
    width: bodyWidth,
    height: 14,
    align: 'left',
    lineGap: 0,
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(dark)
    .text(diagnosis, bodyLeft, y + 10, {
      width: bodyWidth,
      align: 'left',
    });
  y += 36;

  // Prescription area
  const boxX = bodyLeft;
  const boxY = y;
  const boxW = bodyWidth;
  const boxH = 186;
  doc
    .roundedRect(boxX, boxY, boxW, boxH, 9)
    .lineWidth(1)
    .strokeColor('#d9e3ec')
    .stroke();
  doc
    .fillColor(accentDark)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Prescricao', boxX + 12, boxY + 10);
  const prescriptionRaw =
    data.consultation.medications ||
    data.consultation.treatment ||
    'Conforme orientacao clinica.';
  const prescriptionText = fitTextToHeight(doc, prescriptionRaw, {
    width: boxW - 24,
    height: boxH - 44,
    align: 'left',
    lineGap: 1,
  });
  doc
    .font('Helvetica')
    .fillColor(dark)
    .fontSize(10.5)
    .text(prescriptionText, boxX + 12, boxY + 30, {
      width: boxW - 24,
      align: 'left',
      lineGap: 1,
    });

  // Footer line and signature
  const footerY = sheetY + sheetH - 52;
  doc
    .lineWidth(0.8)
    .strokeColor('#cdd8e2')
    .moveTo(bodyLeft, footerY)
    .lineTo(bodyLeft + 120, footerY)
    .stroke();
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(muted)
    .text('Signature', bodyLeft + 123, footerY - 3);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(dark)
    .text(`${data.vet.name || 'Veterinario'}`, bodyLeft, footerY + 8);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(muted)
    .text(`CRMV: ${data.vet.crmv || 'Nao informado'}`, bodyLeft, footerY + 22);

  // Bottom strip
  doc.rect(sheetX, sheetY + sheetH - 20, sheetW, 20).fill('#f3f7fa');
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(muted)
    .text(
      (data.clinic?.name || 'CLINIC NAME').toUpperCase(),
      bodyLeft,
      sheetY + sheetH - 14,
    );
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(muted)
    .text(data.clinic?.address || '-', bodyLeft + 130, sheetY + sheetH - 14, {
      width: 190,
    });
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(muted)
    .text(data.clinic?.phone || '-', bodyRight - 90, sheetY + sheetH - 14, {
      width: 90,
      align: 'right',
    });
}

function generatePrescriptionBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
      bufferPages: false,
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderPrescription(doc, data);
    doc.end();
  });
}

function sendPrescriptionDownload(res, data, buffer) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=receita_${data.patient.name}.pdf`,
  );
  res.send(buffer);
}

module.exports = {
  generatePrescriptionBuffer,
  sendPrescriptionDownload,
};
