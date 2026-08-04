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
    finishPertandingan,
    getScoreboard,
    updateTimer
} = require("../controllers/pertandinganController");

const router = express.Router();

/**
 * CRUD Pertandingan
 * GET: semua role bisa lihat (termasuk pic, view only)
 * POST/UPDATE/DELETE: hanya admin
 */
router.get("/", getPertandingan);
router.get("/riwayat", getRiwayatPertandingan);
router.get("/:id", getPertandinganById);

router.post(
    "/",
    authenticate,
    authorizeRole(["admin"]),
    createPertandingan
);

router.put(
    "/:id",
    authenticate,
    authorizeRole(["admin"]),
    updatePertandingan
);

router.delete(
    "/:id",
    authenticate,
    authorizeRole(["admin"]),
    deletePertandingan
);

/**
 * Kontrol Pertandingan
 * Admin ATAU juri manapun boleh start/pause/resume/finish
 * (siapa yang klik lebih dulu, itu yang jalan — tidak dicek
 * apakah juri tsb ditunjuk untuk pertandingan ini).
 *
 * TODO: nanti route ini akan dipecah per babak
 * (penyisihan/perempat/semi/final) jika diperlukan aturan
 * berbeda tiap babak — untuk sekarang pakai satu route umum.
 */
router.post(
    "/:id/start",
    authenticate,
    authorizeRole(["admin", "juri"]),
    startPertandingan
);

router.put(
    "/:id/pause",
    authenticate,
    authorizeRole(["admin", "juri"]),
    pausePertandingan
);

router.put(
    "/:id/resume",
    authenticate,
    authorizeRole(["admin", "juri"]),
    resumePertandingan
);

router.post(
    "/:id/finish",
    authenticate,
    authorizeRole(["admin", "juri"]),
    finishPertandingan
);

/**
 * Scoreboard & Timer
 */
router.get("/:id/scoreboard", getScoreboard);

router.put(
    "/:id/timer",
    authenticate,
    authorizeRole(["admin", "juri"]),
    updateTimer
);

module.exports = router;