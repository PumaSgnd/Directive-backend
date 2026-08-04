const pertandinganModel = require("../models/pertandinganModel");
const scoreboardModel = require("../models/scoreboardModel");

const getPertandingan = async (req, res) => {
    try {

        const { babak } = req.query;

        const data = await pertandinganModel.getAllPertandingan(
            babak
        );

        res.status(200).json({
            success: true,
            data,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil data pertandingan.",
        });

    }
};

/**
 * Riwayat Pertandingan (yang sudah selesai)
 * NOTE: butuh pertandinganModel.getRiwayatPertandingan()
 * di model — lihat catatan di bawah kode ini.
 */
const getRiwayatPertandingan = async (req, res) => {
    try {

        const { babak } = req.query;

        const data = await pertandinganModel.getRiwayatPertandingan(
            babak
        );

        res.status(200).json({
            success: true,
            data,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil riwayat pertandingan.",
        });

    }
};

const getPertandinganById = async (req, res) => {

    try {

        const { id } = req.params;

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        res.status(200).json({
            success: true,
            data: pertandingan,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil detail pertandingan.",
        });

    }

};

const createPertandingan = async (req, res) => {

    try {

        const {
            babak,
            durasi_menit,
            peserta1_id,
            peserta2_id,
        } = req.body;

        if (
            !babak ||
            !durasi_menit ||
            !peserta1_id ||
            !peserta2_id
        ) {

            return res.status(400).json({
                success: false,
                message: "Data pertandingan belum lengkap.",
            });

        }

        if (peserta1_id === peserta2_id) {

            return res.status(400).json({
                success: false,
                message: "Peserta tidak boleh sama.",
            });

        }

        const id =
            await pertandinganModel.createPertandingan(
                babak,
                durasi_menit,
                peserta1_id,
                peserta2_id
            );

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        res.status(201).json({
            success: true,
            message: "Pertandingan berhasil dibuat.",
            data: pertandingan,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal membuat pertandingan.",
        });

    }

};

const updatePertandingan = async (req, res) => {

    try {

        const { id } = req.params;

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        await pertandinganModel.updatePertandingan(
            id,
            req.body
        );

        const updated =
            await pertandinganModel.getPertandinganById(id);

        res.status(200).json({
            success: true,
            message: "Pertandingan berhasil diperbarui.",
            data: updated,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal memperbarui pertandingan.",
        });

    }

};

const deletePertandingan = async (req, res) => {

    try {

        const { id } = req.params;

        const deleted =
            await pertandinganModel.deletePertandingan(id);

        if (!deleted) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        res.status(200).json({
            success: true,
            message: "Pertandingan berhasil dihapus.",
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal menghapus pertandingan.",
        });

    }

};

const startPertandingan = async (req, res) => {

    try {

        const { id } = req.params;

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        await pertandinganModel.startPertandingan(id);

        const data =
            await pertandinganModel.getPertandinganById(id);

        res.status(200).json({
            success: true,
            message: "Pertandingan dimulai.",
            data,
        });

    } catch (err) {

        console.error(err);

        res.status(400).json({
            success: false,
            message: err.message,
        });

    }

};

const pausePertandingan = async (req, res) => {

    try {

        const { id } = req.params;
        const { sisa_detik } = req.body;

        if (sisa_detik == null) {
            return res.status(400).json({
                success: false,
                message: "sisa_detik wajib dikirim."
            });
        }

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {
            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan."
            });
        }

        await pertandinganModel.pausePertandingan(
            id,
            sisa_detik
        );

        const data =
            await pertandinganModel.getPertandinganById(id);

        res.status(200).json({
            success: true,
            message: "Pertandingan dipause.",
            data
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const resumePertandingan = async (req, res) => {

    try {

        const { id } = req.params;

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {
            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan."
            });
        }

        await pertandinganModel.resumePertandingan(id);

        const data =
            await pertandinganModel.getPertandinganById(id);

        res.status(200).json({
            success: true,
            message: "Pertandingan dilanjutkan.",
            data
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const finishPertandingan = async (req, res) => {

    try {

        const { id } = req.params;

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        const result =
            await pertandinganModel.finishPertandingan(id);

        res.status(200).json({
            success: true,
            message: "Pertandingan selesai.",
            data: result,
        });

    } catch (err) {

        console.error(err);

        res.status(400).json({
            success: false,
            message: err.message,
        });

    }

};

const getScoreboard = async (req, res) => {

    try {

        const { id } = req.params;

        const scoreboard =
            await scoreboardModel.getScoreboard(id);

        if (!scoreboard) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan.",
            });

        }

        res.status(200).json({
            success: true,
            data: scoreboard,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil scoreboard.",
        });

    }

};

const updateTimer = async (req, res) => {

    try {

        const { id } = req.params;
        const { sisa_detik } = req.body;

        if (
            sisa_detik === undefined ||
            sisa_detik === null
        ) {

            return res.status(400).json({
                success: false,
                message: "sisa_detik wajib diisi."
            });

        }

        const pertandingan =
            await pertandinganModel.getPertandinganById(id);

        if (!pertandingan) {

            return res.status(404).json({
                success: false,
                message: "Pertandingan tidak ditemukan."
            });

        }

        const success =
            await pertandinganModel.updateTimer(
                id,
                Number(sisa_detik)
            );

        if (!success) {

            return res.status(400).json({
                success: false,
                message: "Pertandingan belum berlangsung."
            });

        }

        const data =
            await pertandinganModel.getPertandinganById(id);

        res.status(200).json({
            success: true,
            message: "Timer berhasil diperbarui.",
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

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
    finishPertandingan,
    getScoreboard,
    updateTimer
};