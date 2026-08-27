const pool = require("../config/db");

const getTotalScore = async (pertandinganId) => {
    const [rows] = await pool.query(
        `SELECT peserta_id, SUM(poin) AS total
         FROM pertandingan_penilaian
         WHERE pertandingan_id = ?
         GROUP BY peserta_id`,
        [pertandinganId]
    );
    return rows;
};

const getScorePerJuri = async (pertandinganId) => {
    const [rows] = await pool.query(
        `SELECT pp.juri_id, u.full_name, pj.peran, pj.aktif,
                pp.ronde, pp.peserta_id, SUM(pp.poin) AS total
         FROM pertandingan_penilaian pp
         INNER JOIN users u ON u.id = pp.juri_id
         LEFT JOIN pertandingan_juri pj
           ON pj.pertandingan_id = pp.pertandingan_id AND pj.user_id = pp.juri_id
         WHERE pp.pertandingan_id = ?
         GROUP BY pp.juri_id, u.full_name, pj.peran, pj.aktif, pp.ronde, pp.peserta_id
         ORDER BY pp.ronde ASC, pp.juri_id ASC`,
        [pertandinganId]
    );
    return rows;
};

const getScoreboard = async (pertandinganId) => {
    const [[match]] = await pool.query(
        `SELECT p.id, p.babak, p.status, p.winner_id,
                p.ronde_aktif, p.total_ronde, p.durasi_ronde_menit,
                p.sisa_detik, p.alasan_selesai,
                p1.id AS peserta1_id, p1.name AS peserta1_name, p1.regional AS peserta1_regional,
                p2.id AS peserta2_id, p2.name AS peserta2_name, p2.regional AS peserta2_regional
         FROM pertandingan p
         INNER JOIN peserta p1 ON p1.id = p.peserta1_id
         INNER JOIN peserta p2 ON p2.id = p.peserta2_id
         WHERE p.id = ?`,
        [pertandinganId]
    );
    if (!match) return null;

    const [juriRows] = await pool.query(
        `SELECT u.id, u.full_name, pj.peran, pj.aktif
         FROM pertandingan_juri pj
         INNER JOIN users u ON u.id = pj.user_id
         WHERE pj.pertandingan_id = ?
         ORDER BY FIELD(pj.peran, 'utama', 'cadangan'), u.id`,
        [pertandinganId]
    );

    const [scoreRows] = await pool.query(
        `SELECT juri_id, ronde, peserta_id, SUM(poin) AS total
         FROM pertandingan_penilaian
         WHERE pertandingan_id = ?
         GROUP BY juri_id, ronde, peserta_id`,
        [pertandinganId]
    );

    const map = new Map();
    const roundMap = new Map();
    for (const row of scoreRows) {
        map.set(`${row.juri_id}-${row.peserta_id}`, (map.get(`${row.juri_id}-${row.peserta_id}`) || 0) + Number(row.total));
        const key = `${row.ronde}-${row.peserta_id}`;
        roundMap.set(key, (roundMap.get(key) || 0) + Number(row.total));
    }

    const makeParticipant = (id, nama, regional) => ({
        id, nama, regional, total: 0, per_ronde: [], juri: []
    });

    const peserta1 = makeParticipant(match.peserta1_id, match.peserta1_name, match.peserta1_regional);
    const peserta2 = makeParticipant(match.peserta2_id, match.peserta2_name, match.peserta2_regional);

    for (const peserta of [peserta1, peserta2]) {
        for (let ronde = 1; ronde <= 3; ronde++) {
            const total = roundMap.get(`${ronde}-${peserta.id}`) || 0;
            peserta.per_ronde.push({ ronde, total });
            peserta.total += total;
        }
        for (const juri of juriRows) {
            peserta.juri.push({
                id: juri.id,
                nama: juri.full_name,
                peran: juri.peran,
                aktif: Boolean(juri.aktif),
                total: map.get(`${juri.id}-${peserta.id}`) || 0,
            });
        }
    }

    return {
        id: match.id,
        babak: match.babak,
        status: match.status,
        winner_id: match.winner_id,
        ronde_aktif: match.ronde_aktif,
        total_ronde: match.total_ronde,
        durasi_ronde_menit: Number(match.durasi_ronde_menit),
        sisa_detik: match.sisa_detik,
        alasan_selesai: match.alasan_selesai,
        peserta1,
        peserta2,
        juri: juriRows,
    };
};

const getWinner = async (pertandinganId) => {
    const scoreboard = await getScoreboard(pertandinganId);
    if (!scoreboard) return null;
    if (scoreboard.peserta1.total > scoreboard.peserta2.total) {
        return { winner_id: scoreboard.peserta1.id, total1: scoreboard.peserta1.total, total2: scoreboard.peserta2.total };
    }
    if (scoreboard.peserta2.total > scoreboard.peserta1.total) {
        return { winner_id: scoreboard.peserta2.id, total1: scoreboard.peserta1.total, total2: scoreboard.peserta2.total };
    }
    return { winner_id: null, total1: scoreboard.peserta1.total, total2: scoreboard.peserta2.total };
};

module.exports = { getTotalScore, getScorePerJuri, getScoreboard, getWinner };
