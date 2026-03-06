const JuriModel = require("../models/juriModel");

const getJuri = async (req, res) => {
    try {
        const data = await JuriModel.getAllJuri();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Juri" });
    }
};

const createJuri = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }

    try {
        const data = await JuriModel.createJuri(name);
        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating Juri" });
    }
};

const updateJuri = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const data = await JuriModel.updateJuri(id, name);

        if (!data) {
            return res.status(404).json({ message: "Juri not found" });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating Juri" });
    }
};

const deleteJuri = async (req, res) => {
    const { id } = req.params;

    try {
        const affected = await JuriModel.deleteJuri(id);

        if (affected === 0) {
            return res.status(404).json({ message: "Juri not found" });
        }

        res.status(200).json({ message: "Juri deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting Juri" });
    }
};

module.exports = {
    getJuri,
    createJuri,
    updateJuri,
    deleteJuri,
};