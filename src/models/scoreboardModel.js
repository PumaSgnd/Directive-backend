const pool = require("../config/db");

/**
 * Mengambil total skor seluruh peserta
 */
const getTotalScore = async (pertandinganId) => {
    const [rows] = await pool.query(
        `
        SELECT
            peserta_id,
            SUM(poin) AS total
        FROM pertandingan_penilaian
        WHERE pertandingan_id = ?
        GROUP BY peserta_id
        `,
        [pertandinganId]
    );
    return rows;
};

/**
 * Mengambil total skor tiap juri
 */
const getScorePerJuri = async (pertandinganId) => {
    const [rows] = await pool.query(
        `
        SELECT
            pp.juri_id,
            u.full_name,
            pp.peserta_id,
            SUM(pp.poin) AS total
        FROM pertandingan_penilaian pp
        INNER JOIN users u
            ON u.id = pp.juri_id
        WHERE pp.pertandingan_id = ?
        GROUP BY
            pp.juri_id,
            pp.peserta_id
        ORDER BY
            pp.juri_id ASC
        `,
        [pertandinganId]
    );
    return rows;
};

/**
 * Scoreboard pertandingan
 */
const getScoreboard = async (pertandinganId) => {

    /**
     * Data pertandingan
     */
    const [[match]] = await pool.query(
        `
        SELECT
            p.id,
            p.babak,
            p.status,
            p.winner_id,
            p1.id AS peserta1_id,
            p1.name AS peserta1_name,
            p1.regional AS peserta1_regional,
            p2.id AS peserta2_id,
            p2.name AS peserta2_name,
            p2.regional AS peserta2_regional
        FROM pertandingan p
        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id
        INNER JOIN peserta p2
            ON p2.id = p.peserta2_id
        WHERE p.id = ?
        `,
        [pertandinganId]
    );

    if (!match) {
        return null;
    }

    /**
     * Daftar juri pertandingan
     */
    const [juriRows] = await pool.query(
        `
        SELECT
            u.id,
            u.full_name
        FROM pertandingan_juri pj
        INNER JOIN users u
            ON u.id = pj.user_id
        WHERE pj.pertandingan_id = ?
        ORDER BY u.id ASC
        `,
        [pertandinganId]
    );

    /**
     * Total nilai per juri
     */
    const [scoreRows] = await pool.query(
        `
        SELECT
            juri_id,
            peserta_id,
            SUM(poin) AS total
        FROM pertandingan_penilaian
        WHERE pertandingan_id = ?
        GROUP BY
            juri_id,
            peserta_id
        `,
        [pertandinganId]
    );

    /**
     * Supaya tidak pakai find() berkali-kali
     */
    const scoreMap = new Map();

    for (const row of scoreRows) {
        scoreMap.set(
            `${row.juri_id}-${row.peserta_id}`,
            Number(row.total)
        );
    }

    const peserta1 = {
        id: match.peserta1_id,
        nama: match.peserta1_name,
        regional: match.peserta1_regional,
        total: 0,
        juri: []
    };

    const peserta2 = {
        id: match.peserta2_id,
        nama: match.peserta2_name,
        regional: match.peserta2_regional,
        total: 0,
        juri: []
    };

    for (const juri of juriRows) {

        const totalPeserta1 =
            scoreMap.get(
                `${juri.id}-${peserta1.id}`
            ) || 0;

        const totalPeserta2 =
            scoreMap.get(
                `${juri.id}-${peserta2.id}`
            ) || 0;

        peserta1.total += totalPeserta1;
        peserta2.total += totalPeserta2;

        peserta1.juri.push({
            id: juri.id,
            nama: juri.full_name,
            total: totalPeserta1
        });

        peserta2.juri.push({
            id: juri.id,
            nama: juri.full_name,
            total: totalPeserta2
        });
    }

    return {
        id: match.id,
        babak: match.babak,
        status: match.status,
        winner_id: match.winner_id,
        peserta1,
        peserta2
    };
};

/**
 * Menentukan pemenang berdasarkan scoreboard
 */
const getWinner = async (pertandinganId) => {

    const scoreboard = await getScoreboard(
        pertandinganId
    );

    if (!scoreboard) {
        return null;
    }

    if (
        scoreboard.peserta1.total >
        scoreboard.peserta2.total
    ) {

        return {
            winner_id: scoreboard.peserta1.id,
            total1: scoreboard.peserta1.total,
            total2: scoreboard.peserta2.total
        };
    }

    if (
        scoreboard.peserta2.total >
        scoreboard.peserta1.total
    ) {
        return {
            winner_id: scoreboard.peserta2.id,
            total1: scoreboard.peserta1.total,
            total2: scoreboard.peserta2.total
        };
    }

    return {
        winner_id: null,
        total1: scoreboard.peserta1.total,
        total2: scoreboard.peserta2.total
    };
};

module.exports = {
    getTotalScore,
    getScorePerJuri,
    getScoreboard,
    getWinner
};