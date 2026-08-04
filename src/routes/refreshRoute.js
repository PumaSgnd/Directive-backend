// routes/authRoutes.js (tambahan endpoint baru)
router.post("/refresh", async (req, res) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token tidak ditemukan." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return res.status(401).json({
            error: "Token tidak valid atau sudah kedaluwarsa.",
        });
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - decoded.iat; // detik sejak token dibuat

    const MIN_AGE = 12 * 60 * 60; // 12 jam
    const MAX_AGE = 14 * 60 * 60; // 14 jam

    // Belum masuk window refresh
    if (tokenAge < MIN_AGE) {
        return res.status(400).json({
            error: "Token belum memasuki masa refresh.",
        });
    }

    // Sudah lewat window refresh → tolak, biarkan token expired natural di jam ke-16
    if (tokenAge > MAX_AGE) {
        return res.status(401).json({
            error: "Sudah melewati batas waktu refresh, silakan login ulang.",
        });
    }

    // Ambil data user terbaru (jaga-jaga kalau role/username berubah)
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE id = ?",
        [decoded.id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan." });
    }

    const user = rows[0];

    const newToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
        SECRET_KEY,
        { expiresIn: "16h" }
    );

    res.status(200).json({
        message: "Token berhasil diperbarui.",
        token: newToken,
    });

});