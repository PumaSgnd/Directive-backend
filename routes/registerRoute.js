const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", async (req, res) => {
  const { username, full_name, email, password } = req.body;

  if (!username || !full_name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [userByUsername] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
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
      [email]
    );

    if (userByEmail.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, full_name, email, password) VALUES (?, ?, ?, ?)",
      [username, full_name, email, hashedPassword]
    );

    res.status(201).json({
      id: result.insertId,
      username,
      full_name,
      email
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
