const express = require("express");
const router = express.Router();

const picController = require("../controllers/picController");
const authenticate = require("../middleware/auth");
const authorizeRole = require("../middleware/authorize");

router.get("/", authenticate, authorizeRole(["admin","juri","panitia"]), picController.getPIC);

router.post("/", authenticate, authorizeRole(["admin","juri"]), picController.createPIC);

router.put("/:id", authenticate, authorizeRole(["admin"]), picController.updatePIC);

router.delete("/:id", authenticate, authorizeRole(["admin"]), picController.deletePIC);

module.exports = router;