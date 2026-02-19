const timelineService = require("../services/patientTimelineService");

async function getTimeline(req, res) {
  try {
    const { patientId } = req.params;

    const timeline = await timelineService.getPatientTimeline(
      req.user.id,
      patientId
    );

    res.json(timeline);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao carregar timeline do paciente" });
  }
}

module.exports = {
  getTimeline
};
