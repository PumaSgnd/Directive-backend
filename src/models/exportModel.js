const pool = require("../config/db");

const getExportPertandingan = async ({
    babak = null,
    status = null,
} = {}) => {
    const normalizedBabak =
        babak && babak !== "semua" ? babak : null;

    console.log(
        "========== EXPORT PERTANDINGAN =========="
    );

    console.log("babak:", babak);
    console.log("status:", status);
    console.log(
        "normalizedBabak:",
        normalizedBabak
    );

    console.log(
        "=========================================="
    );

    let statusCondition = "";
    let statusParams = [];

    if (status && status !== "semua") {
        if (status === "berlangsung") {
            statusCondition = `
                AND p.status IN (?, ?)
            `;

            statusParams = [
                "berlangsung",
                "pause",
            ];
        } else {
            statusCondition = `
                AND p.status = ?
            `;

            statusParams = [status];
        }
    }

    console.log("statusCondition:", statusCondition);
    console.log("statusParams:", statusParams);

    const [matches] = await pool.query(
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

        WHERE (? IS NULL OR p.babak = ?)
        ${statusCondition}

        ORDER BY
            FIELD(
                p.babak,
                'penyisihan',
                'enam_belas_besar',
                'perempat_final',
                'semi_final',
                'final'
            ),
            p.id ASC
        `,
        [
            normalizedBabak,
            normalizedBabak,
            ...statusParams,
        ]
    );

    console.log(
        "========== EXPORT MATCHES =========="
    );

    console.log(matches);

    console.log(
        "===================================="
    );

    if (!matches.length) {
        return [];
    }

    const ids = matches.map((item) => item.id);
    const placeholders = ids.map(() => "?").join(",");

    // =========================================================
    // JURI YANG DITUNJUK PADA SETIAP PERTANDINGAN
    // =========================================================

    const [juriRows] = await pool.query(
        `
        SELECT
            pj.pertandingan_id,
            u.id AS juri_id,
            u.full_name AS juri_name

        FROM pertandingan_juri pj

        INNER JOIN users u
            ON u.id = pj.user_id

        WHERE pj.pertandingan_id IN (${placeholders})

        ORDER BY
            pj.pertandingan_id ASC,
            u.id ASC
        `,
        ids
    );

    // =========================================================
    // SEMUA SCORE PER JURI + PESERTA
    // =========================================================

    const [scoreRows] = await pool.query(
        `
        SELECT
            pp.pertandingan_id,
            pp.juri_id,
            pp.peserta_id,
            SUM(pp.poin) AS total

        FROM pertandingan_penilaian pp

        WHERE pp.pertandingan_id IN (${placeholders})

        GROUP BY
            pp.pertandingan_id,
            pp.juri_id,
            pp.peserta_id

        ORDER BY
            pp.pertandingan_id ASC,
            pp.juri_id ASC
        `,
        ids
    );

    // =========================================================
    // MAP JURI
    // =========================================================

    const juriMap = new Map();
    const scoreMap = new Map();

    for (const row of juriRows) {
        if (!juriMap.has(row.pertandingan_id)) {
            juriMap.set(row.pertandingan_id, []);
        }

        juriMap.get(row.pertandingan_id).push({
            id: row.juri_id,
            nama: row.juri_name,
        });
    }

    // =========================================================
    // MAP SCORE
    // =========================================================

    for (const row of scoreRows) {
        scoreMap.set(
            `${row.pertandingan_id}-${row.juri_id}-${row.peserta_id}`,
            Number(row.total) || 0
        );
    }

    // =========================================================
    // FORMAT HASIL EXPORT
    // =========================================================

    const result = matches.map((match) => {
        const juri = juriMap.get(match.id) || [];

        const peserta1 = {
            id: match.peserta1_id,
            nama: match.peserta1_name,
            berat: match.peserta1_weight,
            regional: match.peserta1_regional,
            total: 0,
        };

        const peserta2 = match.peserta2_id
            ? {
                id: match.peserta2_id,
                nama: match.peserta2_name,
                berat: match.peserta2_weight,
                regional: match.peserta2_regional,
                total: 0,
            }
            : null;

        const scorePerJuri = juri.map((item) => {
            const score1 =
                scoreMap.get(
                    `${match.id}-${item.id}-${peserta1.id}`
                ) || 0;

            const score2 =
                peserta2
                    ? scoreMap.get(
                        `${match.id}-${item.id}-${peserta2.id}`
                    ) || 0
                    : 0;

            peserta1.total += score1;

            if (peserta2) {
                peserta2.total += score2;
            }

            return {
                juri_id: item.id,
                juri: item.nama,
                peserta1_score: score1,
                peserta2_score: score2,
            };
        });

        return {
            id: match.id,
            babak: match.babak,
            status: match.status,
            winner_id: match.winner_id,
            waktu_mulai: match.waktu_mulai,
            waktu_selesai: match.waktu_selesai,
            peserta1,
            peserta2,
            juri,
            scorePerJuri,
        };
    });

    console.log(
        "========== EXPORT DATA SIAP PDF =========="
    );

    console.dir(result, {
        depth: null,
    });

    console.log(
        "============================================"
    );

    return result;
};

// =============================================================
// EXPORT BRACKET
// =============================================================

const getExportBracket = async () => {
    const [rows] = await pool.query(
        `
        SELECT
            p.id,
            p.babak,
            p.status,
            p.winner_id,

            p1.id AS peserta1_id,
            p1.name AS peserta1_name,

            p2.id AS peserta2_id,
            p2.name AS peserta2_name

        FROM pertandingan p

        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id

        LEFT JOIN peserta p2
            ON p2.id = p.peserta2_id

        ORDER BY
            FIELD(
                p.babak,
                'penyisihan',
                'enam_belas_besar',
                'perempat_final',
                'semi_final',
                'final'
            ),
            p.id ASC
        `
    );

    const ids = rows.map((row) => row.id);

    if (!ids.length) {
        return [];
    }

    const placeholders = ids.map(() => "?").join(",");

    const [scoreRows] = await pool.query(
        `
        SELECT
            pertandingan_id,
            peserta_id,
            SUM(poin) AS total

        FROM pertandingan_penilaian

        WHERE pertandingan_id IN (${placeholders})

        GROUP BY
            pertandingan_id,
            peserta_id
        `,
        ids
    );

    const scoreMap = new Map();

    for (const row of scoreRows) {
        scoreMap.set(
            `${row.pertandingan_id}-${row.peserta_id}`,
            Number(row.total) || 0
        );
    }

    return rows.map((row) => ({
        id: row.id,
        babak: row.babak,
        status: row.status,
        winner_id: row.winner_id,

        peserta1: {
            id: row.peserta1_id,
            nama: row.peserta1_name,
            score:
                scoreMap.get(
                    `${row.id}-${row.peserta1_id}`
                ) || 0,
        },

        peserta2: row.peserta2_id
            ? {
                id: row.peserta2_id,
                nama: row.peserta2_name,
                score:
                    scoreMap.get(
                        `${row.id}-${row.peserta2_id}`
                    ) || 0,
            }
            : null,
    }));
};

module.exports = {
    getExportPertandingan,
    getExportBracket,
};