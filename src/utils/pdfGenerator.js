const PDFDocument = require("pdfkit");

const BABAK_LABEL = {
    penyisihan: "Penyisihan",
    enam_belas_besar: "16 Besar",
    perempat_final: "Perempat Final",
    semi_final: "Semi Final",
    final: "Final",
};

const STATUS_LABEL = {
    belum_mulai: "Belum Mulai",
    berlangsung: "Berlangsung",
    pause: "Berlangsung",
    selesai: "Selesai",
};

const formatBabak = (value) =>
    BABAK_LABEL[value] ||
    String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatStatus = (value) =>
    STATUS_LABEL[value] ||
    String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const sanitizeFileName = (value) =>
    String(value || "export")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, "_");

const drawHeader = (doc, title, subtitle) => {
    doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(title, {
            align: "center",
        });

    doc
        .moveDown(0.3)
        .font("Helvetica")
        .fontSize(9)
        .text(subtitle, {
            align: "center",
        });

    doc.moveDown(1);
};

const ensureSpace = (doc, height) => {
    const bottom = doc.page.height - doc.page.margins.bottom;

    if (doc.y + height > bottom) {
        doc.addPage();
        return true;
    }

    return false;
};

const drawLine = (doc, y, x1, x2) => {
    doc
        .moveTo(x1, y)
        .lineTo(x2, y)
        .stroke();
};

const drawMatch = (doc, match, index) => {
    const juriList = match.scorePerJuri || [];

    // =========================================================
    // 1 PERTANDINGAN = 1 TABEL
    // =========================================================

    const left = doc.page.margins.left;
    const width =
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right;

    // Tinggi yang dibutuhkan
    const titleHeight = 35;
    const headerHeight = 22;
    const subHeaderHeight = 22;
    const rowHeight = 21;

    const estimatedHeight =
        titleHeight +
        headerHeight +
        subHeaderHeight +
        (juriList.length * rowHeight) +
        35;

    ensureSpace(doc, estimatedHeight);

    // =========================================================
    // DATA PERTANDINGAN
    // =========================================================

    const peserta1 = match.peserta1 || {};
    const peserta2 = match.peserta2 || {};

    const peserta1Nama = peserta1.nama || "-";
    const peserta2Nama = peserta2.nama || "-";

    const peserta1Regional = peserta1.regional || "-";
    const peserta2Regional = peserta2.regional || "-";

    const peserta1Weight =
        peserta1.berat !== undefined && peserta1.berat !== null
            ? `${peserta1.berat} Kg`
            : "-";

    const peserta2Weight =
        peserta2.berat !== undefined && peserta2.berat !== null
            ? `${peserta2.berat} Kg`
            : "-";

    // =========================================================
    // JUDUL PERTANDINGAN
    // =========================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
            `Pertandingan #${match.id} — ${formatBabak(match.babak)}`,
            left
        );

    doc
        .font("Helvetica")
        .fontSize(8)
        .text(
            `Status: ${formatStatus(match.status)}    |    Selesai: ${formatDate(
                match.waktu_selesai
            )}`,
            left
        );

    doc.moveDown(0.5);

    // =========================================================
    // STRUKTUR KOLOM
    //
    // Peserta       16%
    // Regional      18%
    // Weight        11%
    // Score Juri    42%
    // Selisih        7%
    // Total          6%
    //
    // Score Juri kemudian dibagi menjadi:
    // Juri           45%
    // Score P1       27.5%
    // Score P2       27.5%
    // =========================================================

    const pesertaWidth = width * 0.14;
    const regionalWidth = width * 0.18;
    const weightWidth = width * 0.11;

    const scorePerJuriWidth = width * 0.42;

    const selisihWidth = width * 0.075;
    const totalWidth = width * 0.075;

    const juriWidth = scorePerJuriWidth * 0.40;
    const scoreP1Width = scorePerJuriWidth * 0.30;
    const scoreP2Width = scorePerJuriWidth * 0.30;

    // Posisi X
    const xPeserta = left;

    const xRegional =
        xPeserta + pesertaWidth;

    const xWeight =
        xRegional + regionalWidth;

    const xScoreJuri =
        xWeight + weightWidth;

    const xSelisih =
        xScoreJuri + scorePerJuriWidth;

    const xTotal =
        xSelisih + selisihWidth;

    // =========================================================
    // HEADER BARIS 1
    //
    // Peserta | Regional | Weight | SCORE PER JURI | Selisih | Total
    //                               └── colspan 3 ──┘
    // =========================================================

    let tableY = doc.y;

    doc
        .font("Helvetica-Bold")
        .fontSize(7);

    // Peserta
    doc
        .rect(
            xPeserta,
            tableY,
            pesertaWidth,
            headerHeight + subHeaderHeight
        )
        .stroke();

    doc.text(
        "Peserta",
        xPeserta,
        tableY + 14,
        {
            width: pesertaWidth,
            align: "center",
        }
    );

    // Regional
    doc
        .rect(
            xRegional,
            tableY,
            regionalWidth,
            headerHeight + subHeaderHeight
        )
        .stroke();

    doc.text(
        "Regional",
        xRegional,
        tableY + 14,
        {
            width: regionalWidth,
            align: "center",
        }
    );

    // Weight
    doc
        .rect(
            xWeight,
            tableY,
            weightWidth,
            headerHeight + subHeaderHeight
        )
        .stroke();

    doc.text(
        "Weight",
        xWeight,
        tableY + 14,
        {
            width: weightWidth,
            align: "center",
        }
    );

    // SCORE PER JURI - HEADER GABUNGAN
    doc
        .rect(
            xScoreJuri,
            tableY,
            scorePerJuriWidth,
            headerHeight
        )
        .stroke();

    doc.text(
        "SCORE PER JURI",
        xScoreJuri,
        tableY + 5,
        {
            width: scorePerJuriWidth,
            align: "center",
        }
    );

    // Selisih
    doc
        .rect(
            xSelisih,
            tableY,
            selisihWidth,
            headerHeight + subHeaderHeight
        )
        .stroke();

    doc.text(
        "Selisih",
        xSelisih,
        tableY + 14,
        {
            width: selisihWidth,
            align: "center",
        }
    );

    // Total
    doc
        .rect(
            xTotal,
            tableY,
            totalWidth,
            headerHeight + subHeaderHeight
        )
        .stroke();

    doc.text(
        "Total",
        xTotal,
        tableY + 14,
        {
            width: totalWidth,
            align: "center",
        }
    );

    // =========================================================
    // HEADER BARIS 2
    //
    // Di bawah SCORE PER JURI:
    // Juri | Score Peserta 1 | Score Peserta 2
    // =========================================================

    const subHeaderY = tableY + headerHeight;

    // Juri
    doc
        .rect(
            xScoreJuri,
            subHeaderY,
            juriWidth,
            subHeaderHeight
        )
        .stroke();

    doc.text(
        "Juri",
        xScoreJuri,
        subHeaderY + 6,
        {
            width: juriWidth,
            align: "center",
        }
    );

    // Score Peserta 1
    const xScoreP1 =
        xScoreJuri + juriWidth;

    doc
        .rect(
            xScoreP1,
            subHeaderY,
            scoreP1Width,
            subHeaderHeight
        )
        .stroke();

    doc.text(
        "Score Peserta 1",
        xScoreP1,
        subHeaderY + 6,
        {
            width: scoreP1Width,
            align: "center",
        }
    );

    // Score Peserta 2
    const xScoreP2 =
        xScoreP1 + scoreP1Width;

    doc
        .rect(
            xScoreP2,
            subHeaderY,
            scoreP2Width,
            subHeaderHeight
        )
        .stroke();

    doc.text(
        "Score Peserta 2",
        xScoreP2,
        subHeaderY + 6,
        {
            width: scoreP2Width,
            align: "center",
        }
    );

    // =========================================================
    // DATA JURI
    // =========================================================

    tableY =
        subHeaderY + subHeaderHeight;

    doc
        .font("Helvetica")
        .fontSize(7);

    juriList.forEach((row, juriIndex) => {
        const score1 =
            Number(row.peserta1_score || 0);

        const score2 =
            Number(row.peserta2_score || 0);

        // Selisih
        const selisih =
            score1 - score2;

        // Total
        // Mengikuti data total pertandingan.
        // Jika belum ada total, gunakan 0.
        const total =
            Number(
                juriIndex === 0
                    ? peserta1.total || 0
                    : 0
            );

        // -----------------------------------------------------
        // Peserta
        // -----------------------------------------------------

        doc
            .rect(
                xPeserta,
                tableY,
                pesertaWidth,
                rowHeight
            )
            .stroke();

        // Peserta 1 hanya di baris pertama
        // Peserta 2 di baris kedua
        // Baris ketiga dikosongkan.
        let namaPeserta = "";

        if (juriIndex === 0) {
            namaPeserta = peserta1Nama;
        } else if (juriIndex === 1) {
            namaPeserta = peserta2Nama;
        }

        if (namaPeserta) {
            doc.text(
                namaPeserta,
                xPeserta + 4,
                tableY + 6,
                {
                    width: pesertaWidth - 8,
                    align: "left",
                    ellipsis: true,
                }
            );
        }

        // -----------------------------------------------------
        // Regional
        // -----------------------------------------------------

        doc
            .rect(
                xRegional,
                tableY,
                regionalWidth,
                rowHeight
            )
            .stroke();

        let regional = "";

        if (juriIndex === 0) {
            regional = peserta1Regional;
        } else if (juriIndex === 1) {
            regional = peserta2Regional;
        }

        if (regional) {
            doc.text(
                regional,
                xRegional + 4,
                tableY + 6,
                {
                    width: regionalWidth - 8,
                    align: "left",
                    ellipsis: true,
                }
            );
        }

        // -----------------------------------------------------
        // Weight
        // -----------------------------------------------------

        doc
            .rect(
                xWeight,
                tableY,
                weightWidth,
                rowHeight
            )
            .stroke();

        let weight = "";

        if (juriIndex === 0) {
            weight = peserta1Weight;
        } else if (juriIndex === 1) {
            weight = peserta2Weight;
        }

        if (weight) {
            doc.text(
                weight,
                xWeight + 3,
                tableY + 6,
                {
                    width: weightWidth - 6,
                    align: "center",
                    ellipsis: true,
                }
            );
        }

        // -----------------------------------------------------
        // Nama Juri
        // -----------------------------------------------------

        doc
            .rect(
                xScoreJuri,
                tableY,
                juriWidth,
                rowHeight
            )
            .stroke();

        doc.text(
            row.juri || "-",
            xScoreJuri + 4,
            tableY + 6,
            {
                width: juriWidth - 8,
                align: "left",
                ellipsis: true,
            }
        );

        // -----------------------------------------------------
        // Score Peserta 1
        // -----------------------------------------------------

        doc
            .rect(
                xScoreP1,
                tableY,
                scoreP1Width,
                rowHeight
            )
            .stroke();

        doc.text(
            String(score1),
            xScoreP1,
            tableY + 6,
            {
                width: scoreP1Width,
                align: "center",
            }
        );

        // -----------------------------------------------------
        // Score Peserta 2
        // -----------------------------------------------------

        doc
            .rect(
                xScoreP2,
                tableY,
                scoreP2Width,
                rowHeight
            )
            .stroke();

        doc.text(
            String(score2),
            xScoreP2,
            tableY + 6,
            {
                width: scoreP2Width,
                align: "center",
            }
        );

        // -----------------------------------------------------
        // Selisih
        // -----------------------------------------------------

        doc
            .rect(
                xSelisih,
                tableY,
                selisihWidth,
                rowHeight
            )
            .stroke();

        doc.text(
            String(selisih),
            xSelisih,
            tableY + 6,
            {
                width: selisihWidth,
                align: "center",
            }
        );

        // -----------------------------------------------------
        // Total
        // -----------------------------------------------------

        doc
            .rect(
                xTotal,
                tableY,
                totalWidth,
                rowHeight
            )
            .stroke();

        doc.text(
            String(total),
            xTotal,
            tableY + 6,
            {
                width: totalWidth,
                align: "center",
            }
        );

        tableY += rowHeight;
    });

    // =========================================================
    // PEMENANG
    // =========================================================

    doc.y = tableY + 8;

    if (match.winner_id) {
        const winnerName =
            Number(match.winner_id) ===
                Number(peserta1.id)
                ? peserta1Nama
                : peserta2Nama;

        doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(
                `Pemenang: ${winnerName}`,
                left
            );
    }

    // Jarak sebelum pertandingan berikutnya
    doc.moveDown(1.2);
};

const generatePertandinganPdf = ({
    matches,
    babak = "semua",
    status = "semua",
}) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            layout: "portrait",
            margins: {
                top: 40,
                bottom: 40,
                left: 42,
                right: 42,
            },
            info: {
                Title: "Laporan Pertandingan",
                Author: "Digital Scoring",
            },
        });

        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        drawHeader(
            doc,
            "LAPORAN PERTANDINGAN",
            `Babak: ${formatBabak(
                babak
            )}  |  Status: ${formatStatus(status)}`
        );

        if (!matches.length) {
            doc
                .font("Helvetica")
                .fontSize(10)
                .text(
                    "Tidak ada data pertandingan sesuai filter."
                );

            doc.end();
            return;
        }

        matches.forEach((match, index) => {
            drawMatch(doc, match, index);
        });

        doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#666666")
            .text(
                `Total pertandingan: ${matches.length}`,
                doc.page.margins.left,
                doc.y,
                {
                    width:
                        doc.page.width -
                        doc.page.margins.left -
                        doc.page.margins.right,
                    align: "right",
                    lineBreak: false,
                }
            );

        doc.end();
    });

/**
 * Bracket horizontal.
 *
 * Penyisihan ditampilkan sebagai kolom kiri.
 * Babak berikutnya ditempatkan berurutan ke kanan.
 *
 * Karena jumlah pertandingan penyisihan dapat sangat banyak,
 * ukuran A3 landscape dipakai agar bracket lebih mudah dibaca.
 */
const generateBracketPdf = ({ matches }) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A3",
            layout: "landscape",
            margins: {
                top: 35,
                bottom: 35,
                left: 30,
                right: 30,
            },
            info: {
                Title: "Tournament Bracket",
                Author: "Digital Scoring",
            },
        });

        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        drawHeader(
            doc,
            "TOURNAMENT BRACKET",
            "Bagan keseluruhan pertandingan"
        );

        if (!matches.length) {
            doc
                .font("Helvetica")
                .fontSize(12)
                .text("Belum ada pertandingan.");

            doc.end();
            return;
        }

        const stages = [
            "penyisihan",
            "enam_belas_besar",
            "perempat_final",
            "semi_final",
            "final",
        ];

        const grouped = Object.fromEntries(
            stages.map((stage) => [
                stage,
                matches.filter(
                    (match) => match.babak === stage
                ),
            ])
        );

        const availableWidth =
            doc.page.width -
            doc.page.margins.left -
            doc.page.margins.right;

        const stageGap = 16;
        const stageWidth =
            (availableWidth -
                stageGap * (stages.length - 1)) /
            stages.length;

        const top = 90;
        const cardHeight = 52;

        stages.forEach((stage, stageIndex) => {
            const stageMatches = grouped[stage] || [];
            const x =
                doc.page.margins.left +
                stageIndex * (stageWidth + stageGap);

            doc
                .font("Helvetica-Bold")
                .fontSize(10)
                .text(formatBabak(stage), x, 62, {
                    width: stageWidth,
                    align: "center",
                });

            if (!stageMatches.length) {
                doc
                    .font("Helvetica")
                    .fontSize(7)
                    .text(
                        "Belum ada pertandingan",
                        x,
                        top,
                        {
                            width: stageWidth,
                            align: "center",
                        }
                    );
                return;
            }

            const spacing = Math.max(
                12,
                Math.min(
                    45,
                    (doc.page.height - 150) /
                    stageMatches.length -
                    cardHeight
                )
            );

            stageMatches.forEach((match, matchIndex) => {
                const y =
                    top +
                    matchIndex *
                    (cardHeight + spacing);

                doc
                    .roundedRect(
                        x,
                        y,
                        stageWidth,
                        cardHeight,
                        5
                    )
                    .stroke();

                const half = cardHeight / 2;

                const winner1 =
                    Number(match.winner_id) ===
                    Number(match.peserta1.id);

                const winner2 =
                    Number(match.winner_id) ===
                    Number(match.peserta2?.id);

                doc.fontSize(7);

                if (winner1) {
                    doc.font("Helvetica-Bold");
                } else {
                    doc.font("Helvetica");
                }

                doc.text(
                    `${winner1 ? "★ " : ""}${match.peserta1.nama
                    }`,
                    x + 7,
                    y + 7,
                    {
                        width: stageWidth * 0.72,
                        ellipsis: true,
                    }
                );

                doc.text(
                    String(match.peserta1.score ?? 0),
                    x + stageWidth * 0.76,
                    y + 7,
                    {
                        width: stageWidth * 0.18,
                        align: "right",
                    }
                );

                if (match.peserta2) {
                    if (winner2) {
                        doc.font("Helvetica-Bold");
                    } else {
                        doc.font("Helvetica");
                    }

                    doc.text(
                        `${winner2 ? "★ " : ""}${match.peserta2.nama
                        }`,
                        x + 7,
                        y + half + 3,
                        {
                            width: stageWidth * 0.72,
                            ellipsis: true,
                        }
                    );

                    doc.text(
                        String(
                            match.peserta2.score ?? 0
                        ),
                        x + stageWidth * 0.76,
                        y + half + 3,
                        {
                            width: stageWidth * 0.18,
                            align: "right",
                        }
                    );
                } else {
                    doc
                        .font("Helvetica")
                        .fontSize(7)
                        .text(
                            "BYE",
                            x + 7,
                            y + half + 3
                        );
                }

                // garis pembatas peserta dalam card
                doc
                    .moveTo(x, y + half)
                    .lineTo(x + stageWidth, y + half)
                    .stroke();

                // konektor antar kolom.
                if (stageIndex < stages.length - 1) {
                    const nextX =
                        x +
                        stageWidth +
                        stageGap;

                    const connectorY =
                        y + cardHeight / 2;

                    doc
                        .moveTo(
                            x + stageWidth,
                            connectorY
                        )
                        .lineTo(
                            nextX,
                            connectorY
                        )
                        .stroke();
                }
            });
        });

        const finalMatch =
            grouped.final?.[0] || null;

        if (finalMatch?.winner_id) {
            const winner =
                Number(finalMatch.winner_id) ===
                    Number(finalMatch.peserta1.id)
                    ? finalMatch.peserta1
                    : finalMatch.peserta2;

            if (winner) {
                doc
                    .font("Helvetica-Bold")
                    .fontSize(12)
                    .text(
                        `JUARA: ${winner.nama}`,
                        {
                            align: "center",
                        }
                    );
            }
        }

        doc.end();
    });

module.exports = {
    generatePertandinganPdf,
    generateBracketPdf,
    formatBabak,
    formatStatus,
    sanitizeFileName,
};
