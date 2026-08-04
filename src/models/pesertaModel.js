const pool = require("../config/db");

const getAllPeserta = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM peserta ORDER BY id ASC"
    );
    return rows;
};

const createPeserta = async (name, regional, weight) => {
    const [result] = await pool.query(
        "INSERT INTO peserta (name, regional, weight) VALUES (?, ?, ?)",
        [name, regional, weight]
    );

    const [rows] = await pool.query(
        "SELECT * FROM peserta WHERE id = ?",
        [result.insertId]
    );

    return rows[0];
};

const updatePeserta = async (id, name, regional, weight) => {
    const [result] = await pool.query(
        "UPDATE peserta SET name = ?, regional = ?, weight = ? WHERE id = ?",
        [name, regional, weight, id]
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