const pool = require("../config/db");

const getUsers = async () => {
  const [rows] = await pool.query(
    "SELECT id, username, full_name, email, role, password, photo FROM users ORDER BY id ASC"
  );
  return rows;
};

const getUserById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, username, full_name, email, role, password, photo FROM users WHERE id = ?",
    [id]
  );
  return rows[0];
};

const createUser = async ({ full_name, username, email, password, role }) => {

  const query = `
    INSERT INTO users (full_name, username, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(query, [
    full_name,
    username,
    email,
    password,
    role
  ]);

  return result;
};

const updateUser = async (id, username, full_name, email, role) => {
  const [result] = await pool.query(
    "UPDATE users SET username=?, full_name=?, email=?, role=? WHERE id=?",
    [username, full_name, email, role, id]
  );

  return result.affectedRows;
};

const updateUserPhoto = async (id, photo) => {
  const [result] = await pool.query(
    "UPDATE users SET photo=? WHERE id=?",
    [photo, id]
  );

  return result.affectedRows;
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPhoto
};