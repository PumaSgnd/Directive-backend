const PDFDocument = require("pdfkit");

// =============================================================
// LABEL BABAK
// =============================================================
const BABAK_LABEL = {
    penyisihan: "Penyisihan",
    enam_belas_besar: "16 Besar",
    perempat_final: "Perempat Final",
    semi_final: "Semi Final",
    final: "Final",
};

// =============================================================
// LABEL STATUS
// =============================================================
const STATUS_LABEL = {
    belum_mulai: "Belum Mulai",
    berlangsung: "Berlangsung",
    pause: "Berlangsung",
    selesai: "Selesai",
};

// =============================================================
// FORMAT BABAK
// =============================================================
const formatBabak = (value) =>
    BABAK_LABEL[value] ||
    String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
            char.toUpperCase()
        );

// =============================================================
// FORMAT STATUS
// =============================================================
const formatStatus = (value) =>
    STATUS_LABEL[value] ||
    String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
            char.toUpperCase()
        );

// =============================================================
// FORMAT DATE
// =============================================================
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

// =============================================================
// SANITIZE FILE NAME
// =============================================================
const sanitizeFileName = (value) =>
    String(value || "export")
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "-"
        )
        .replace(/\s+/g, "_");

// =============================================================
// HEADER PDF
// =============================================================
const drawHeader = (
    doc,
    title,
    subtitle
) => {
    doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(title, {
            align: "center",
        });

    doc
        .moveDown(0.25)
        .font("Helvetica")
        .fontSize(8)
        .text(subtitle, {
            align: "center",
        });

    doc.moveDown(0.8);
};

// =============================================================
// CEK SPACE
// =============================================================
const ensureSpace = (
    doc,
    height
) => {
    const bottom =
        doc.page.height -
        doc.page.margins.bottom;

    if (
        doc.y + height >
        bottom
    ) {
        doc.addPage();
        return true;
    }

    return false;
};

// =============================================================
// DRAW CELL
// =============================================================
const drawCell = (
    doc,
    x,
    y,
    width,
    height,
    text = "",
    options = {}
) => {
    const {
        font = "Helvetica",
        fontSize = 7,
        align = "center",
        valign = "center",
        padding = 3,
        ellipsis = false,
    } = options;

    doc
        .font(font)
        .fontSize(fontSize);

    doc
        .rect(
            x,
            y,
            width,
            height
        )
        .stroke();

    if (
        text === null ||
        text === undefined ||
        text === ""
    ) {
        return;
    }

    let textY = y + padding;

    if (valign === "center") {
        textY =
            y +
            (height -
                fontSize) /
            2 -
            1;
    }

    doc.text(
        String(text),
        x + padding,
        textY,
        {
            width:
                width -
                padding * 2,
            align,
            ellipsis,
            lineBreak: false,
        }
    );
};

// =============================================================
// DRAW MATCH
// =============================================================
const drawMatch = (
    doc,
    match,
    index
) => {
    const left =
        doc.page.margins.left;

    const availableWidth =
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right;

    const juriList =
        (
            match.scorePerJuri ||
            []
        ).slice(0, 3);

    // =========================================================
    // KONFIGURASI TABEL
    // =========================================================

    const titleHeight = 30;

    const header1Height = 20;
    const header2Height = 19;
    const rowHeight = 20;

    const tableHeaderHeight =
        header1Height +
        header2Height;

    const totalRows =
        Math.max(
            juriList.length,
            3
        );

    const tableHeight =
        tableHeaderHeight +
        totalRows *
        rowHeight;

    const estimatedHeight =
        titleHeight +
        tableHeight +
        35;

    ensureSpace(
        doc,
        estimatedHeight
    );

    // =========================================================
    // DATA PESERTA
    // =========================================================

    const peserta1 =
        match.peserta1 || {};

    const peserta2 =
        match.peserta2 || null;

    const peserta1Nama =
        peserta1.nama || "-";

    const peserta2Nama =
        peserta2?.nama || "-";

    const peserta1Regional =
        peserta1.regional || "-";

    const peserta2Regional =
        peserta2?.regional || "-";

    const peserta1Weight =
        peserta1.berat !==
            undefined &&
        peserta1.berat !== null
            ? `${peserta1.berat} Kg`
            : "-";

    const peserta2Weight =
        peserta2 &&
        peserta2.berat !==
            undefined &&
        peserta2.berat !== null
            ? `${peserta2.berat} Kg`
            : "-";

    // =========================================================
    // JUDUL PERTANDINGAN
    // =========================================================

    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
            `Pertandingan #${match.id} — ${formatBabak(
                match.babak
            )}`,
            left
        );

    doc
        .font("Helvetica")
        .fontSize(7)
        .text(
            `Status: ${formatStatus(
                match.status
            )}  |  Selesai: ${formatDate(
                match.waktu_selesai
            )}`,
            left
        );

    doc.moveDown(0.4);

    // =========================================================
    // LEBAR KOLOM
    //
    // Peserta
    // Regional
    // Weight
    // Juri
    // R1 P1/P2
    // R2 P1/P2
    // R3 P1/P2
    // Selisih
    // Total
    // =========================================================

    const pesertaWidth =
        availableWidth * 0.105;

    const regionalWidth =
        availableWidth * 0.145;

    const weightWidth =
        availableWidth * 0.075;

    const juriWidth =
        availableWidth * 0.105;

    const roundWidth =
        availableWidth * 0.31;

    const scoreWidth =
        roundWidth / 6;

    const selisihWidth =
        availableWidth * 0.085;

    const totalWidth =
        availableWidth -
        pesertaWidth -
        regionalWidth -
        weightWidth -
        juriWidth -
        roundWidth -
        selisihWidth;

    // =========================================================
    // X POSITION
    // =========================================================

    const xPeserta =
        left;

    const xRegional =
        xPeserta +
        pesertaWidth;

    const xWeight =
        xRegional +
        regionalWidth;

    const xJuri =
        xWeight +
        weightWidth;

    const xRound1 =
        xJuri +
        juriWidth;

    const xRound2 =
        xRound1 +
        scoreWidth * 2;

    const xRound3 =
        xRound2 +
        scoreWidth * 2;

    const xSelisih =
        xRound3 +
        scoreWidth * 2;

    const xTotal =
        xSelisih +
        selisihWidth;

    // =========================================================
    // TABLE Y
    // =========================================================

    const tableY =
        doc.y;

    // =========================================================
    // HEADER PESERTA
    // =========================================================

    drawCell(
        doc,
        xPeserta,
        tableY,
        pesertaWidth,
        tableHeaderHeight,
        "Peserta",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // HEADER REGIONAL
    // =========================================================

    drawCell(
        doc,
        xRegional,
        tableY,
        regionalWidth,
        tableHeaderHeight,
        "Regional",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // HEADER WEIGHT
    // =========================================================

    drawCell(
        doc,
        xWeight,
        tableY,
        weightWidth,
        tableHeaderHeight,
        "Weight",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // HEADER JURI
    // =========================================================

    drawCell(
        doc,
        xJuri,
        tableY,
        juriWidth,
        tableHeaderHeight,
        "Juri",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // HEADER ROUND 1
    // =========================================================

    drawCell(
        doc,
        xRound1,
        tableY,
        scoreWidth * 2,
        header1Height,
        "Round 1",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    drawCell(
        doc,
        xRound1,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 1",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    drawCell(
        doc,
        xRound1 +
        scoreWidth,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 2",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    // =========================================================
    // HEADER ROUND 2
    // =========================================================

    drawCell(
        doc,
        xRound2,
        tableY,
        scoreWidth * 2,
        header1Height,
        "Round 2",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    drawCell(
        doc,
        xRound2,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 1",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    drawCell(
        doc,
        xRound2 +
        scoreWidth,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 2",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    // =========================================================
    // HEADER ROUND 3
    // =========================================================

    drawCell(
        doc,
        xRound3,
        tableY,
        scoreWidth * 2,
        header1Height,
        "Round 3",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    drawCell(
        doc,
        xRound3,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 1",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    drawCell(
        doc,
        xRound3 +
        scoreWidth,
        tableY +
        header1Height,
        scoreWidth,
        header2Height,
        "Peserta 2",
        {
            font: "Helvetica-Bold",
            fontSize: 6.5,
        }
    );

    // =========================================================
    // HEADER SELISIH
    // =========================================================

    drawCell(
        doc,
        xSelisih,
        tableY,
        selisihWidth,
        tableHeaderHeight,
        "Selisih",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // HEADER TOTAL
    // =========================================================

    drawCell(
        doc,
        xTotal,
        tableY,
        totalWidth,
        tableHeaderHeight,
        "Total",
        {
            font: "Helvetica-Bold",
            fontSize: 7,
        }
    );

    // =========================================================
    // DATA JURI
    // =========================================================

    let currentY =
        tableY +
        tableHeaderHeight;

    for (
        let index = 0;
        index < totalRows;
        index++
    ) {
        const row =
            juriList[index];

        // =====================================================
        // PESERTA
        //
        // Baris 1 = Peserta 1
        // Baris 2 = Peserta 2
        // Baris 3 = kosong
        // =====================================================

        let namaPeserta = "";
        let regional = "";
        let weight = "";

        if (index === 0) {
            namaPeserta =
                peserta1Nama;

            regional =
                peserta1Regional;

            weight =
                peserta1Weight;
        } else if (index === 1) {
            namaPeserta =
                peserta2
                    ? peserta2Nama
                    : "";

            regional =
                peserta2
                    ? peserta2Regional
                    : "";

            weight =
                peserta2
                    ? peserta2Weight
                    : "";
        }

        drawCell(
            doc,
            xPeserta,
            currentY,
            pesertaWidth,
            rowHeight,
            namaPeserta,
            {
                font: "Helvetica",
                fontSize: 7,
                align: "left",
                ellipsis: true,
            }
        );

        drawCell(
            doc,
            xRegional,
            currentY,
            regionalWidth,
            rowHeight,
            regional,
            {
                font: "Helvetica",
                fontSize: 7,
                align: "left",
                ellipsis: true,
            }
        );

        drawCell(
            doc,
            xWeight,
            currentY,
            weightWidth,
            rowHeight,
            weight,
            {
                font: "Helvetica",
                fontSize: 7,
                align: "center",
                ellipsis: true,
            }
        );

        // =====================================================
        // JURI
        // =====================================================

        drawCell(
            doc,
            xJuri,
            currentY,
            juriWidth,
            rowHeight,
            row?.juri || "",
            {
                font: "Helvetica",
                fontSize: 7,
                align: "left",
                ellipsis: true,
            }
        );

        // =====================================================
        // ROUND 1
        // =====================================================

        const round1 =
            row?.rounds?.[1] || {};

        drawCell(
            doc,
            xRound1,
            currentY,
            scoreWidth,
            rowHeight,
            round1.peserta1 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        drawCell(
            doc,
            xRound1 +
            scoreWidth,
            currentY,
            scoreWidth,
            rowHeight,
            round1.peserta2 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        // =====================================================
        // ROUND 2
        // =====================================================

        const round2 =
            row?.rounds?.[2] || {};

        drawCell(
            doc,
            xRound2,
            currentY,
            scoreWidth,
            rowHeight,
            round2.peserta1 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        drawCell(
            doc,
            xRound2 +
            scoreWidth,
            currentY,
            scoreWidth,
            rowHeight,
            round2.peserta2 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        // =====================================================
        // ROUND 3
        // =====================================================

        const round3 =
            row?.rounds?.[3] || {};

        drawCell(
            doc,
            xRound3,
            currentY,
            scoreWidth,
            rowHeight,
            round3.peserta1 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        drawCell(
            doc,
            xRound3 +
            scoreWidth,
            currentY,
            scoreWidth,
            rowHeight,
            round3.peserta2 ??
            "",
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        // =====================================================
        // SELISIH
        //
        // Baris 1 = selisih P1
        // Baris 2 = selisih P2
        // Baris 3 = kosong
        // =====================================================

        let selisih = "";

        if (index === 0) {
            selisih =
                match.selisih;
        } else if (index === 1) {
            selisih =
                -match.selisih;
        }

        drawCell(
            doc,
            xSelisih,
            currentY,
            selisihWidth,
            rowHeight,
            selisih,
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        // =====================================================
        // TOTAL
        //
        // Baris 1 = total P1
        // Baris 2 = total P2
        // Baris 3 = kosong
        // =====================================================

        let total = "";

        if (index === 0) {
            total =
                peserta1.total;
        } else if (
            index === 1 &&
            peserta2
        ) {
            total =
                peserta2.total;
        }

        drawCell(
            doc,
            xTotal,
            currentY,
            totalWidth,
            rowHeight,
            total,
            {
                font: "Helvetica",
                fontSize: 7,
            }
        );

        currentY += rowHeight;
    }

    // =========================================================
    // PEMENANG
    // =========================================================

    doc.y =
        currentY + 7;

    if (match.winner_id) {
        let winnerName =
            "";

        if (
            Number(match.winner_id) ===
            Number(peserta1.id)
        ) {
            winnerName =
                peserta1Nama;
        } else if (
            peserta2 &&
            Number(match.winner_id) ===
            Number(peserta2.id)
        ) {
            winnerName =
                peserta2Nama;
        }

        if (winnerName) {
            doc
                .font("Helvetica-Bold")
                .fontSize(8)
                .text(
                    `Pemenang: ${winnerName}`,
                    left
                );
        }
    }

    doc.moveDown(1);
};

// =============================================================
// GENERATE PERTANDINGAN PDF
// =============================================================
const generatePertandinganPdf = ({
    matches,
    babak = "semua",
    status = "semua",
}) =>
    new Promise(
        (resolve, reject) => {
            const doc =
                new PDFDocument({
                    size: "A4",
                    layout: "landscape",

                    margins: {
                        top: 35,
                        bottom: 35,
                        left: 25,
                        right: 25,
                    },

                    info: {
                        Title:
                            "Laporan Pertandingan",
                        Author:
                            "Digital Scoring",
                    },
                });

            const chunks = [];

            doc.on(
                "data",
                (chunk) =>
                    chunks.push(chunk)
            );

            doc.on(
                "end",
                () =>
                    resolve(
                        Buffer.concat(
                            chunks
                        )
                    )
            );

            doc.on(
                "error",
                reject
            );

            drawHeader(
                doc,
                "LAPORAN PERTANDINGAN",
                `Babak: ${formatBabak(
                    babak
                )}  |  Status: ${formatStatus(
                    status
                )}`
            );

            if (!matches.length) {
                doc
                    .font("Helvetica")
                    .fontSize(10)
                    .text(
                        "Tidak ada data pertandingan sesuai filter.",
                        {
                            align: "center",
                        }
                    );

                doc.end();
                return;
            }

            matches.forEach(
                (match, index) => {
                    drawMatch(
                        doc,
                        match,
                        index
                    );
                }
            );

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
        }
    );

// =============================================================
// GENERATE BRACKET PDF
// =============================================================
const generateBracketPdf = ({
    matches,
}) =>
    new Promise(
        (resolve, reject) => {
            const doc =
                new PDFDocument({
                    size: "A3",
                    layout: "landscape",

                    margins: {
                        top: 35,
                        bottom: 35,
                        left: 30,
                        right: 30,
                    },

                    info: {
                        Title:
                            "Tournament Bracket",
                        Author:
                            "Digital Scoring",
                    },
                });

            const chunks = [];

            doc.on(
                "data",
                (chunk) =>
                    chunks.push(chunk)
            );

            doc.on(
                "end",
                () =>
                    resolve(
                        Buffer.concat(
                            chunks
                        )
                    )
            );

            doc.on(
                "error",
                reject
            );

            drawHeader(
                doc,
                "TOURNAMENT BRACKET",
                "Bagan keseluruhan pertandingan"
            );

            if (!matches.length) {
                doc
                    .font("Helvetica")
                    .fontSize(12)
                    .text(
                        "Belum ada pertandingan."
                    );

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

            const grouped =
                Object.fromEntries(
                    stages.map(
                        (stage) => [
                            stage,
                            matches.filter(
                                (match) =>
                                    match.babak ===
                                    stage
                            ),
                        ]
                    )
                );

            const availableWidth =
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right;

            const stageGap = 16;

            const stageWidth =
                (
                    availableWidth -
                    stageGap *
                    (stages.length - 1)
                ) /
                stages.length;
            // Atur tinggi card border
            const top = 100;
            const cardHeight = 52;

            stages.forEach(
                (
                    stage,
                    stageIndex
                ) => {
                    const stageMatches =
                        grouped[stage] ||
                        [];

                    const x =
                        doc.page.margins.left +
                        stageIndex *
                        (
                            stageWidth +
                            stageGap
                        );

                    doc
                        .font(
                            "Helvetica-Bold"
                        )
                        .fontSize(10)
                        .fillColor("#000000")
                        .text(
                            formatBabak(
                                stage
                            ),
                            x,
                            80, // Atur tinggi header
                            {
                                width:
                                    stageWidth,
                                align:
                                    "center",
                            }
                        );

                    if (
                        !stageMatches.length
                    ) {
                        doc
                            .font(
                                "Helvetica"
                            )
                            .fontSize(7)
                            .text(
                                "Belum ada pertandingan",
                                x,
                                top,
                                {
                                    width:
                                        stageWidth,
                                    align:
                                        "center",
                                }
                            );

                        return;
                    }

                    const spacing =
                        Math.max(
                            12,
                            Math.min(
                                15,
                                (
                                    doc.page.height -
                                    250
                                ) /
                                    stageMatches.length -
                                    cardHeight
                            )
                        );

                    stageMatches.forEach(
                        (
                            match,
                            matchIndex
                        ) => {
                            const y =
                                top +
                                matchIndex *
                                (
                                    cardHeight +
                                    spacing
                                );

                            doc
                                .roundedRect(
                                    x,
                                    y,
                                    stageWidth,
                                    cardHeight,
                                    5
                                )
                                .stroke();

                            const half =
                                cardHeight /
                                2;

                            const winner1 =
                                Number(
                                    match.winner_id
                                ) ===
                                Number(
                                    match
                                        .peserta1
                                        .id
                                );

                            const winner2 =
                                Number(
                                    match.winner_id
                                ) ===
                                Number(
                                    match
                                        .peserta2
                                        ?.id
                                );

                            doc
                                .fontSize(7);

                            doc.font(
                                winner1
                                    ? "Helvetica-Bold"
                                    : "Helvetica"
                            );

                            doc.text(
                                `${
                                    winner1
                                        ? "★ "
                                        : ""
                                }${
                                    match
                                        .peserta1
                                        .nama
                                }`,
                                x + 7,
                                y + 7,
                                {
                                    width:
                                        stageWidth *
                                        0.72,
                                    ellipsis:
                                        true,
                                }
                            );

                            doc.text(
                                String(
                                    match
                                        .peserta1
                                        .score ??
                                    0
                                ),
                                x +
                                    stageWidth *
                                    0.76,
                                y + 7,
                                {
                                    width:
                                        stageWidth *
                                        0.18,
                                    align:
                                        "right",
                                }
                            );

                            if (
                                match.peserta2
                            ) {
                                doc.font(
                                    winner2
                                        ? "Helvetica-Bold"
                                        : "Helvetica"
                                );

                                doc.text(
                                    `${
                                        winner2
                                            ? "★ "
                                            : ""
                                    }${
                                        match
                                            .peserta2
                                            .nama
                                    }`,
                                    x + 7,
                                    y +
                                        half +
                                        7,
                                    {
                                        width:
                                            stageWidth *
                                            0.72,
                                        ellipsis:
                                            true,
                                    }
                                );

                                doc.text(
                                    String(
                                        match
                                            .peserta2
                                            .score ??
                                        0
                                    ),
                                    x +
                                        stageWidth *
                                        0.76,
                                    y +
                                        half +
                                        7,
                                    {
                                        width:
                                            stageWidth *
                                            0.18,
                                        align:
                                            "right",
                                    }
                                );
                            } else {
                                doc
                                    .font(
                                        "Helvetica"
                                    )
                                    .fontSize(7)
                                    .text(
                                        "BYE",
                                        x + 7,
                                        y +
                                            half +
                                            7
                                    );
                            }

                            // Garis pembatas peserta
                            doc
                                .moveTo(
                                    x,
                                    y + half
                                )
                                .lineTo(
                                    x +
                                        stageWidth,
                                    y + half
                                )
                                .stroke();

                            // Konektor
                            if (
                                stageIndex <
                                stages.length -
                                    1
                            ) {
                                const nextX =
                                    x +
                                    stageWidth +
                                    stageGap;

                                const connectorY =
                                    y +
                                    cardHeight /
                                        2;

                                doc
                                    .moveTo(
                                        x +
                                            stageWidth,
                                        connectorY
                                    )
                                    .lineTo(
                                        nextX,
                                        connectorY
                                    )
                                    .stroke();
                            }
                        }
                    );
                }
            );

            const finalMatch =
                grouped.final?.[0] ||
                null;

            if (
                finalMatch?.winner_id
            ) {
                const winner =
                    Number(
                        finalMatch.winner_id
                    ) ===
                    Number(
                        finalMatch
                            .peserta1
                            .id
                    )
                        ? finalMatch.peserta1
                        : finalMatch.peserta2;

                if (winner) {
                    doc
                        .font(
                            "Helvetica-Bold"
                        )
                        .fontSize(12)
                        .text(
                            `JUARA: ${winner.nama}`,
                            {
                                align:
                                    "center",
                            }
                        );
                }
            }

            doc.end();
        }
    );

module.exports = {
    generatePertandinganPdf,
    generateBracketPdf,
    formatBabak,
    formatStatus,
    sanitizeFileName,
};