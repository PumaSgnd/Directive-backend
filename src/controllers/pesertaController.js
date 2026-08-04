const pesertaModel = require("../models/pesertaModel");

const getPeserta = async (req, res) => {
    try {
        const data = await pesertaModel.getAllPeserta();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Peserta" });
    }
};

const createPeserta = async (req, res) => {
    const { name, regional, weight } = req.body;

    if (!name || !regional || weight === undefined || isNaN(weight)) {
        return res.status(400).json({
            message: "Name, regional and weight are required",
        });
    }

    try {
        const data = await pesertaModel.createPeserta(
            name,
            regional,
            parseFloat(weight)
        );

        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating Peserta" });
    }
};

const updatePeserta = async (req, res) => {
    const { id } = req.params;
    const { name, regional, weight } = req.body;

    if (!name || !regional || weight === undefined || isNaN(weight)) {
        return res.status(400).json({
            message: "Name, regional and weight are required",
        });
    }

    try {
        const data = await pesertaModel.updatePeserta(
            id,
            name,
            regional,
            parseFloat(weight)
        );

        if (!data) {
            return res.status(404).json({
                message: "Peserta not found",
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error updating Peserta",
        });
    }
};

const deletePeserta = async (req, res) => {
    const { id } = req.params;

    try {
        const affected = await pesertaModel.deletePeserta(id);

        if (affected === 0) {
            return res.status(404).json({ message: "Peserta not found" });
        }

        res.status(200).json({ message: "Peserta deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting Peserta" });
    }
};

module.exports = {
    getPeserta,
    createPeserta,
    updatePeserta,
    deletePeserta,
};