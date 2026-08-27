const penilaianModel = require("../models/penilaianModel");
const scoreboardModel = require("../models/scoreboardModel");

const createPenilaian = async (req, res) => {
    try {
        const juri_id = req.user.id;
        const { pertandingan_id, peserta_id, jenis, keterangan } = req.body;
        if (!pertandingan_id || !peserta_id || !jenis) {
            return res.status(400).json({ success: false, message: "Data penilaian belum lengkap." });
        }
        const id = await penilaianModel.createPenilaian({ pertandingan_id, juri_id, peserta_id, jenis, keterangan });
        return res.status(201).json({ success: true, message: "Penilaian berhasil ditambahkan.", data: { id } });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const getHistoryPenilaian = async (req, res) => {
    try {
        const data = await penilaianModel.getHistoryPenilaian(req.params.pertandingan_id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil history penilaian." });
    }
};

const undoPenilaian = async (req, res) => {
    try {
        const success = await penilaianModel.undoPenilaian(req.params.pertandingan_id, req.user.id);
        if (!success) return res.status(404).json({ success: false, message: "Belum ada penilaian dari juri ini." });
        return res.status(200).json({ success: true, message: "Penilaian terakhir berhasil dibatalkan." });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

const resetPenilaian = async (req, res) => {
    try {
        await penilaianModel.resetPenilaian(req.params.pertandingan_id);
        return res.status(200).json({ success: true, message: "Seluruh penilaian berhasil direset." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal reset penilaian." });
    }
};

const getScoreboard = async (req, res) => {
    try {
        const data = await scoreboardModel.getScoreboard(req.params.pertandingan_id);
        if (!data) return res.status(404).json({ success: false, message: "Pertandingan tidak ditemukan." });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil scoreboard." });
    }
};

const getTotalScore = async (req, res) => {
    try {
        const data = await scoreboardModel.getTotalScore(req.params.pertandingan_id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil total score." });
    }
};

const getScorePerJuri = async (req, res) => {
    try {
        const data = await scoreboardModel.getScorePerJuri(req.params.pertandingan_id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Gagal mengambil score per juri." });
    }
};

module.exports = {
    createPenilaian,
    getHistoryPenilaian,
    undoPenilaian,
    resetPenilaian,
    getScoreboard,
    getTotalScore,
    getScorePerJuri,
};
