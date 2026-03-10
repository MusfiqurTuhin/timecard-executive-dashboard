const fs = require('fs');
const PDFParser = require("pdf2json");

async function parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const text = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
        pdfParser.parseBuffer(dataBuffer);
    });

    const lines = text.split(/\r?\n/);
    let cleanText = "";

    for (const line of lines) {
        if (line.includes("Total records matched") || line.includes("Export Time")) {
            continue;
        }
        cleanText += line.trim() + " ";
    }


    // Try a unified regex that makes department optional
    // Match ID: \d{1,4}
    // Match Dept (optional): (?:(MM(?:\s+[A-Z]+)?|Resigned|MM)\s+)?
    // Match Date: \d{2}-\d{2}-\d{4}
    // Match Weekday: [A-Za-z]+
    // Match In/Out: [\d:]{5}|--

    // Using a positive lookahead to find the boundaries of the digits
    const regex = /(\d{1,4})\s+(?:(MM(?:\s+[A-Z]+)?|Resigned|MM)\s+)?(\d{2}-\d{2}-\d{4})\s+([A-Za-z]+)\s+([\d:]{5}|--)\s+([\d:]{5}|--)/g;

    let match;
    const records = [];
    let lastIndex = 0;

    // Reset regex for cleanText
    regex.lastIndex = 0;

    while ((match = regex.exec(cleanText)) !== null) {
        const matchStart = match.index + match[0].indexOf(match[1]);

        let name = cleanText.substring(lastIndex, matchStart).trim();
        name = name.replace(/^[-A-Za-z]+\s*Time\s*/i, '').trim();
        name = name.replace(/^[-Time\s]+/, '').trim();
        name = name.replace(/^Full\sNameIDDepartmentDateWeekdayClock-In\sTimeClock-Out\sTime/, '').trim();
        name = name.replace(/^Full\sName.*?Time/, '').trim(); // better header strip

        const id = match[1];
        const department = match[2] || "N/A"; // Handle missing department (like Ramadan PDF)
        const dateStr = match[3];
        const weekday = match[4];
        const clockIn = match[5];
        const clockOut = match[6];

        lastIndex = regex.lastIndex;

        records.push({ id, name, department, date: dateStr, weekday, clockIn, clockOut });
    }

    console.log(`[${filePath.split('/').pop()}] Matched: ${records.length} records`);
    if (records.length === 0) {
        console.log("CLEAN TEXT DUMP:", cleanText.substring(0, 500));
    }
}

async function run() {
    await parsePDF('/Users/musfiqurtuhin/MM Team Members Time Card/All Employee Total Time Card 01-02-2026 To 08-02-2026 03PM.pdf');
    await parsePDF('/Users/musfiqurtuhin/MM Team Members Time Card/All team Members Ramadan Time card 19-02-2026 To 23-02-2026 .pdf');
    await parsePDF('/Users/musfiqurtuhin/MM Team Members Time Card/All Team Members Time card 14-02-2026 To 21-02-2026.pdf');
}

run();
