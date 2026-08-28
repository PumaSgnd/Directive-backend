const pool = require("../config/db");

const TOTAL_ROUNDS = 3;
const TOTAL_MAIN_JUDGES = 3;

// =============================================================
// EXPORT PERTANDINGAN
// =============================================================
const getExportPertandingan = async ({
    babak = null,
    status = null,
} = {}) => {
    const normalizedBabak =
        babak && babak !== "semua" ? babak : null;

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

    // =========================================================
    // DATA PERTANDINGAN
    // =========================================================
    const [matches] = await pool.query(
        `
        SELECT
            p.id,
            p.babak,
            p.durasi_ronde_menit,
            p.status,
            p.winner_id,
            p.ronde_aktif,
            p.total_ronde,
            p.sisa_detik,
            p.alasan_selesai,
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

        WHERE
            (? IS NULL OR p.babak = ?)
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

    if (!matches.length) {
        return [];
    }

    const ids = matches.map((item) => item.id);
    const placeholders = ids.map(() => "?").join(",");

    // =========================================================
    // JURI UTAMA
    //
    // Hanya 3 juri utama yang ditampilkan di export.
    // =========================================================
    const [juriRows] = await pool.query(
        `
        SELECT
            pj.id AS assignment_id,
            pj.pertandingan_id,
            pj.user_id AS juri_id,
            u.full_name AS juri_name

        FROM pertandingan_juri pj

        INNER JOIN users u
            ON u.id = pj.user_id

        WHERE
            pj.pertandingan_id IN (${placeholders})
            AND pj.peran = 'utama'
            AND pj.aktif = 1

        ORDER BY
            pj.pertandingan_id ASC,
            pj.id ASC
        `,
        ids
    );

    // =========================================================
    // SCORE PER JURI + PESERTA + RONDE
    //
    // Contoh:
    //
    // juri 1 - peserta 1 - ronde 1 = 20
    // juri 1 - peserta 2 - ronde 1 = 15
    // juri 1 - peserta 1 - ronde 2 = 25
    // dst.
    // =========================================================
    const [scoreRows] = await pool.query(
        `
        SELECT
            pp.pertandingan_id,
            pp.juri_id,
            pp.peserta_id,
            pp.ronde,
            SUM(pp.poin) AS total

        FROM pertandingan_penilaian pp

        WHERE
            pp.pertandingan_id IN (${placeholders})

        GROUP BY
            pp.pertandingan_id,
            pp.juri_id,
            pp.peserta_id,
            pp.ronde

        ORDER BY
            pp.pertandingan_id ASC,
            pp.juri_id ASC,
            pp.ronde ASC
        `,
        ids
    );

    // =========================================================
    // MAP JURI
    // =========================================================
    const juriMap = new Map();

    for (const row of juriRows) {
        if (!juriMap.has(row.pertandingan_id)) {
            juriMap.set(row.pertandingan_id, []);
        }

        const list = juriMap.get(row.pertandingan_id);

        // Maksimal 3 juri utama
        if (list.length < TOTAL_MAIN_JUDGES) {
            list.push({
                id: row.juri_id,
                nama: row.juri_name,
                assignment_id: row.assignment_id,
            });
        }
    }

    // =========================================================
    // MAP SCORE
    //
    // KEY:
    // pertandingan-juri-peserta-ronde
    // =========================================================
    const scoreMap = new Map();

    for (const row of scoreRows) {
        scoreMap.set(
            `${row.pertandingan_id}-${row.juri_id}-${row.peserta_id}-${row.ronde}`,
            Number(row.total) || 0
        );
    }

    // =========================================================
    // FORMAT SCORE
    // =========================================================
    const getRoundScore = (
        pertandinganId,
        juriId,
        pesertaId,
        ronde
    ) => {
        const key =
            `${pertandinganId}-${juriId}-${pesertaId}-${ronde}`;

        // null = belum ada nilai
        if (!scoreMap.has(key)) {
            return null;
        }

        return scoreMap.get(key);
    };

    // =========================================================
    // FORMAT HASIL EXPORT
    // =========================================================
    const result = matches.map((match) => {
        const juri = (
            juriMap.get(match.id) || []
        ).slice(0, TOTAL_MAIN_JUDGES);

        const peserta1 = {
            id: match.peserta1_id,
            nama: match.peserta1_name,
            berat: match.peserta1_weight,
            regional: match.peserta1_regional,

            total: 0,

            ronde: {
                1: 0,
                2: 0,
                3: 0,
            },
        };

        const peserta2 = match.peserta2_id
            ? {
                id: match.peserta2_id,
                nama: match.peserta2_name,
                berat: match.peserta2_weight,
                regional: match.peserta2_regional,

                total: 0,

                ronde: {
                    1: 0,
                    2: 0,
                    3: 0,
                },
            }
            : null;

        // =====================================================
        // SCORE PER JURI
        // =====================================================
        const scorePerJuri = juri.map((item) => {
            const rounds = {};

            for (
                let ronde = 1;
                ronde <= TOTAL_ROUNDS;
                ronde++
            ) {
                const score1 = getRoundScore(
                    match.id,
                    item.id,
                    peserta1.id,
                    ronde
                );

                const score2 = peserta2
                    ? getRoundScore(
                        match.id,
                        item.id,
                        peserta2.id,
                        ronde
                    )
                    : null;

                rounds[ronde] = {
                    peserta1: score1,
                    peserta2: score2,
                };

                // Total per peserta
                if (score1 !== null) {
                    peserta1.ronde[ronde] += score1;
                    peserta1.total += score1;
                }

                if (
                    peserta2 &&
                    score2 !== null
                ) {
                    peserta2.ronde[ronde] += score2;
                    peserta2.total += score2;
                }
            }

            return {
                juri_id: item.id,
                juri: item.nama,
                rounds,
            };
        });

        // =====================================================
        // SELISIH
        // =====================================================
        const selisih =
            peserta1.total -
            (peserta2?.total || 0);

        return {
            id: match.id,
            babak: match.babak,
            status: match.status,
            winner_id: match.winner_id,

            ronde_aktif: match.ronde_aktif,
            total_ronde: match.total_ronde,

            durasi_ronde_menit:
                match.durasi_ronde_menit,

            waktu_mulai:
                match.waktu_mulai,

            waktu_selesai:
                match.waktu_selesai,

            alasan_selesai:
                match.alasan_selesai,

            peserta1,
            peserta2,

            juri,
            scorePerJuri,

            selisih,
        };
    });

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

    const placeholders =
        ids.map(() => "?").join(",");

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