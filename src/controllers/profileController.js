const profileModel = require("../models/profileModel");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");


const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user =
            await profileModel.getProfileById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);

    } catch (error) {
        console.error("Get profile error:", error);

        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            username,
            full_name,
            email
        } = req.body;

        if (
            !username ||
            !full_name ||
            !email
        ) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                message:
                    "Username, full name, and email are required"
            });
        }

        const cleanUsername =
            username.toLowerCase().trim();

        const cleanFullName =
            full_name.trim();

        const cleanEmail =
            email.toLowerCase().trim();

        const currentUser =
            await profileModel.getProfileById(userId);

        if (!currentUser) {

            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(404).json({
                message: "User not found"
            });
        }

        const [duplicate] = await pool.query(
            `
            SELECT id, username, email
            FROM users
            WHERE (username = ? OR email = ?)
            AND id != ?
            LIMIT 1
            `,
            [
                cleanUsername,
                cleanEmail,
                userId
            ]
        );


        if (duplicate.length > 0) {

            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            if (
                duplicate[0].username ===
                cleanUsername
            ) {
                return res.status(409).json({
                    message: "Username already exists"
                });
            }

            if (
                duplicate[0].email ===
                cleanEmail
            ) {
                return res.status(409).json({
                    message: "Email already exists"
                });
            }
        }

        let photo = currentUser.photo;

        if (req.file) {
            photo = req.file.filename;
        }

        const affected =
            await profileModel.updateProfile(
                userId,
                cleanUsername,
                cleanFullName,
                cleanEmail,
                photo
            );


        if (!affected) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(404).json({
                message: "User not found"
            });
        }

        if (
            req.file &&
            currentUser.photo &&
            currentUser.photo !== req.file.filename
        ) {
            const oldPhotoPath = path.join(
                "uploads/userphoto",
                currentUser.photo
            );

            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }


        const updatedUser =
            await profileModel.getProfileById(userId);


        res.json({
            message:
                "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        if (req.file) {
            try {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (deleteError) {
                console.error(
                    "Failed to remove uploaded file:",
                    deleteError
                );
            }
        }

        console.error(
            "Update profile error:",
            error
        );

        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


module.exports = {
    getProfile,
    updateProfile
};