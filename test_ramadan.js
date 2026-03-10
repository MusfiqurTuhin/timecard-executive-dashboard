const fs = require('fs');
const PDFParser = require("pdf2json");

async function test() {
    const dataBuffer = fs.readFileSync('/Users/musfiqurtuhin/MM Team Members Time Card/All Team Members Time card 14-02-2026 To 21-02-2026.pdf');

    const text = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
            const rawText = pdfParser.getRawTextContent();
            resolve(rawText);
        });
        pdfParser.parseBuffer(dataBuffer);
    });

    console.log("--- RAW PDF2JSON TEXT ---");
    console.log(text.substring(0, 1500));
}

test().catch(console.error);
