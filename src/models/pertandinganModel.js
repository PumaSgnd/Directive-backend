const pool = require("../config/db");
const scoreboardModel = require("./scoreboardModel");

const NEXT_BABAK = {
    penyisihan: "enam_belas_besar",
    enam_belas_besar: "perempat_final",
    perempat_final: "semi_final",
    semi_final: "final",
    final: null,
};

const MIN_ROUND_SECONDS = 120;
const MAX_ROUND_SECONDS = 180;
const TOTAL_ROUNDS = 3;

const VALID_DURATIONS = [2, 3];

const VALID_END_REASONS = [
    "waktu_habis",
    "selisih_skor",
    "KO",
    "wasit_juri",
];

const normalizeDuration = (value) => {
    const duration = Number(value);

    if (!VALID_DURATIONS.includes(duration)) {
        throw new Error(
            "Durasi ronde hanya boleh 2 atau 3 menit."
        );
    }

    return duration;
};

const durationToEnum = (value) => {
    return String(normalizeDuration(value));
};

const durationToSeconds = (value) => {
    return normalizeDuration(value) * 60;
};

const getAllPertandingan = async (babak) => {
    const [rows] = await pool.query(
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

        WHERE (? IS NULL OR p.babak = ?)

        ORDER BY p.id ASC
        `,
        [
            babak || null,
            babak || null,
        ]
    );

    await attachJudges(rows);

    return rows;
};

const attachJudges = async (rows) => {
    if (!rows.length) return;

    const ids = rows.map((row) => row.id);

    const placeholders = ids
        .map(() => "?")
        .join(",");

    const [judges] = await pool.query(
        `
        SELECT
            pj.pertandingan_id,
            u.id,
            u.full_name,
            pj.peran,
            pj.aktif

        FROM pertandingan_juri pj

        INNER JOIN users u
            ON u.id = pj.user_id

        WHERE pj.pertandingan_id IN (${placeholders})

        ORDER BY
            pj.pertandingan_id,
            FIELD(pj.peran, 'utama', 'cadangan'),
            u.id
        `,
        ids
    );

    const map = new Map();

    for (const judge of judges) {
        if (!map.has(judge.pertandingan_id)) {
            map.set(judge.pertandingan_id, []);
        }

        map.get(judge.pertandingan_id).push(judge);
    }

    for (const row of rows) {
        row.juri = map.get(row.id) || [];
    }
};

const getRiwayatPertandingan = async (babak) => {
    const [rows] = await pool.query(
        `
        SELECT
            p.id,
            p.babak,
            p.status,
            p.winner_id,
            p.ronde_aktif,
            p.total_ronde,
            p.waktu_mulai,
            p.waktu_selesai,
            p.alasan_selesai,

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

        WHERE
            p.status = 'selesai'
            AND (? IS NULL OR p.babak = ?)

        ORDER BY p.waktu_selesai DESC
        `,
        [
            babak || null,
            babak || null,
        ]
    );

    return rows;
};

const getPertandinganById = async (id) => {
    const [[match]] = await pool.query(
        `
        SELECT
            p.*,

            p1.name AS peserta1_name,
            p1.weight AS peserta1_weight,
            p1.regional AS peserta1_regional,

            p2.name AS peserta2_name,
            p2.weight AS peserta2_weight,
            p2.regional AS peserta2_regional

        FROM pertandingan p

        INNER JOIN peserta p1
            ON p1.id = p.peserta1_id

        LEFT JOIN peserta p2
            ON p2.id = p.peserta2_id

        WHERE p.id = ?
        `,
        [id]
    );

    if (!match) {
        return null;
    }

    const [juri] = await pool.query(
        `
        SELECT
            u.id,
            u.full_name,
            pj.peran,
            pj.aktif

        FROM pertandingan_juri pj

        INNER JOIN users u
            ON u.id = pj.user_id

        WHERE pj.pertandingan_id = ?

        ORDER BY
            FIELD(pj.peran, 'utama', 'cadangan'),
            u.id
        `,
        [id]
    );

    match.juri = juri;

    return match;
};

const validateJudges = (utama, cadangan) => {
    if (
        !Array.isArray(utama) ||
        utama.length !== 3
    ) {
        throw new Error(
            "Harus ada tepat 3 juri utama."
        );
    }

    if (
        !Array.isArray(cadangan) ||
        cadangan.length !== 3
    ) {
        throw new Error(
            "Harus ada tepat 3 juri cadangan."
        );
    }

    const ids = [
        ...utama,
        ...cadangan,
    ].map(Number);

    if (
        ids.some(
            (id) =>
                !Number.isInteger(id) ||
                id <= 0
        )
    ) {
        throw new Error(
            "Data juri tidak valid."
        );
    }

    if (new Set(ids).size !== 6) {
        throw new Error(
            "6 juri harus berbeda."
        );
    }

    return ids;
};

const getAvailableJudge = async (
    conn,
    candidates,
    excluded = []
) => {
    for (const candidate of candidates) {
        const candidateId = Number(candidate);

        const [[busy]] = await conn.query(
            `
            SELECT
                pj.pertandingan_id

            FROM pertandingan_juri pj

            INNER JOIN pertandingan p
                ON p.id = pj.pertandingan_id

            WHERE
                pj.user_id = ?
                AND pj.peran = 'utama'
                AND pj.aktif = 1
                AND p.status IN ('berlangsung', 'pause')

            LIMIT 1
            `,
            [candidateId]
        );

        if (
            !busy &&
            !excluded.includes(candidateId)
        ) {
            return candidateId;
        }
    }

    return null;
};

const insertJudges = async (
    conn,
    pertandinganId,
    utama,
    cadangan
) => {
    const all = validateJudges(
        utama,
        cadangan
    );

    const selectedMain = [];

    const selectedReserve = cadangan.map(
        Number
    );

    for (const main of utama.map(Number)) {
        const available =
            await getAvailableJudge(
                conn,
                [main],
                [
                    ...selectedMain,
                    ...selectedReserve,
                ]
            );

        if (available) {
            selectedMain.push(available);
        } else {
            const replacement =
                await getAvailableJudge(
                    conn,
                    selectedReserve,
                    [...selectedMain]
                );

            if (!replacement) {
                throw new Error(
                    "Tidak tersedia juri cadangan untuk menggantikan juri utama yang sedang bertugas."
                );
            }

            selectedMain.push(
                replacement
            );

            const index =
                selectedReserve.indexOf(
                    replacement
                );

            if (index >= 0) {
                selectedReserve.splice(
                    index,
                    1
                );
            }
        }
    }

    const used = new Set(
        selectedMain
    );

    const remainingReserve =
        all.filter(
            (id) => !used.has(id)
        );

    if (remainingReserve.length < 3) {
        throw new Error(
            "Komposisi juri 3 utama + 3 cadangan tidak terpenuhi."
        );
    }

    for (const userId of selectedMain) {
        await conn.query(
            `
            INSERT INTO pertandingan_juri
            (
                pertandingan_id,
                user_id,
                peran,
                aktif
            )
            VALUES (?, ?, 'utama', 1)
            `,
            [
                pertandinganId,
                userId,
            ]
        );
    }

    for (
        const userId of remainingReserve.slice(0, 3)
    ) {
        await conn.query(
            `
            INSERT INTO pertandingan_juri
            (
                pertandingan_id,
                user_id,
                peran,
                aktif
            )
            VALUES (?, ?, 'cadangan', 1)
            `,
            [
                pertandinganId,
                userId,
            ]
        );
    }
};

const createPertandingan = async (
    babak,
    durasi_menit,
    peserta1_id,
    peserta2_id,
    juri_utama,
    juri_cadangan
) => {
    const duration =
        normalizeDuration(
            durasi_menit
        );

    const durationEnum =
        String(duration);

    const initialSeconds =
        duration * 60;

    if (
        Number(peserta1_id) ===
        Number(peserta2_id)
    ) {
        throw new Error(
            "Peserta tidak boleh sama."
        );
    }

    const conn =
        await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[p1]] =
            await conn.query(
                `
                SELECT id, weight
                FROM peserta
                WHERE id = ?
                `,
                [peserta1_id]
            );

        const [[p2]] =
            await conn.query(
                `
                SELECT id, weight
                FROM peserta
                WHERE id = ?
                `,
                [peserta2_id]
            );

        if (!p1 || !p2) {
            throw new Error(
                "Peserta tidak ditemukan."
            );
        }

        const [result] =
            await conn.query(
                `
                INSERT INTO pertandingan
                (
                    babak,
                    durasi_ronde_menit,
                    peserta1_id,
                    peserta2_id,
                    ronde_aktif,
                    total_ronde,
                    sisa_detik
                )
                VALUES (?, ?, ?, ?, 1, ?, ?)
                `,
                [
                    babak,
                    durationEnum,
                    peserta1_id,
                    peserta2_id,
                    TOTAL_ROUNDS,
                    initialSeconds,
                ]
            );

        await insertJudges(
            conn,
            result.insertId,
            juri_utama,
            juri_cadangan
        );

        await conn.commit();

        return result.insertId;

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const updatePertandingan = async (
    id,
    data
) => {
    const conn =
        await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[match]] =
            await conn.query(
                `
                SELECT *
                FROM pertandingan
                WHERE id = ?
                FOR UPDATE
                `,
                [id]
            );

        if (!match) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (
            match.status !==
            "belum_mulai"
        ) {
            throw new Error(
                "Pertandingan yang sudah dimulai tidak dapat diedit."
            );
        }

        const fields = [];
        const values = [];

        if (
            data.durasi_ronde_menit !==
            undefined
        ) {
            const duration =
                normalizeDuration(
                    data.durasi_ronde_menit
                );

            const durationEnum =
                String(duration);

            const initialSeconds =
                duration * 60;

            fields.push(
                "durasi_ronde_menit = ?"
            );

            values.push(
                durationEnum
            );

            fields.push(
                "sisa_detik = ?"
            );

            values.push(
                initialSeconds
            );
        }

        const allowed = [
            "babak",
            "peserta1_id",
            "peserta2_id",
            "status",
            "winner_id",
            "waktu_mulai",
            "waktu_selesai",
            "ronde_aktif",
            "sisa_detik",
            "alasan_selesai",
        ];

        for (const key of allowed) {
            if (
                data[key] !==
                undefined
            ) {
                fields.push(
                    `${key} = ?`
                );

                values.push(
                    data[key]
                );
            }
        }

        if (fields.length > 0) {
            values.push(id);

            await conn.query(
                `
                UPDATE pertandingan
                SET ${fields.join(", ")}
                WHERE id = ?
                `,
                values
            );
        }

        const hasJudgeUpdate =
            data.juri_utama !==
            undefined ||
            data.juri_cadangan !==
            undefined;

        if (hasJudgeUpdate) {
            if (
                !Array.isArray(
                    data.juri_utama
                ) ||
                data.juri_utama.length !==
                3
            ) {
                throw new Error(
                    "3 juri utama wajib dipilih."
                );
            }

            if (
                !Array.isArray(
                    data.juri_cadangan
                ) ||
                data.juri_cadangan.length !==
                3
            ) {
                throw new Error(
                    "3 juri cadangan wajib dipilih."
                );
            }

            const juriUtama =
                data.juri_utama.map(
                    Number
                );

            const juriCadangan =
                data.juri_cadangan.map(
                    Number
                );

            validateJudges(
                juriUtama,
                juriCadangan
            );

            const allJuri = [
                ...juriUtama,
                ...juriCadangan,
            ];

            const placeholders =
                allJuri
                    .map(() => "?")
                    .join(",");

            const [users] =
                await conn.query(
                    `
                    SELECT id
                    FROM users
                    WHERE
                        id IN (${placeholders})
                        AND role = 'juri'
                    `,
                    allJuri
                );

            if (
                users.length !==
                allJuri.length
            ) {
                throw new Error(
                    "Terdapat juri yang tidak valid."
                );
            }

            const [busyJudges] =
                await conn.query(
                    `
                    SELECT DISTINCT
                        pj.user_id

                    FROM pertandingan_juri pj

                    INNER JOIN pertandingan p
                        ON p.id =
                           pj.pertandingan_id

                    WHERE
                        pj.user_id IN (${placeholders})
                        AND pj.peran = 'utama'
                        AND pj.aktif = 1
                        AND p.id <> ?
                        AND p.status IN
                            ('berlangsung', 'pause')
                    `,
                    [
                        ...allJuri,
                        id,
                    ]
                );

            if (
                busyJudges.length > 0
            ) {
                throw new Error(
                    "Salah satu juri sedang menjadi juri utama pada pertandingan lain yang sedang berlangsung."
                );
            }

            await conn.query(
                `
                DELETE FROM pertandingan_juri
                WHERE pertandingan_id = ?
                `,
                [id]
            );

            for (
                const userId of juriUtama
            ) {
                await conn.query(
                    `
                    INSERT INTO pertandingan_juri
                    (
                        pertandingan_id,
                        user_id,
                        peran,
                        aktif
                    )
                    VALUES (?, ?, 'utama', 1)
                    `,
                    [
                        id,
                        userId,
                    ]
                );
            }

            for (
                const userId of juriCadangan
            ) {
                await conn.query(
                    `
                    INSERT INTO pertandingan_juri
                    (
                        pertandingan_id,
                        user_id,
                        peran,
                        aktif
                    )
                    VALUES (?, ?, 'cadangan', 1)
                    `,
                    [
                        id,
                        userId,
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

const deletePertandingan = async (
    id
) => {
    const [result] =
        await pool.query(
            `
            DELETE FROM pertandingan
            WHERE id = ?
            `,
            [id]
        );

    return result.affectedRows;
};

const startPertandingan = async (id) => {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[match]] = await conn.query(
            `
            SELECT *
            FROM pertandingan
            WHERE id = ?
            FOR UPDATE
            `,
            [id]
        );

        if (!match) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (match.status !== "belum_mulai") {
            throw new Error(
                "Pertandingan sudah dimulai."
            );
        }

        const duration = normalizeDuration(
            match.durasi_ronde_menit
        );

        const seconds = duration * 60;

        await conn.query(
            `
            UPDATE pertandingan
            SET
                status = 'berlangsung',
                waktu_mulai = COALESCE(
                    waktu_mulai,
                    NOW()
                ),
                ronde_aktif = 1,
                ronde_mulai_at = NOW(),
                sisa_detik = ?
            WHERE id = ?
            `,
            [
                seconds,
                id,
            ]
        );

        await conn.commit();

        return {
            ...match,
            status: "berlangsung",
            ronde_aktif: 1,
            ronde_mulai_at: new Date(),
            sisa_detik: seconds,
            durasi_ronde_menit: duration,
        };

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const pausePertandingan = async (
    id,
    sisa_detik
) => {
    const seconds = Number(sisa_detik);

    if (!Number.isInteger(seconds) || seconds < 0) {
        throw new Error(
            "sisa_detik tidak valid."
        );
    }

    const [[match]] = await pool.query(
        `
        SELECT
            status,
            sisa_detik,
            durasi_ronde_menit
        FROM pertandingan
        WHERE id = ?
        `,
        [id]
    );

    if (!match) {
        throw new Error(
            "Pertandingan tidak ditemukan."
        );
    }

    if (match.status !== "berlangsung") {
        throw new Error(
            "Pertandingan tidak sedang berlangsung."
        );
    }

    const maxSeconds =
        Number(match.durasi_ronde_menit) * 60;

    if (seconds > maxSeconds) {
        throw new Error(
            "Sisa waktu ronde melebihi durasi ronde."
        );
    }

    const [result] = await pool.query(
        `
        UPDATE pertandingan
        SET
            status = 'pause',
            sisa_detik = ?
        WHERE
            id = ?
            AND status = 'berlangsung'
        `,
        [
            seconds,
            id,
        ]
    );

    if (result.affectedRows === 0) {
        throw new Error(
            "Gagal melakukan pause pertandingan."
        );
    }

    return {
        sisa_detik: seconds,
    };
};

const resumePertandingan = async (id) => {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[match]] = await conn.query(
            `
            SELECT *
            FROM pertandingan
            WHERE id = ?
            FOR UPDATE
            `,
            [id]
        );

        if (!match) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (match.status !== "pause") {
            throw new Error(
                "Pertandingan tidak sedang pause."
            );
        }

        const remainingSeconds =
            Number(match.sisa_detik);

        if (
            !Number.isInteger(remainingSeconds) ||
            remainingSeconds <= 0
        ) {
            throw new Error(
                "Sisa waktu pertandingan tidak valid."
            );
        }

        const isNewRound =
            match.ronde_mulai_at === null;

        await conn.query(
            `
            UPDATE pertandingan
            SET
                status = 'berlangsung',
                ronde_mulai_at =
                    CASE
                        WHEN ronde_mulai_at IS NULL
                            THEN NOW()
                        ELSE ronde_mulai_at
                    END
            WHERE id = ?
            `,
            [id]
        );

        await conn.commit();

        return {
            ...match,
            status: "berlangsung",
            ronde_mulai_at:
                isNewRound
                    ? new Date()
                    : match.ronde_mulai_at,
            sisa_detik: remainingSeconds,
            durasi_ronde_menit:
                Number(match.durasi_ronde_menit),
            is_new_round: isNewRound,
        };

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const finishRonde = async (
    id,
    alasan,
    sisa_detik,
    winner_id
) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[match]] = await conn.query(
            `
            SELECT *
            FROM pertandingan
            WHERE id = ?
            FOR UPDATE
            `,
            [id]
        );

        if (!match) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (match.status !== "berlangsung") {
            throw new Error(
                "Pertandingan tidak sedang berlangsung."
            );
        }

        const remain =
            sisa_detik !== undefined &&
                sisa_detik !== null
                ? Number(sisa_detik)
                : Number(match.sisa_detik ?? 0);

        const roundDuration =
            Number(match.durasi_ronde_menit) * 60;

        const minRoundSeconds =
            MIN_ROUND_SECONDS;

        if (
            !Number.isInteger(remain) ||
            remain < 0 ||
            remain > roundDuration
        ) {
            throw new Error(
                "Sisa waktu ronde tidak valid."
            );
        }

        const elapsed =
            roundDuration - remain;

        if (
            elapsed < minRoundSeconds &&
            ![
                "KO",
                "selisih_skor",
                "wasit_juri",
            ].includes(alasan)
        ) {
            throw new Error(
                "Ronde tidak boleh selesai sebelum 2 menit kecuali karena penghentian khusus."
            );
        }

        const currentRound =
            Number(match.ronde_aktif);

        const totalRound =
            Number(match.total_ronde);

        if (currentRound < totalRound) {
            const nextRound =
                currentRound + 1;

            await conn.query(
                `
                UPDATE pertandingan
                SET
                    ronde_aktif = ?,
                    ronde_mulai_at = NULL,
                    sisa_detik = ?,
                    status = 'pause'
                WHERE id = ?
                `,
                [
                    nextRound,
                    roundDuration,
                    id,
                ]
            );
            await conn.commit();
            return {
                next_round: true,
                ronde_aktif: nextRound,
                status: "pause",
                ronde_mulai_at: null,
                sisa_detik: roundDuration,
                durasi_ronde_menit:
                    Number(match.durasi_ronde_menit),
            };
        }
        await conn.query(
            `
            UPDATE pertandingan
            SET
                status = 'selesai',
                sisa_detik = 0,
                waktu_selesai = NOW(),
                alasan_selesai = ?,
                winner_id = ?
            WHERE id = ?
            `,
            [
                alasan,
                winner_id ?? null,
                id,
            ]
        );
        await conn.commit();
        return {
            next_round: false,
            status: "selesai",
            sisa_detik: 0,
            winner_id: winner_id ?? null,
        };
    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const finishPertandingan = async (
    id,
    alasan = "waktu_habis"
) => {
    const conn =
        await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[match]] =
            await conn.query(
                `
                SELECT *
                FROM pertandingan
                WHERE id = ?
                FOR UPDATE
                `,
                [id]
            );

        if (!match) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (
            match.status === "selesai"
        ) {
            throw new Error(
                "Pertandingan sudah selesai."
            );
        }

        const winner =
            await scoreboardModel.getWinner(
                id
            );

        if (!winner) {
            throw new Error(
                "Pertandingan tidak ditemukan."
            );
        }

        if (!winner.winner_id) {
            throw new Error(
                "Skor seri. Pemenang belum dapat ditentukan."
            );
        }

        await conn.query(
            `
            UPDATE pertandingan

            SET
                status = 'selesai',
                winner_id = ?,
                waktu_selesai = NOW(),
                sisa_detik = 0,
                alasan_selesai = ?

            WHERE id = ?
            `,
            [
                winner.winner_id,
                alasan,
                id,
            ]
        );

        await conn.commit();

        await generateNextBabak(
            match.babak
        );

        return winner;

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const replaceJudge = async (
    pertandinganId,
    mainJudgeId,
    reserveJudgeId
) => {
    const conn =
        await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[main]] =
            await conn.query(
                `
                SELECT id
                FROM pertandingan_juri

                WHERE
                    pertandingan_id = ?
                    AND user_id = ?
                    AND peran = 'utama'
                    AND aktif = 1

                FOR UPDATE
                `,
                [
                    pertandinganId,
                    mainJudgeId,
                ]
            );

        if (!main) {
            throw new Error(
                "Juri utama tidak aktif pada pertandingan ini."
            );
        }

        const [[reserve]] =
            await conn.query(
                `
                SELECT id
                FROM pertandingan_juri

                WHERE
                    pertandingan_id = ?
                    AND user_id = ?
                    AND peran = 'cadangan'
                    AND aktif = 1

                FOR UPDATE
                `,
                [
                    pertandinganId,
                    reserveJudgeId,
                ]
            );

        if (!reserve) {
            throw new Error(
                "Juri cadangan tidak tersedia pada pertandingan ini."
            );
        }

        const [[busy]] =
            await conn.query(
                `
                SELECT
                    pj.pertandingan_id

                FROM pertandingan_juri pj

                INNER JOIN pertandingan p
                    ON p.id =
                       pj.pertandingan_id

                WHERE
                    pj.user_id = ?
                    AND pj.peran = 'utama'
                    AND pj.aktif = 1
                    AND p.id <> ?
                    AND p.status IN
                        ('berlangsung', 'pause')

                LIMIT 1
                `,
                [
                    reserveJudgeId,
                    pertandinganId,
                ]
            );

        if (busy) {
            throw new Error(
                "Juri cadangan sedang menjadi juri utama pada pertandingan lain."
            );
        }

        await conn.query(
            `
            UPDATE pertandingan_juri
            SET
                peran = 'cadangan',
                aktif = 1
            WHERE id = ?
            `,
            [main.id]
        );

        await conn.query(
            `
            UPDATE pertandingan_juri
            SET
                peran = 'utama',
                aktif = 1
            WHERE id = ?
            `,
            [reserve.id]
        );
        await conn.commit();

    } catch (err) {
        await conn.rollback();
        throw err;

    } finally {
        conn.release();
    }
};

const pairPesertaByWeight = (
    peserta
) => {
    if (
        !Array.isArray(peserta) ||
        !peserta.length
    ) {
        return {
            pairs: [],
            bye: null,
        };
    }

    const normalized =
        peserta.map((p) => ({
            id: Number(p.id),
            name: p.name,
            weight: Number(p.weight),
        }));

    if (
        normalized.some(
            (p) =>
                !Number.isFinite(
                    p.weight
                )
        )
    ) {
        throw new Error(
            "Berat badan peserta wajib tersedia untuk penentuan pasangan."
        );
    }

    normalized.sort(
        (a, b) =>
            a.weight - b.weight ||
            a.id - b.id
    );

    let bye = null;

    if (
        normalized.length % 2
    ) {
        bye =
            normalized.pop();
    }

    const pairs = [];

    while (normalized.length) {
        const a =
            normalized.shift();

        let best = 0;

        let diff =
            Math.abs(
                a.weight -
                normalized[0]
                    .weight
            );

        for (
            let i = 1;
            i < normalized.length;
            i++
        ) {
            const d =
                Math.abs(
                    a.weight -
                    normalized[i]
                        .weight
                );

            if (d < diff) {
                diff = d;
                best = i;
            }
        }

        const b =
            normalized.splice(
                best,
                1
            )[0];

        pairs.push({
            peserta1_id: a.id,
            peserta2_id: b.id,
            peserta1_weight:
                a.weight,
            peserta2_weight:
                b.weight,
            selisih_bb: diff,
        });
    }

    return {
        pairs,
        bye,
    };
};

const generateNextBabak = async (
    babak
) => {
    const next =
        NEXT_BABAK[babak];

    if (!next) {
        return;
    }

    const [[existing]] =
        await pool.query(
            `
            SELECT COUNT(*) total
            FROM pertandingan
            WHERE babak = ?
            `,
            [next]
        );

    if (
        Number(existing.total) > 0
    ) {
        return;
    }

    const [matches] =
        await pool.query(
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
            (m) =>
                m.status !==
                "selesai"
        )
    ) {
        return;
    }

    if (
        matches.some(
            (m) => !m.winner_id
        )
    ) {
        return;
    }

    const winnerIds =
        matches.map(
            (m) =>
                Number(
                    m.winner_id
                )
        );

    const placeholders =
        winnerIds
            .map(() => "?")
            .join(",");

    const [peserta] =
        await pool.query(
            `
            SELECT
                id,
                name,
                weight

            FROM peserta

            WHERE id IN
                (${placeholders})
            `,
            winnerIds
        );

    const {
        pairs,
        bye,
    } =
        pairPesertaByWeight(
            peserta
        );

    const conn =
        await pool.getConnection();

    try {
        await conn.beginTransaction();

        for (const pair of pairs) {
            await conn.query(
                `
                INSERT INTO pertandingan
                (
                    babak,
                    durasi_ronde_menit,
                    peserta1_id,
                    peserta2_id,
                    ronde_aktif,
                    total_ronde,
                    sisa_detik
                )

                VALUES
                (?, '2', ?, ?, 1, ?, 120)
                `,
                [
                    next,
                    pair.peserta1_id,
                    pair.peserta2_id,
                    TOTAL_ROUNDS,
                ]
            );
        }

        if (bye) {
            await conn.query(
                `
                INSERT INTO pertandingan
                (
                    babak,
                    durasi_ronde_menit,
                    peserta1_id,
                    peserta2_id,
                    status,
                    winner_id,
                    ronde_aktif,
                    total_ronde,
                    sisa_detik,
                    waktu_selesai,
                    alasan_selesai
                )

                VALUES
                (
                    ?,
                    '2',
                    ?,
                    ?,
                    'selesai',
                    ?,
                    ?,
                    ?,
                    0,
                    NOW(),
                    'bye'
                )
                `,
                [
                    next,
                    bye.id,
                    bye.id,
                    bye.id,
                    TOTAL_ROUNDS,
                    TOTAL_ROUNDS,
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
};

const updateTimer = async (
    id,
    sisa_detik
) => {
    const seconds =
        Number(sisa_detik);

    if (
        !Number.isInteger(seconds) ||
        seconds < 0 ||
        seconds > MAX_ROUND_SECONDS
    ) {
        throw new Error(
            "sisa_detik harus 0-180 detik."
        );
    }

    const [[match]] =
        await pool.query(
            `
            SELECT
                status,
                ronde_aktif

            FROM pertandingan

            WHERE id = ?
            `,
            [id]
        );

    if (!match) {
        throw new Error(
            "Pertandingan tidak ditemukan."
        );
    }

    if (
        match.status !==
        "berlangsung"
    ) {
        throw new Error(
            "Pertandingan belum berlangsung."
        );
    }

    const [result] =
        await pool.query(
            `
            UPDATE pertandingan

            SET sisa_detik = ?

            WHERE
                id = ?
                AND status = 'berlangsung'
            `,
            [
                seconds,
                id,
            ]
        );

    return result.affectedRows > 0;
};

module.exports = {
    MIN_ROUND_SECONDS,
    MAX_ROUND_SECONDS,
    TOTAL_ROUNDS,

    getAllPertandingan,
    getRiwayatPertandingan,
    getPertandinganById,

    createPertandingan,
    updatePertandingan,
    deletePertandingan,

    startPertandingan,
    pausePertandingan,
    resumePertandingan,

    finishRonde,
    finishPertandingan,

    replaceJudge,

    pairPesertaByWeight,
    generateNextBabak,

    updateTimer,
};