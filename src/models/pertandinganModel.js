const pool = require("../config/db");
const scoreboardModel = require("./scoreboardModel");

const NEXT_BABAK = {
    penyisihan: "enam_belas_besar",
    enam_belas_besar: "perempat_final",
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

const pairPesertaByWeight = (peserta) => {
    if (!Array.isArray(peserta) || peserta.length === 0) {
        return {
            pairs: [],
            bye: null
        };
    }

    const normalized = peserta.map((item) => ({
        id: Number(item.id),
        name: item.name,
        weight:
            item.weight !== null &&
            item.weight !== undefined &&
            !Number.isNaN(Number(item.weight))
                ? Number(item.weight)
                : Infinity
    }));

    normalized.sort((a, b) => {
        if (a.weight === Infinity && b.weight === Infinity) {
            return a.id - b.id;
        }

        if (a.weight === Infinity) {
            return 1;
        }

        if (b.weight === Infinity) {
            return -1;
        }

        if (a.weight !== b.weight) {
            return a.weight - b.weight;
        }

        return a.id - b.id;
    });

    let bye = null;

    if (normalized.length % 2 !== 0) {
        bye = normalized.pop();
    }

    const remaining = [...normalized];
    const pairs = [];

    while (remaining.length >= 2) {
        let bestIndexA = 0;
        let bestIndexB = 1;
        let bestDifference = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            for (let j = i + 1; j < remaining.length; j++) {
                const weightA = remaining[i].weight;
                const weightB = remaining[j].weight;

                let difference;

                if (
                    weightA === Infinity ||
                    weightB === Infinity
                ) {
                    difference = Infinity;
                } else {
                    difference = Math.abs(
                        weightA - weightB
                    );
                }

                if (difference < bestDifference) {
                    bestDifference = difference;
                    bestIndexA = i;
                    bestIndexB = j;
                }
            }
        }

        const pesertaA = remaining[bestIndexA];
        const pesertaB = remaining[bestIndexB];

        pairs.push({
            peserta1_id: pesertaA.id,
            peserta2_id: pesertaB.id,
            peserta1_weight: pesertaA.weight,
            peserta2_weight: pesertaB.weight,
            selisih_bb:
                pesertaA.weight === Infinity ||
                pesertaB.weight === Infinity
                    ? null
                    : Math.abs(
                        pesertaA.weight -
                        pesertaB.weight
                    )
        });

        if (bestIndexA > bestIndexB) {
            remaining.splice(bestIndexA, 1);
            remaining.splice(bestIndexB, 1);
        } else {
            remaining.splice(bestIndexB, 1);
            remaining.splice(bestIndexA, 1);
        }
    }

    return {
        pairs,
        bye
    };
};

const generateNextBabak = async (babak) => {
    const next = NEXT_BABAK[babak];

    if (!next) {
        return;
    }

    const [[cek]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM pertandingan
        WHERE babak = ?
        `,
        [next]
    );

    if (Number(cek.total) > 0) {
        return;
    }

    const [matches] = await pool.query(
        `
        SELECT
            id,
            peserta1_id,
            peserta2_id,
            status,
            winner_id
        FROM pertandingan
        WHERE babak = ?
        ORDER BY id ASC
        `,
        [babak]
    );

    if (!matches.length) {
        return;
    }

    if (
        matches.some(
            (match) => match.status !== "selesai"
        )
    ) {
        return;
    }

    const winners = matches
        .map((match) => match.winner_id)
        .filter(Boolean)
        .map(Number);

    if (winners.length !== matches.length) {
        return;
    }

    const placeholders = winners
        .map(() => "?")
        .join(",");

    const [peserta] = await pool.query(
        `
        SELECT
            id,
            name,
            weight
        FROM peserta
        WHERE id IN (${placeholders})
        `,
        winners
    );

    if (peserta.length !== winners.length) {
        throw new Error(
            "Data peserta pemenang tidak lengkap."
        );
    }

    const {
        pairs,
        bye
    } = pairPesertaByWeight(peserta);

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [juri] = await conn.query(
            `
            SELECT id
            FROM users
            WHERE role = 'juri'
            `
        );

        for (const pair of pairs) {
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
                    'belum_mulai',
                    NULL,
                    NULL
                )
                `,
                [
                    next,
                    pair.peserta1_id,
                    pair.peserta2_id
                ]
            );

            const pertandinganId = result.insertId;

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
        }

        if (bye) {
            await conn.query(
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
                    NULL,
                    'selesai',
                    ?,
                    NOW()
                )
                `,
                [
                    next,
                    bye.id,
                    bye.id
                ]
            );
        }

        await conn.commit();

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
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