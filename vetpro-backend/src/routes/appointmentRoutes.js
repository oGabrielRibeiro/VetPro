const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/appointmentController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", controller.list);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
