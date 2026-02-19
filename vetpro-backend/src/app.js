const express = require("express");
const cors = require("cors");
const patientRoutes = require("./routes/patientRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
require("dotenv").config();

const app = express();

// Middlewares globais
app.use(cors());
// aceitar uploads base64/JSON grandes (fotos, logos, assinaturas)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Rotas
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/patients", patientRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/uploads", express.static("uploads"));

// Rota base
app.get("/", (req, res) => {
  res.json({ message: "VetPro API rodando 🚀" });
});

module.exports = app;
