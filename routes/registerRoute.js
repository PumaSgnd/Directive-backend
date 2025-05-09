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
        const userByUsername = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        const userByFullname = await pool.query(
            "SELECT * FROM users WHERE full_name = $1",
            [full_name]
        );

        const userByEmail = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userByUsername.rows.length > 0) {
            return res.status(409).json({ error: "Username already exists" });
        }

        if (userByFullname.rows.length > 0) {
            return res.status(409).json({ error: "Full Name already exists" });
        }

        if (userByEmail.rows.length > 0) {
            return res.status(409).json({ error: "Email already registered" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            "INSERT INTO users (username, full_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
            [username, full_name, email, hashedPassword]
        );

        // Kembalikan response sukses
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
