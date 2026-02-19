const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, (req, res) => {
  res.json({ message: "Gerar relatórios" });
});

module.exports = router;
