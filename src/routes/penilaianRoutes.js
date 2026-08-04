const express = require("express");
const authenticate = require("../middleware/auth");
const authorizeRole = require("../middleware/authorize");

const {
    createPenilaian,
    getHistoryPenilaian,
    undoPenilaian,
    resetPenilaian,
    getScoreboard,
    getTotalScore,
    getScorePerJuri,
} = require("../controllers/penilaianController");

const router = express.Router();

router.post(
    "/",
    authenticate,
    authorizeRole(["juri"]),
    createPenilaian
);

router.get("/:pertandingan_id/history", getHistoryPenilaian);
router.get("/:pertandingan_id/scoreboard", getScoreboard);
router.get("/:pertandingan_id/total", getTotalScore);
router.get("/:pertandingan_id/juri", getScorePerJuri);

router.delete(
    "/undo/:pertandingan_id",
    authenticate,
    authorizeRole(["juri"]),
    undoPenilaian
);

router.delete(
    "/:pertandingan_id/reset",
    authenticate,
    authorizeRole(["admin"]),
    resetPenilaian
);

module.exports = router;