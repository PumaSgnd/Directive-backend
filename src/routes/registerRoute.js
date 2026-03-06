const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", async (req, res) => {
  const { username, full_name, email, password } = req.body;

  if (!username || !full_name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (/\s/.test(username)) {
    return res.status(400).json({ error: "Username cannot contain spaces" });
  }

  const newUsername = username.toLowerCase().trim();
  const newEmail = email.toLowerCase().trim();
  const role = "panitia";

  try {
    const [userByUsername] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [newUsername]
    );

    if (userByUsername.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const [userByFullname] = await pool.query(
      "SELECT id FROM users WHERE full_name = ?",
      [full_name]
    );

    if (userByFullname.length > 0) {
      return res.status(409).json({ error: "Full Name already exists" });
    }

    const [userByEmail] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [newEmail]
    );

    if (userByEmail.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [newUsername, full_name.trim(), newEmail, hashedPassword, role]
    );

    res.status(201).json({
      id: result.insertId,
      username: newUsername,
      email: newEmail,
      role
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;