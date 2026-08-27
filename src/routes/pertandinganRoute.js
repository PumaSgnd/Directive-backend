const express = require("express");
const authenticate = require("../middleware/auth");
const authorizeRole = require("../middleware/authorize");
const {
    getPertandingan,
    getRiwayatPertandingan,
    getPertandinganById,
    createPertandingan,
    updatePertandingan,
    deletePertandingan,
    startPertandingan,
    pausePertandingan,
    resumePertandingan,
    finishRonde,
    finishPertandingan,
    replaceJudge,
    getScoreboard,
    updateTimer,
} = require("../controllers/pertandinganController");

const router = express.Router();

router.get("/", getPertandingan);
router.get("/riwayat", getRiwayatPertandingan);
router.get("/:id", getPertandinganById);

router.post("/", authenticate, authorizeRole(["admin"]), createPertandingan);
router.put("/:id", authenticate, authorizeRole(["admin"]), updatePertandingan);
router.delete("/:id", authenticate, authorizeRole(["admin"]), deletePertandingan);

router.post("/:id/start", authenticate, authorizeRole(["admin", "juri"]), startPertandingan);
router.put("/:id/pause", authenticate, authorizeRole(["admin", "juri"]), pausePertandingan);
router.put("/:id/resume", authenticate, authorizeRole(["admin", "juri"]), resumePertandingan);

// Mengakhiri ronde. Alasan khusus dapat mengakhiri pertandingan lebih cepat.
router.post("/:id/ronde/finish", authenticate, authorizeRole(["admin", "juri"]), finishRonde);
router.post("/:id/finish", authenticate, authorizeRole(["admin", "juri"]), finishPertandingan);

// Pergantian juri utama dengan juri cadangan.
router.post("/:id/juri/replace", authenticate, authorizeRole(["admin", "juri"]), replaceJudge);

router.get("/:id/scoreboard", getScoreboard);
router.put("/:id/timer", authenticate, authorizeRole(["admin", "juri"]), updateTimer);

module.exports = router;
