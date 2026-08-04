const pool = require("../config/db");
const scoreboardModel = require("./scoreboardModel");

const NEXT_BABAK = {
    penyisihan: "perempat_final",
    perempat_final: "semi_final",
    semi_final: "final",
    final: null,
};

const getAllPertandingan = async (babak) => {

    const [rows] = await pool.query(
        `
        SELECT

            p.id,
            p.babak,
            p.durasi_menit,
            p.status,
            p.winner_id,
            p.waktu_mulai,
            p.waktu_selesai,
            p.sisa_detik,
            p.created_at,
            p.updated_at,

            p1.id AS peserta1_id,
            p1.name AS peserta1_name,
            p1.weight AS peserta1_weight,
            p1.regional AS peserta1_regional,

            p2.id AS peserta2_id,
            p2.name AS peserta2_name,
            p2.weight AS peserta2_weight,
            p2.regional AS peserta2_regional

        FROM pertandingan p

        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id

        LEFT JOIN peserta p2
            ON p2.id = p.peserta2_id

        WHERE (? IS NULL OR p.babak=?)

        ORDER BY p.id ASC
        `,
        [babak || null, babak || null]
    );

    return rows;

};

const getRiwayatPertandingan = async (babak) => {

    const [rows] = await pool.query(
        `
        SELECT

            p.id,
            p.babak,
            p.durasi_menit,
            p.status,
            p.winner_id,
            p.waktu_mulai,
            p.waktu_selesai,
            p.created_at,

            p1.id AS peserta1_id,
            p1.name AS peserta1_name,

            p2.id AS peserta2_id,
            p2.name AS peserta2_name,

            w.name AS winner_name

        FROM pertandingan p

        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id

        LEFT JOIN peserta p2
            ON p2.id = p.peserta2_id

        LEFT JOIN peserta w
            ON w.id = p.winner_id

        WHERE p.status = 'selesai'
        AND (? IS NULL OR p.babak = ?)

        ORDER BY p.waktu_selesai DESC
        `,
        [babak || null, babak || null]
    );

    return rows;

};

const getPertandinganById = async (id) => {

    const [rows] = await pool.query(
        `
        SELECT

            p.*,

            p1.name AS peserta1_name,
            p2.name AS peserta2_name

        FROM pertandingan p

        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id

        LEFT JOIN peserta p2
            ON p2.id = p.peserta2_id

        WHERE p.id=?
        `,
        [id]
    );

    if (!rows.length) return null;

    const pertandingan = rows[0];

    const [juri] = await pool.query(
        `
        SELECT

            u.id,
            u.full_name

        FROM pertandingan_juri pj

        INNER JOIN users u
            ON u.id=pj.user_id

        WHERE pj.pertandingan_id=?
        `,
        [id]
    );

    pertandingan.juri = juri;

    return pertandingan;

};

const createPertandingan = async (
    babak,
    durasi_menit,
    peserta1_id,
    peserta2_id
) => {

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        const [result] = await conn.query(
            `
            INSERT INTO pertandingan
            (
                babak,
                durasi_menit,
                peserta1_id,
                peserta2_id
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?
            )
            `,
            [
                babak,
                durasi_menit,
                peserta1_id,
                peserta2_id
            ]
        );

        const pertandinganId = result.insertId;

        const [juri] = await conn.query(
            `
            SELECT id
            FROM users
            WHERE role='juri'
            `
        );

        for (const item of juri) {

            await conn.query(
                `
                INSERT INTO pertandingan_juri
                (
                    pertandingan_id,
                    user_id
                )
                VALUES
                (
                    ?,
                    ?
                )
                `,
                [
                    pertandinganId,
                    item.id
                ]
            );

        }

        await conn.commit();
        return pertandinganId;

    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {

        conn.release();
    }
};

const updatePertandingan = async (id, data) => {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();
        await conn.query(
            `
            UPDATE pertandingan
            SET
                babak=?,
                durasi_menit=?,
                status=?,
                winner_id=?,
                waktu_mulai=?,
                waktu_selesai=?,
                sisa_detik=?
            WHERE id=?
            `,
            [
                data.babak,
                data.durasi_menit,
                data.status,
                data.winner_id,
                data.waktu_mulai,
                data.waktu_selesai,
                data.sisa_detik,
                id
            ]
        );

        if (Array.isArray(data.juri)) {
            await conn.query(
                `
                DELETE FROM pertandingan_juri
                WHERE pertandingan_id=?
                `,
                [id]
            );

            for (const userId of data.juri) {
                await conn.query(
                    `
                    INSERT INTO pertandingan_juri
                    (
                        pertandingan_id,
                        user_id
                    )
                    VALUES
                    (
                        ?,
                        ?
                    )
                    `,
                    [
                        id,
                        userId
                    ]
                );

            }

        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const deletePertandingan = async (id) => {
    const [result] = await pool.query(
        `
        DELETE FROM pertandingan
        WHERE id=?
        `,
        [id]
    );
    return result.affectedRows;
};

const startPertandingan = async (id) => {
    const [[match]] = await pool.query(
        `
        SELECT durasi_menit, status
        FROM pertandingan
        WHERE id=?
        `,
        [id]
    );

    if (!match) {
        throw new Error("Pertandingan tidak ditemukan.");
    }

    // Cegah start ulang pertandingan yang sudah berlangsung/pause/selesai.
    // Tanpa ini, klik Play ganda dari beberapa juri yang membuka
    // halaman hampir bersamaan akan mereset timer yang sudah berjalan.
    if (match.status !== "belum_mulai") {
        throw new Error("Pertandingan sudah dimulai.");
    }

    const sisaDetik = Number(match.durasi_menit) * 60;

    await pool.query(
        `
        UPDATE pertandingan
        SET
            status='berlangsung',
            waktu_mulai=NOW(),
            sisa_detik=?,
            waktu_selesai=NULL
        WHERE id=?
        `,
        [
            sisaDetik,
            id
        ]
    );
};

const pausePertandingan = async (id, sisa_detik) => {

    const [[match]] = await pool.query(
        `
        SELECT status
        FROM pertandingan
        WHERE id=?
        `,
        [id]
    );

    if (!match) {
        throw new Error("Pertandingan tidak ditemukan.");
    }

    if (match.status !== "berlangsung") {
        throw new Error("Pertandingan tidak sedang berlangsung.");
    }

    await pool.query(
        `
        UPDATE pertandingan
        SET
            status='pause',
            sisa_detik=?
        WHERE id=?
        `,
        [
            sisa_detik,
            id
        ]
    );

};

const resumePertandingan = async (id) => {

    const [[match]] = await pool.query(
        `
        SELECT
            status,
            sisa_detik
        FROM pertandingan
        WHERE id=?
        `,
        [id]
    );

    if (!match) {
        throw new Error("Pertandingan tidak ditemukan.");
    }

    if (match.status !== "pause") {
        throw new Error("Pertandingan tidak sedang pause.");
    }

    await pool.query(
        `
        UPDATE pertandingan
        SET
            status='berlangsung'
        WHERE id=?
        `,
        [id]
    );

};

const finishPertandingan = async (id) => {

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        const winner = await scoreboardModel.getWinner(id);

        if (!winner) {
            throw new Error("Pertandingan tidak ditemukan.");
        }

        if (!winner.winner_id) {
            throw new Error("Skor seri.");
        }

        await conn.query(
            `
            UPDATE pertandingan
            SET

                status='selesai',
                winner_id=?,
                waktu_selesai=NOW(),
                sisa_detik=0

            WHERE id=?
            `,
            [
                winner.winner_id,
                id
            ]
        );

        await conn.commit();

        const [[match]] = await pool.query(
            `
            SELECT babak
            FROM pertandingan
            WHERE id=?
            `,
            [id]
        );

        await generateNextBabak(match.babak);
        return winner;

    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {

        conn.release();
    }
};

const generateNextBabak = async (babak) => {

    const next = NEXT_BABAK[babak];

    if (!next) return;

    const [[cek]] = await pool.query(
        `
        SELECT COUNT(*) total
        FROM pertandingan
        WHERE babak=?
        `,
        [next]
    );

    if (cek.total > 0) return;

    const [match] = await pool.query(
        `
        SELECT *
        FROM pertandingan
        WHERE babak=?
        ORDER BY id
        `,
        [babak]
    );

    if (!match.length) return;

    if (match.some(m => m.status !== "selesai")) {
        return;
    }

    const winners = match.map(m => m.winner_id);

    if (winners.some(id => !id)) {
        return;
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [juri] = await conn.query(
            `
            SELECT id
            FROM users
            WHERE role='juri'
            `
        );

        for (let i = 0; i < winners.length; i += 2) {

            // Jika jumlah pemenang ganjil, peserta terakhir
            // otomatis dapat BYE (lolos tanpa bertanding).
            const isBye = winners[i + 1] === undefined;

            const [result] = await conn.query(
                `
                INSERT INTO pertandingan
                (
                    babak,
                    durasi_menit,
                    peserta1_id,
                    peserta2_id,
                    status,
                    winner_id,
                    waktu_selesai
                )
                VALUES
                (
                    ?,
                    '2',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    next,
                    winners[i],
                    isBye ? null : winners[i + 1],
                    isBye ? "selesai" : "belum_mulai",
                    isBye ? winners[i] : null,
                    isBye ? new Date() : null
                ]
            );

            // Pertandingan BYE tidak butuh juri karena
            // tidak pernah benar-benar dimainkan.
            if (!isBye) {
                for (const item of juri) {
                    await conn.query(
                        `
                        INSERT INTO pertandingan_juri
                        (
                            pertandingan_id,
                            user_id
                        )
                        VALUES
                        (
                            ?,
                            ?
                        )
                        `,
                        [
                            result.insertId,
                            item.id
                        ]
                    );
                }
            }
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {

        conn.release();
    }

    // Jika ronde berikutnya ternyata seluruhnya berisi BYE
    // (misalnya sisa 1 peserta terakhir), generate lagi secara
    // berantai supaya bracket tidak macet.
    await generateNextBabak(next);
};

const updateTimer = async (id, sisa_detik) => {

    const [result] = await pool.query(
        `
        UPDATE pertandingan
        SET
            sisa_detik = ?
        WHERE id = ?
        AND status = 'berlangsung'
        `,
        [
            sisa_detik,
            id
        ]
    );

    return result.affectedRows > 0;

};

module.exports = {
    getAllPertandingan,
    getRiwayatPertandingan,
    getPertandinganById,
    createPertandingan,
    updatePertandingan,
    deletePertandingan,
    startPertandingan,
    pausePertandingan,
    resumePertandingan,
    finishPertandingan,
    generateNextBabak,
    updateTimer
};