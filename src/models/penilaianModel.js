const pool = require("../config/db");

const POINT = {
    PUKULAN: 1,
    TENDANGAN: 2,
    JATUHAN: 3,
    TEGURAN1: -1,
    TEGURAN2: -2,
    PERINGATAN1: -5,
    PERINGATAN2: -10,
};

const getPertandinganForValidasi = async (pertandingan_id) => {

    const [rows] = await pool.query(
        `
        SELECT

            id,
            status,
            peserta1_id,
            peserta2_id

        FROM pertandingan
        WHERE id = ?
        `,
        [pertandingan_id]
    );

    return rows[0] || null;

};

const isJuriDitunjuk = async (pertandingan_id, juri_id) => {

    const [rows] = await pool.query(
        `
        SELECT 1
        FROM pertandingan_juri
        WHERE pertandingan_id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [pertandingan_id, juri_id]
    );

    return rows.length > 0;

};

const createPenilaian = async ({
    pertandingan_id,
    juri_id,
    peserta_id,
    jenis,
    keterangan = null,
}) => {

    if (!(jenis in POINT)) {
        throw new Error("Jenis penilaian tidak valid.");
    }

    const pertandingan = await getPertandinganForValidasi(
        pertandingan_id
    );

    if (!pertandingan) {
        throw new Error("Pertandingan tidak ditemukan.");
    }

    if (pertandingan.status !== "berlangsung") {
        throw new Error(
            "Penilaian hanya dapat diinput saat pertandingan berlangsung."
        );
    }

    const ditunjuk = await isJuriDitunjuk(
        pertandingan_id,
        juri_id
    );

    if (!ditunjuk) {
        throw new Error(
            "Juri tidak ditunjuk untuk pertandingan ini."
        );
    }

    if (
        Number(peserta_id) !== Number(pertandingan.peserta1_id) &&
        Number(peserta_id) !== Number(pertandingan.peserta2_id)
    ) {
        throw new Error(
            "Peserta tidak terdaftar pada pertandingan ini."
        );
    }

    const poin = POINT[jenis];

    const [result] = await pool.query(
        `
        INSERT INTO pertandingan_penilaian
        (
            pertandingan_id,
            juri_id,
            peserta_id,
            jenis,
            poin,
            keterangan
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )
        `,
        [
            pertandingan_id,
            juri_id,
            peserta_id,
            jenis,
            poin,
            keterangan,
        ]
    );

    return result.insertId;

};

const getHistoryPenilaian = async (pertandingan_id) => {

    const [rows] = await pool.query(
        `
        SELECT

            pp.id,
            pp.jenis,
            pp.poin,
            pp.keterangan,
            pp.created_at,

            u.id AS juri_id,
            u.full_name AS juri,

            ps.id AS peserta_id,
            ps.name AS peserta

        FROM pertandingan_penilaian pp

        INNER JOIN users u
            ON u.id = pp.juri_id

        INNER JOIN peserta ps
            ON ps.id = pp.peserta_id

        WHERE pp.pertandingan_id = ?

        ORDER BY pp.id ASC
        `,
        [pertandingan_id]
    );

    return rows;

};

const getLastPenilaian = async (
    pertandingan_id,
    juri_id
) => {

    const [rows] = await pool.query(
        `
        SELECT *
        FROM pertandingan_penilaian
        WHERE pertandingan_id = ?
        AND juri_id = ?
        ORDER BY id DESC
        LIMIT 1
        `,
        [
            pertandingan_id,
            juri_id
        ]
    );

    return rows[0] || null;

};

const undoPenilaian = async (
    pertandingan_id,
    juri_id
) => {

    const pertandingan = await getPertandinganForValidasi(
        pertandingan_id
    );

    if (!pertandingan) {
        throw new Error("Pertandingan tidak ditemukan.");
    }

    if (pertandingan.status !== "berlangsung") {
        throw new Error(
            "Undo hanya dapat dilakukan saat pertandingan berlangsung."
        );
    }

    // Catatan: idealnya juri_id diambil dari user yang sedang login
    // (req.user.id) bukan dari parameter URL, supaya seorang juri
    // tidak bisa meng-undo input juri lain. Validasi di bawah ini
    // hanya memastikan juri_id yang dikirim memang juri yang
    // ditunjuk untuk pertandingan tsb.
    const ditunjuk = await isJuriDitunjuk(
        pertandingan_id,
        juri_id
    );

    if (!ditunjuk) {
        throw new Error(
            "Juri tidak ditunjuk untuk pertandingan ini."
        );
    }

    const last = await getLastPenilaian(
        pertandingan_id,
        juri_id
    );

    if (!last) {
        return false;
    }

    const [result] = await pool.query(
        `
        DELETE
        FROM pertandingan_penilaian
        WHERE id = ?
        `,
        [last.id]
    );

    return result.affectedRows > 0;

};

const resetPenilaian = async (pertandingan_id) => {

    const [result] = await pool.query(
        `
        DELETE
        FROM pertandingan_penilaian
        WHERE pertandingan_id = ?
        `,
        [pertandingan_id]
    );

    return result.affectedRows;

};

module.exports = {
    POINT,
    createPenilaian,
    getHistoryPenilaian,
    getLastPenilaian,
    undoPenilaian,
    resetPenilaian,
    getPertandinganForValidasi,
    isJuriDitunjuk,
};