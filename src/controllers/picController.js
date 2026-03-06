const picModel = require("../models/picModel");

const getPIC = async (req, res) => {
    try {
        const data = await picModel.getAllPIC();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching PIC" });
    }
};

const createPIC = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }

    try {
        const data = await picModel.createPIC(name);
        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating PIC" });
    }
};

const updatePIC = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const data = await picModel.updatePIC(id, name);

        if (!data) {
            return res.status(404).json({ message: "PIC not found" });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating PIC" });
    }
};

const deletePIC = async (req, res) => {
    const { id } = req.params;

    try {
        const affected = await picModel.deletePIC(id);

        if (affected === 0) {
            return res.status(404).json({ message: "PIC not found" });
        }

        res.status(200).json({ message: "PIC deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting PIC" });
    }
};

module.exports = {
    getPIC,
    createPIC,
    updatePIC,
    deletePIC,
};