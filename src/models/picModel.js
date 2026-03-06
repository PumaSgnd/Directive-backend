const pool = require("../config/db");

const getAllPIC = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM pic ORDER BY id ASC"
    );
    return rows;
};

const createPIC = async (name) => {
    const [result] = await pool.query(
        "INSERT INTO pic (name) VALUES (?)",
        [name]
    );

    const [rows] = await pool.query(
        "SELECT * FROM pic WHERE id = ?",
        [result.insertId]
    );

    return rows[0];
};

const updatePIC = async (id, name) => {
    const [result] = await pool.query(
        "UPDATE pic SET name = ? WHERE id = ?",
        [name, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query(
        "SELECT * FROM pic WHERE id = ?",
        [id]
    );

    return rows[0];
};

const deletePIC = async (id) => {
    const [result] = await pool.query(
        "DELETE FROM pic WHERE id = ?",
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    getAllPIC,
    createPIC,
    updatePIC,
    deletePIC,
};