const express = require("express");
const router = express.Router();

const juriController = require("../controllers/juriController");
const authenticate = require("../middleware/auth");
const authorizeRole = require("../middleware/authorize");

router.get("/", authenticate, authorizeRole(["admin","juri"]), juriController.getJuri);
router.post("/", authenticate, authorizeRole(["admin"]), juriController.createJuri);
router.put("/:id", authenticate, authorizeRole(["admin"]), juriController.updateJuri);
router.delete("/:id", authenticate, authorizeRole(["admin"]), juriController.deleteJuri);

module.exports = router;