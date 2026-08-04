const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");

const getUsers = async (req, res) => {
    const users = await userModel.getAllUsers();
    res.json(users);
};

const createUser = async (req, res) => {
    const { full_name, username, email, password, role } = req.body;

    if (!full_name || !username || !email || !password || !role) {
        return res.status(400).json({ message: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await userModel.createUser({
        full_name,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role
    });

    res.status(201).json({
        id: result.insertId,
        name: full_name
    });
};

const updateUser = async (req, res) => {
    const { id } = req.params;

    const targetUser = await userModel.getUserById(id);

    if (targetUser.role === "developer" && req.user.role !== "developer") {
        return res.status(403).json({
            message: "Tidak bisa update developer"
        });
    }

    if (req.body.role === "developer" && req.user.role !== "developer") {
        return res.status(403).json({
            message: "Tidak bisa assign role developer"
        });
    }

    const affected = await userModel.updateUser(
        id,
        req.body.username.toLowerCase().trim(),
        req.body.full_name.trim(),
        req.body.email.toLowerCase().trim(),
        req.body.role
    );

    if (!affected) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated" });
};

const deleteUser = async (req, res) => {
    const { id } = req.params;

    const targetUser = await userModel.getUserById(id);

    if (targetUser.role === "developer" && req.user.role !== "developer") {
        return res.status(403).json({
            message: "Tidak bisa delete developer"
        });
    }

    const affected = await userModel.deleteUser(id);

    if (!affected) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};