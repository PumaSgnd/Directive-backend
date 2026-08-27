const exportModel = require("../models/exportModel");
const {
    generatePertandinganPdf,
    generateBracketPdf,
    formatBabak,
    formatStatus,
    sanitizeFileName,
} = require("../utils/pdfGenerator");

const exportPertandinganPdf = async (req, res) => {
    try {
        const babak = req.query.babak || "semua";
        const status = req.query.status || "semua";

        const matches =
            await exportModel.getExportPertandingan({
                babak,
                status,
            });

        const pdf = await generatePertandinganPdf({
            matches,
            babak,
            status,
        });

        const filename = sanitizeFileName(
            `laporan-pertandingan-${formatBabak(
                babak
            )}-${formatStatus(status)}.pdf`
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );
        res.setHeader(
            "Content-Length",
            pdf.length
        );

        return res.end(pdf);
    } catch (error) {
        console.error(
            "exportPertandinganPdf error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Gagal membuat PDF pertandingan.",
            error: error.message,
        });
    }
};

const exportBracketPdf = async (req, res) => {
    try {
        const matches =
            await exportModel.getExportBracket();

        const pdf = await generateBracketPdf({
            matches,
        });

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="tournament-bracket.pdf"'
        );
        res.setHeader(
            "Content-Length",
            pdf.length
        );

        return res.end(pdf);
    } catch (error) {
        console.error(
            "exportBracketPdf error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Gagal membuat PDF bracket.",
            error: error.message,
        });
    }
};

module.exports = {
    exportPertandinganPdf,
    exportBracketPdf,
};
