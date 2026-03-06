const pool = require("../config/db");

const getAllJuri = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM juri ORDER BY id ASC"
    );
    return rows;
};

const createJuri = async (name) => {
    const [result] = await pool.query(
        "INSERT INTO juri (name) VALUES (?)",
        [name]
    );

    const [rows] = await pool.query(
        "SELECT * FROM juri WHERE id = ?",
        [result.insertId]
    );

    return rows[0];
};

const updateJuri = async (id, name) => {
    const [result] = await pool.query(
        "UPDATE juri SET name = ? WHERE id = ?",
        [name, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query(
        "SELECT * FROM juri WHERE id = ?",
        [id]
    );

    return rows[0];
};

const deleteJuri = async (id) => {
    const [result] = await pool.query(
        "DELETE FROM juri WHERE id = ?",
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    getAllJuri,
    createJuri,
    updateJuri,
    deleteJuri,
};