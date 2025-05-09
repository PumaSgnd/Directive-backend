const pool = require("../config/db");

const getDisciplines = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM disciplines ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching disciplines" });
    }
};

const createDiscipline = async (req, res) => {
    const { discipline, abbreviation, gender } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO disciplines (discipline, abbreviation, gender) VALUES ($1, $2, $3) RETURNING *",
            [discipline, abbreviation, gender]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error inserting discipline" });
    }
};

const updateDiscipline = async (req, res) => {
    const { id } = req.params;
    const { discipline, abbreviation, gender } = req.body;
    try {
        const result = await pool.query(
            "UPDATE disciplines SET discipline = $1, abbreviation = $2, gender = $3 WHERE id = $4 RETURNING *",
            [discipline, abbreviation, gender, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Discipline not found" });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating discipline" });
    }
};

const deleteDiscipline = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM disciplines WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Discipline not found" });
        }
        res.status(200).json({ message: "Discipline deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting discipline" });
    }
};

module.exports = {
    getDisciplines,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline,
};
