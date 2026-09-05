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
        .replace(/\b\w/g, (char) =>
            char.toUpperCase()
        );

const formatStatus = (value) =>
    STATUS_LABEL[value] ||
    String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
            char.toUpperCase()
        );

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
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "-"
        )
        .replace(/\s+/g, "_");

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

    const formatRegional = (value) =>
        String(value || "-")
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());

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

    const peserta1 =
        match.peserta1 || {};

    const peserta2 =
        match.peserta2 || null;

    const peserta1Nama =
        peserta1.nama || "-";

    const peserta2Nama =
        peserta2?.nama || "-";

    const peserta1Regional = formatRegional(peserta1.regional);
    const peserta2Regional = formatRegional(peserta2?.regional);

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

    const tableY =
        doc.y;

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

const generateBracketPdf = ({ matches = [] }) =>
    new Promise((resolve, reject) => {
        try {
            const PDFDocument = require("pdfkit");

            const doc = new PDFDocument({
                size: "A3",
                layout: "landscape",
                margins: {
                    top: 25,
                    bottom: 25,
                    left: 25,
                    right: 25,
                },
                info: {
                    Title: "Tournament Bracket",
                    Author: "Digital Scoring",
                },
            });

            const chunks = [];

            doc.on("data", (chunk) => {
                chunks.push(chunk);
            });

            doc.on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            doc.on("error", reject);

            const stages = {
                penyisihan: [],
                enam_belas_besar: [],
                perempat_final: [],
                semi_final: [],
                final: [],
                bronze_final: [],
            };

            matches.forEach((match) => {
                if (stages[match.babak]) {
                    stages[match.babak].push(match);
                }
            });

            Object.values(stages).forEach((stage) => {
                stage.sort(
                    (a, b) =>
                        Number(a.id) -
                        Number(b.id)
                );
            });

            const penyisihan =
                stages.penyisihan;

            const enamBelasBesar =
                stages.enam_belas_besar;

            const perempatFinal =
                stages.perempat_final;

            const semiFinal =
                stages.semi_final;

            const finalMatches =
                stages.final;

            const bronzeFinal =
                stages.bronze_final;

            const pageWidth =
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right;

            const pageHeight =
                doc.page.height -
                doc.page.margins.top -
                doc.page.margins.bottom;

            const startX =
                doc.page.margins.left;

            doc
                .font("Helvetica-Bold")
                .fontSize(22)
                .fillColor("#000000")
                .text(
                    "TOURNAMENT BRACKET",
                    startX,
                    25,
                    {
                        width: pageWidth,
                        align: "center",
                    }
                );

            const columnGap = 12;

            const columnWidth =
                (
                    pageWidth -
                    columnGap * 8
                ) / 9;

            const columnX = [];

            for (let i = 0; i < 9; i++) {
                columnX.push(
                    startX +
                    i *
                    (
                        columnWidth +
                        columnGap
                    )
                );
            }

            const headers = [
                "PENYISIHAN",
                "16 BESAR",
                "PEREMPAT FINAL",
                "SEMI FINAL",
                "",
                "SEMI FINAL",
                "PEREMPAT FINAL",
                "16 BESAR",
                "PENYISIHAN",
            ];

            const headerY = 65;

            headers.forEach(
                (header, index) => {
                    if (!header) {
                        return;
                    }

                    doc
                        .font("Helvetica-Bold")
                        .fontSize(8)
                        .fillColor("#000000")
                        .text(
                            header,
                            columnX[index],
                            headerY,
                            {
                                width:
                                    columnWidth,
                                align: "center",
                                lineBreak: false,
                            }
                        );
                }
            );

            const cardHeight = 42;

            const rowHeight =
                cardHeight / 2;

            const bracketTop = 100;

            const bracketBottom =
                pageHeight - 15;

            const bracketHeight =
                bracketBottom -
                bracketTop;

            const firstRoundPositions = (
                count
            ) => {
                if (!count) {
                    return [];
                }

                const slotHeight =
                    bracketHeight /
                    count;

                return Array.from(
                    {
                        length: count,
                    },
                    (_, index) =>
                        bracketTop +
                        index *
                        slotHeight +
                        (
                            slotHeight -
                            cardHeight
                        ) /
                        2
                );
            };

            const leftPositions = [];

            leftPositions[0] =
                firstRoundPositions(
                    8
                );

            leftPositions[1] = [];
            leftPositions[2] = [];
            leftPositions[3] = [];

            const calculateNextPositions = (
                previousPositions,
                count
            ) => {
                const result = [];

                for (
                    let i = 0;
                    i < count;
                    i++
                ) {
                    const first =
                        previousPositions[
                        i * 2
                        ];

                    const second =
                        previousPositions[
                        i * 2 + 1
                        ];

                    if (
                        first !==
                        undefined &&
                        second !==
                        undefined
                    ) {
                        result.push(
                            (
                                first +
                                second
                            ) /
                            2
                        );
                    }
                }

                return result;
            };

            leftPositions[1] =
                calculateNextPositions(
                    leftPositions[0],
                    4
                );

            leftPositions[2] =
                calculateNextPositions(
                    leftPositions[1],
                    2
                );

            leftPositions[3] =
                calculateNextPositions(
                    leftPositions[2],
                    1
                );

            const rightPositions = [];

            rightPositions[0] =
                firstRoundPositions(
                    8
                );

            rightPositions[1] =
                calculateNextPositions(
                    rightPositions[0],
                    4
                );

            rightPositions[2] =
                calculateNextPositions(
                    rightPositions[1],
                    2
                );

            rightPositions[3] =
                calculateNextPositions(
                    rightPositions[2],
                    1
                );

            const semiCenter =
                leftPositions[3][0] +
                cardHeight / 2;

            const finalY =
                semiCenter -
                cardHeight -
                25;

            const bronzeY =
                semiCenter +
                25;

            // =====================================================
            // DRAW PARTICIPANT
            // =====================================================

            const drawParticipant = ({
                x,
                y,
                width,
                height,
                peserta,
                winner,
            }) => {
                if (!peserta) {
                    return;
                }

                const name =
                    peserta.nama ||
                    peserta.name ||
                    "-";

                const score =
                    peserta.score ??
                    "";

                doc
                    .font(
                        winner
                            ? "Helvetica-Bold"
                            : "Helvetica"
                    )
                    .fontSize(8)
                    .fillColor("#000000");

                doc.text(
                    name,
                    x + 7,
                    y + 5,
                    {
                        width:
                            width * 0.70,
                        height:
                            height - 5,
                        ellipsis: true,
                        lineBreak: false,
                    }
                );

                doc.text(
                    String(score),
                    x +
                    width * 0.78,
                    y + 5,
                    {
                        width:
                            width * 0.15,
                        align: "right",
                        lineBreak: false,
                    }
                );
            };

            // =====================================================
            // DRAW MATCH CARD
            // =====================================================

            const drawMatchCard = (
                match,
                x,
                y
            ) => {
                if (!match) {
                    return;
                }

                const peserta1 =
                    match.peserta1 ||
                    null;

                const peserta2 =
                    match.peserta2 ||
                    null;

                const winnerId =
                    match.winner_id !==
                        null &&
                        match.winner_id !==
                        undefined
                        ? Number(
                            match.winner_id
                        )
                        : null;

                const winner1 =
                    winnerId !== null &&
                    peserta1 &&
                    Number(
                        peserta1.id
                    ) === winnerId;

                const winner2 =
                    winnerId !== null &&
                    peserta2 &&
                    Number(
                        peserta2.id
                    ) === winnerId;

                doc
                    .lineWidth(0.6)
                    .roundedRect(
                        x,
                        y,
                        columnWidth,
                        cardHeight,
                        4
                    )
                    .stroke();

                doc
                    .lineWidth(0.4)
                    .moveTo(
                        x,
                        y + rowHeight
                    )
                    .lineTo(
                        x +
                        columnWidth,
                        y + rowHeight
                    )
                    .stroke();

                drawParticipant({
                    x,
                    y,
                    width: columnWidth,
                    height: rowHeight,
                    peserta: peserta1,
                    winner: winner1,
                });

                drawParticipant({
                    x,
                    y:
                        y + rowHeight,
                    width: columnWidth,
                    height: rowHeight,
                    peserta: peserta2,
                    winner: winner2,
                });
            };

            const drawLeftStage = (
                stage,
                matches,
                positions
            ) => {
                matches.forEach(
                    (match, index) => {
                        if (
                            positions[
                            index
                            ] === undefined
                        ) {
                            return;
                        }

                        drawMatchCard(
                            match,
                            columnX[
                            stage
                            ],
                            positions[
                            index
                            ]
                        );
                    }
                );
            };

            drawLeftStage(
                0,
                penyisihan.slice(0, 8),
                leftPositions[0]
            );

            drawLeftStage(
                1,
                enamBelasBesar.slice(
                    0,
                    4
                ),
                leftPositions[1]
            );

            drawLeftStage(
                2,
                perempatFinal.slice(
                    0,
                    2
                ),
                leftPositions[2]
            );

            drawLeftStage(
                3,
                semiFinal.slice(
                    0,
                    1
                ),
                leftPositions[3]
            );

            const drawRightStage = (
                stage,
                matches,
                positions
            ) => {
                matches.forEach(
                    (match, index) => {
                        if (
                            positions[
                            index
                            ] === undefined
                        ) {
                            return;
                        }

                        drawMatchCard(
                            match,
                            columnX[
                            stage
                            ],
                            positions[
                            index
                            ]
                        );
                    }
                );
            };

            drawRightStage(
                8,
                penyisihan
                    .slice(8, 16)
                    .reverse(),
                rightPositions[0]
            );

            drawRightStage(
                7,
                enamBelasBesar
                    .slice(4, 8)
                    .reverse(),
                rightPositions[1]
            );

            drawRightStage(
                6,
                perempatFinal
                    .slice(2, 4)
                    .reverse(),
                rightPositions[2]
            );

            drawRightStage(
                5,
                semiFinal
                    .slice(1, 2)
                    .reverse(),
                rightPositions[3]
            );

            if (finalMatches.length > 0) {
                drawMatchCard(
                    finalMatches[0],
                    columnX[4],
                    finalY
                );
            }

            if (bronzeFinal.length > 0) {
                drawMatchCard(
                    bronzeFinal[0],
                    columnX[4],
                    bronzeY
                );
            }

            const drawLine = (
                x1,
                y1,
                x2,
                y2
            ) => {
                doc
                    .lineWidth(0.6)
                    .moveTo(x1, y1)
                    .lineTo(x2, y2)
                    .stroke();
            };

            const connectLeft = (
                fromPositions,
                toPositions,
                fromColumn,
                toColumn
            ) => {
                for (
                    let i = 0;
                    i < toPositions.length;
                    i++
                ) {
                    const first =
                        fromPositions[
                        i * 2
                        ];

                    const second =
                        fromPositions[
                        i * 2 + 1
                        ];

                    const target =
                        toPositions[i];

                    if (
                        first ===
                        undefined ||
                        second ===
                        undefined ||
                        target ===
                        undefined
                    ) {
                        continue;
                    }

                    const fromX =
                        columnX[
                        fromColumn
                        ] +
                        columnWidth;

                    const toX =
                        columnX[
                        toColumn
                        ];

                    const middleX =
                        (
                            fromX +
                            toX
                        ) / 2;

                    const firstY =
                        first +
                        cardHeight / 2;

                    const secondY =
                        second +
                        cardHeight / 2;

                    const targetY =
                        target +
                        cardHeight / 2;

                    drawLine(
                        fromX,
                        firstY,
                        middleX,
                        firstY
                    );

                    drawLine(
                        fromX,
                        secondY,
                        middleX,
                        secondY
                    );

                    drawLine(
                        middleX,
                        firstY,
                        middleX,
                        secondY
                    );

                    drawLine(
                        middleX,
                        targetY,
                        toX,
                        targetY
                    );
                }
            };

            connectLeft(
                leftPositions[0],
                leftPositions[1],
                0,
                1
            );

            connectLeft(
                leftPositions[1],
                leftPositions[2],
                1,
                2
            );

            connectLeft(
                leftPositions[2],
                leftPositions[3],
                2,
                3
            );

            const connectRight = (
                fromPositions,
                toPositions,
                fromColumn,
                toColumn
            ) => {
                for (
                    let i = 0;
                    i < toPositions.length;
                    i++
                ) {
                    const first =
                        fromPositions[
                        i * 2
                        ];

                    const second =
                        fromPositions[
                        i * 2 + 1
                        ];

                    const target =
                        toPositions[i];

                    if (
                        first ===
                        undefined ||
                        second ===
                        undefined ||
                        target ===
                        undefined
                    ) {
                        continue;
                    }

                    const fromX =
                        columnX[
                        fromColumn
                        ];

                    const toX =
                        columnX[
                        toColumn
                        ] +
                        columnWidth;

                    const middleX =
                        (
                            fromX +
                            toX
                        ) / 2;

                    const firstY =
                        first +
                        cardHeight / 2;

                    const secondY =
                        second +
                        cardHeight / 2;

                    const targetY =
                        target +
                        cardHeight / 2;

                    drawLine(
                        fromX,
                        firstY,
                        middleX,
                        firstY
                    );

                    drawLine(
                        fromX,
                        secondY,
                        middleX,
                        secondY
                    );

                    drawLine(
                        middleX,
                        firstY,
                        middleX,
                        secondY
                    );

                    drawLine(
                        middleX,
                        targetY,
                        toX,
                        targetY
                    );
                }
            };

            connectRight(
                rightPositions[0],
                rightPositions[1],
                8,
                7
            );

            connectRight(
                rightPositions[1],
                rightPositions[2],
                7,
                6
            );

            connectRight(
                rightPositions[2],
                rightPositions[3],
                6,
                5
            );

            const leftSemiY =
                leftPositions[3][0] +
                cardHeight / 2;

            const rightSemiY =
                rightPositions[3][0] +
                cardHeight / 2;

            const finalCenterX =
                columnX[4];

            drawLine(
                columnX[3] +
                columnWidth,
                leftSemiY,
                finalCenterX,
                finalY +
                cardHeight / 2
            );

            drawLine(
                columnX[5],
                rightSemiY,
                finalCenterX +
                columnWidth,
                finalY +
                cardHeight / 2
            );

            const bronzeCenterY =
                bronzeY +
                cardHeight / 2;

            drawLine(
                columnX[3] +
                columnWidth,
                leftSemiY,
                columnX[3] +
                columnWidth +
                8,
                leftSemiY
            );

            drawLine(
                columnX[3] +
                columnWidth +
                8,
                leftSemiY,
                columnX[3] +
                columnWidth +
                8,
                bronzeCenterY
            );

            drawLine(
                columnX[3] +
                columnWidth +
                8,
                bronzeCenterY,
                finalCenterX,
                bronzeCenterY
            );

            drawLine(
                columnX[5],
                rightSemiY,
                columnX[5] -
                8,
                rightSemiY
            );

            drawLine(
                columnX[5] -
                8,
                rightSemiY,
                columnX[5] -
                8,
                bronzeCenterY
            );

            drawLine(
                columnX[5] -
                8,
                bronzeCenterY,
                finalCenterX +
                columnWidth,
                bronzeCenterY
            );

            doc
                .font("Helvetica-Bold")
                .fontSize(9)
                .fillColor("#000000")
                .text(
                    "FINAL",
                    columnX[4],
                    finalY - 16,
                    {
                        width:
                            columnWidth,
                        align: "center",
                    }
                );

            doc
                .font("Helvetica-Bold")
                .fontSize(9)
                .fillColor("#000000")
                .text(
                    "BRONZE FINAL",
                    columnX[4],
                    bronzeY +
                    cardHeight +
                    7,
                    {
                        width:
                            columnWidth,
                        align: "center",
                    }
                );
            doc.end();
        } catch (error) {
            reject(error);
        }
    });

module.exports = {
    generatePertandinganPdf,
    generateBracketPdf,
    formatBabak,
    formatStatus,
    sanitizeFileName,
};