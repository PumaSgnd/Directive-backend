const pool = require("../config/db");

const getUsersByRole = async (role) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, username, email, role FROM users WHERE role = ? ORDER BY id ASC",
    [role]
  );

  return rows;
};

const getAllUsers = async () => {
  const [rows] = await pool.query(
    "SELECT id, full_name, username, email, role FROM users ORDER BY id ASC"
  );

  return rows;
};

const getUserById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, role FROM users WHERE id=?",
    [id]
  );

  return rows[0];
};

const getUserByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, username, email, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0];
};

const createUser = async ({
  full_name,
  username,
  email,
  password,
  role
}) => {
  const [result] = await pool.query(
    "INSERT INTO users (full_name, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
    [full_name, username, email, password, role]
  );

  return result;
};

const updateUser = async (id, username, full_name, email, role) => {
  const [result] = await pool.query(
    "UPDATE users SET username=?, full_name=?, email=?, role=? WHERE id=?",
    [username, full_name, email, role, id]
  );

  return result.affectedRows;
};

const updatePassword = async (id, password) => {
  const [result] = await pool.query(
    "UPDATE users SET password = ? WHERE id = ?",
    [password, id]
  );

  return result.affectedRows;
};

const deleteUser = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM users WHERE id=?",
    [id]
  );

  return result.affectedRows;
};

module.exports = {
  getUsersByRole,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  updatePassword,
  deleteUser
};