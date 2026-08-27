const pertandinganModel = require("../models/pertandinganModel");
const scoreboardModel = require("../models/scoreboardModel");

const getPertandingan = async (req, res) => {
    try {
        const data = await pertandinganModel.getAllPertandingan(req.query.babak);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil data pertandingan." });
    }
};

const getRiwayatPertandingan = async (req, res) => {
    try {
        const data = await pertandinganModel.getRiwayatPertandingan(req.query.babak);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil riwayat pertandingan." });
    }
};

const getPertandinganById = async (req, res) => {
    try {
        const data = await pertandinganModel.getPertandinganById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "Pertandingan tidak ditemukan." });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil detail pertandingan." });
    }
};

const createPertandingan = async (req, res) => {
    try {
        const { babak, durasi_ronde_menit, peserta1_id, peserta2_id, juri_utama, juri_cadangan } = req.body;
        if (!babak || durasi_ronde_menit == null || !peserta1_id || !peserta2_id || !Array.isArray(juri_utama) || !Array.isArray(juri_cadangan)) {
            return res.status(400).json({ success: false, message: "Babak, durasi ronde, peserta dan 3+3 juri wajib diisi." });
        }
        if (juri_utama.length !== 3) {
            return res.status(400).json({
                success: false,
                message:
                    "Harus ada tepat 3 juri utama.",
            });
        }

        if (juri_cadangan.length !== 3) {
            return res.status(400).json({
                success: false,
                message:
                    "Harus ada tepat 3 juri cadangan.",
            });
        }
        const id = await pertandinganModel.createPertandingan(
            babak, durasi_ronde_menit, peserta1_id, peserta2_id, juri_utama, juri_cadangan
        );
        const data = await pertandinganModel.getPertandinganById(id);
        return res.status(201).json({ success: true, message: "Pertandingan berhasil dibuat.", data });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const updatePertandingan = async (req, res) => {
    try {
        await pertandinganModel.updatePertandingan(req.params.id, req.body);
        const data = await pertandinganModel.getPertandinganById(req.params.id);
        return res.status(200).json({ success: true, message: "Pertandingan berhasil diperbarui.", data });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const deletePertandingan = async (req, res) => {
    try {
        const deleted = await pertandinganModel.deletePertandingan(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Pertandingan tidak ditemukan." });
        return res.status(200).json({ success: true, message: "Pertandingan berhasil dihapus." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal menghapus pertandingan." });
    }
};

const startPertandingan = async (req, res) => {
    try {
        await pertandinganModel.startPertandingan(req.params.id);
        return res.status(200).json({ success: true, message: "Ronde 1 dimulai.", data: await pertandinganModel.getPertandinganById(req.params.id) });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const pausePertandingan = async (req, res) => {
    try {
        if (req.body.sisa_detik == null) return res.status(400).json({ success: false, message: "sisa_detik wajib dikirim." });
        await pertandinganModel.pausePertandingan(req.params.id, Number(req.body.sisa_detik));
        return res.status(200).json({ success: true, message: "Timer pertandingan dipause.", data: await pertandinganModel.getPertandinganById(req.params.id) });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const resumePertandingan = async (req, res) => {
    try {
        await pertandinganModel.resumePertandingan(req.params.id);
        return res.status(200).json({ success: true, message: "Ronde dilanjutkan.", data: await pertandinganModel.getPertandinganById(req.params.id) });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const finishRonde = async (req, res) => {
    try {
        const { alasan, sisa_detik, winner_id } = req.body;
        const data = await pertandinganModel.finishRonde(req.params.id, alasan, sisa_detik, winner_id);
        const message = data.status === "selesai"
            ? "Ronde dihentikan dan pertandingan diselesaikan."
            : `Ronde ${Number(data.ronde_aktif) - 1} selesai. Ronde ${data.ronde_aktif} dimulai.`;
        return res.status(200).json({ success: true, message, data });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const finishPertandingan = async (req, res) => {
    try {
        const result = await pertandinganModel.finishPertandingan(req.params.id, req.body.alasan || "waktu_habis");
        return res.status(200).json({ success: true, message: "Pertandingan selesai.", data: result });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const replaceJudge = async (req, res) => {
    try {
        const { juri_utama_id, juri_cadangan_id } = req.body;
        if (!juri_utama_id || !juri_cadangan_id) return res.status(400).json({ success: false, message: "Juri utama dan juri cadangan wajib diisi." });
        await pertandinganModel.replaceJudge(req.params.id, juri_utama_id, juri_cadangan_id);
        return res.status(200).json({ success: true, message: "Juri utama berhasil digantikan juri cadangan.", data: await pertandinganModel.getPertandinganById(req.params.id) });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const getScoreboard = async (req, res) => {
    try {
        const data = await scoreboardModel.getScoreboard(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "Pertandingan tidak ditemukan." });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil scoreboard." });
    }
};

const updateTimer = async (req, res) => {
    try {
        if (req.body.sisa_detik == null) return res.status(400).json({ success: false, message: "sisa_detik wajib diisi." });
        await pertandinganModel.updateTimer(req.params.id, Number(req.body.sisa_detik));
        return res.status(200).json({ success: true, message: "Timer berhasil diperbarui.", data: await pertandinganModel.getPertandinganById(req.params.id) });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

module.exports = {
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
};
