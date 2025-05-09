const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

router.post("/", async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail && !password) {
        return res.status(400).json({ error: "Username/Email and password are required" });
    }

    if (!usernameOrEmail) {
        return res.status(400).json({ error: "Username or email is required" });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    try {
        const query = usernameOrEmail.includes("@")
            ? "SELECT * FROM users WHERE email = $1"
            : "SELECT * FROM users WHERE username = $1";

        const result = await pool.query(query, [usernameOrEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = result.rows[0];

        if (!await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            SECRET_KEY,
            { expiresIn: '5h' }
        );

        res.status(200).json({
            message: "Login successful", token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
