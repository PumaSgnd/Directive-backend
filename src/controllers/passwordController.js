const crypto = require("crypto");

const {
    getUserByEmail,
    updatePassword
} = require("../models/userModel");

const {
    createPasswordReset,
    getValidPasswordReset,
    markPasswordResetUsed,
    deleteUserPasswordResets
} = require("../models/passwordResetModel");

const {
    sendResetPasswordEmail
} = require("../middleware/emailService");

const bcrypt = require("bcryptjs");

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email wajib diisi"
            });
        }

        const user = await getUserByEmail(email);

        // Jangan memberitahu apakah email terdaftar atau tidak
        if (!user) {
            return res.status(200).json({
                message:
                    "Jika email terdaftar, link reset password akan dikirim."
            });
        }

        // Hapus token reset sebelumnya
        await deleteUserPasswordResets(user.id);

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");

        // Hash token untuk database
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Expired 15 menit
        const expiresAt = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await createPasswordReset({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt
        });

        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await sendResetPasswordEmail({
            email: user.email,
            full_name: user.full_name,
            resetUrl
        });

        return res.status(200).json({
            message:
                "Jika email terdaftar, link reset password akan dikirim."
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan pada server"
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const {
            token,
            password,
            confirmPassword
        } = req.body;

        if (!token || !password || !confirmPassword) {
            return res.status(400).json({
                message: "Semua field wajib diisi"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Password dan konfirmasi password tidak sama"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password minimal 6 karakter"
            });
        }

        // Hash token dari URL
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Cari token yang masih valid
        const resetData =
            await getValidPasswordReset(tokenHash);

        if (!resetData) {
            return res.status(400).json({
                message:
                    "Link reset password tidak valid atau sudah kadaluarsa"
            });
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Update password
        await updatePassword(
            resetData.user_id,
            hashedPassword
        );

        // Tandai token sudah digunakan
        await markPasswordResetUsed(
            resetData.id
        );

        return res.status(200).json({
            message:
                "Password berhasil diubah. Silakan login kembali."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan pada server"
        });
    }
};

module.exports = {
    forgotPassword,
    resetPassword
};