const express = require("express");
const router = express.Router();

const {
    exportPertandinganPdf,
    exportBracketPdf,
} = require("../controllers/exportController");

router.get(
    "/pertandingan",
    exportPertandinganPdf
);

router.get(
    "/bracket",
    exportBracketPdf
);

module.exports = router;
