const pool = require("../config/db");

const getAllPeserta = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM peserta ORDER BY id ASC"
    );
    return rows;
};

const createPeserta = async (name, regional) => {
    const [result] = await pool.query(
        "INSERT INTO peserta (name, regional) VALUES (?, ?)",
        [name, regional]
    );

    const [rows] = await pool.query(
        "SELECT * FROM peserta WHERE id = ?",
        [result.insertId]
    );

    return rows[0];
};

const updatePeserta = async (id, name, regional) => {
    const [result] = await pool.query(
        "UPDATE peserta SET name = ?, regional = ? WHERE id = ?",
        [name, regional, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query(
        "SELECT * FROM peserta WHERE id = ?",
        [id]
    );

    return rows[0];
};

const deletePeserta = async (id) => {
    const [result] = await pool.query(
        "DELETE FROM peserta WHERE id = ?",
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    getAllPeserta,
    createPeserta,
    updatePeserta,
    deletePeserta,
};