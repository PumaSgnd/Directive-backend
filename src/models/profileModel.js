const pool = require("../config/db");

const getProfileById = async (id) => {
    const [rows] = await pool.query(
        `
        SELECT
            id,
            username,
            full_name,
            email,
            role,
            photo,
            created_at,
            updated_at
        FROM users
        WHERE id = ?
        `,
        [id]
    );

    return rows[0];
};

const updateProfile = async (
    id,
    username,
    full_name,
    email,
    photo
) => {
    const [result] = await pool.query(
        `
        UPDATE users
        SET
            username = ?,
            full_name = ?,
            email = ?,
            photo = ?
        WHERE id = ?
        `,
        [
            username,
            full_name,
            email,
            photo,
            id
        ]
    );

    return result.affectedRows;
};

module.exports = {
    getProfileById,
    updateProfile
};