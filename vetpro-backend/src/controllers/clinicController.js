const prisma = require("../lib/prisma");

function buildUrl(req, relative) {
  if (!relative) return null;
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  return `${req.protocol}://${req.get("host")}${relative}`;
}

async function updateLogo(req, res) {
  try {
    const clinicId = req.user.clinicId;

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        logoUrl: `/uploads/clinics/${req.file.filename}`,
      },
    });

    res.json({
      ...clinic,
      logoUrl: buildUrl(req, clinic.logoUrl),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar logo" });
  }
}

module.exports = {
  updateLogo,
};
