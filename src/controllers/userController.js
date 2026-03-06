const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");

const getUsers = async (req, res) => {
    try {
        const users = await userModel.getUsers();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching users" });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile" });
    }
};

const createUser = async (req, res) => {
    try {
        const { full_name, username, email, password, role } = req.body;

        if (!full_name || !username || !email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (/\s/.test(username)) {
            return res.status(400).json({
                message: "Username cannot contain spaces"
            });
        }

        const newUsername = username.toLowerCase().trim();
        const newEmail = email.toLowerCase().trim();

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (full_name, username, email, password, role)
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.execute(sql, [
            full_name.trim(),
            newUsername,
            newEmail,
            hashedPassword,
            role
        ]);

        res.status(201).json({
            message: "User created successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const updateUser = async (req, res) => {
    let { username, full_name, email, role } = req.body;

    if (!username || !full_name || !email || !role) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (/\s/.test(username)) {
        return res.status(400).json({
            message: "Username cannot contain spaces"
        });
    }

    const newUsername = username.toLowerCase().trim();
    const newEmail = email.toLowerCase().trim();

    try {
        const result = await userModel.updateUser(
            req.params.id,
            newUsername,
            full_name.trim(),
            newEmail,
            role
        );

        if (result === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "User updated successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Error updating user"
        });
    }
};

const updateProfilePhoto = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({ message: "No photo uploaded" });
        }

        const result = await userModel.updateUserPhoto(
            req.params.id,
            req.file.filename
        );

        if (result === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Photo updated",
            photo: req.file.filename
        });

    } catch (err) {
        res.status(500).json({ message: "Error uploading photo" });
    }
};

module.exports = {
    getUsers,
    getUserProfile,
    createUser,
    updateUser,
    updateProfilePhoto
};