import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import PDFParser from "pdf2json";
import fs from "fs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse the PDF using pdf2json
        const text = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser(null, true);
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => {
                const rawText = pdfParser.getRawTextContent();
                resolve(rawText);
            });
            pdfParser.parseBuffer(buffer);
        });

        // Clean up formatting issues returned by pdf2json which uses \r\n instead of \n
        const lines = text.split(/\r?\n/);
        let cleanText = "";

        for (const line of lines) {
            if (line.includes("Total records matched") || line.includes("Export Time") || line.includes("Full Name")) {
                continue;
            }
            cleanText += line.trim() + " ";
        }

        // Optional department matching via (?:(MM(?:\s+[A-Z]+)?|Resigned|MM)\s+)?
        const regex = /(\d{1,4})\s+(?:(MM(?:\s+[A-Z]+)?|Resigned|MM)\s+)?(\d{2}-\d{2}-\d{4})\s+([A-Za-z]+)\s+([\d:]{5}|--)\s+([\d:]{5}|--)/g;

        console.log("PDF Upload Debug: text length =", text.length);
        console.log("PDF Upload Debug: cleanText snippet =", cleanText.substring(0, 500));

        let match;
        const records = [];
        let lastIndex = 0;

        regex.lastIndex = 0;

        while ((match = regex.exec(cleanText)) !== null) {
            // Because regex is matching '   31', match.index points to ' '.
            // The name ends BEFORE the first digit of the match.
            // Let's find the actual start of the digits within the matched string.
            const matchStart = match.index + match[0].indexOf(match[1]);

            let name = cleanText.substring(lastIndex, matchStart).trim();
            // Clean up name artifacts
            name = name.replace(/^[-A-Za-z]+\s*Time\s*/i, '').trim();
            name = name.replace(/^[-Time\s]+/, '').trim();
            name = name.replace(/^Full\sNameIDDepartmentDateWeekdayClock-In\sTimeClock-Out\sTime/, '').trim();
            name = name.replace(/^Full\sName.*?Time/, '').trim();

            const id = match[1];
            const department = match[2] || "N/A"; // Handle optional department
            const dateStr = match[3];
            const weekday = match[4];
            const clockIn = match[5];
            const clockOut = match[6];

            lastIndex = regex.lastIndex;

            // Parse date: DD-MM-YYYY
            const [day, month, year] = dateStr.split("-");
            const dateObj = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

            records.push({
                id: id.trim(),
                name: name || "Unknown Name",
                department: department.trim(),
                date: dateObj,
                weekday: weekday.trim(),
                clockIn: clockIn.trim(),
                clockOut: clockOut.trim(),
            });
        }

        if (records.length === 0) {
            fs.writeFileSync("/tmp/debug_cleantext.txt", cleanText);
            console.log("No records matched! Dumped cleanText to /tmp/debug_cleantext.txt for inspection.");
        }

        // Insert to database handling deduplication
        let insertedCount = 0;

        // We can use a Prisma transaction to upsert all
        for (const record of records) {
            // Upsert Employee
            await prisma.employee.upsert({
                where: { id: record.id },
                update: {
                    name: record.name,
                    department: record.department,
                },
                create: {
                    id: record.id,
                    name: record.name,
                    department: record.department,
                },
            });

            // Upsert TimeRecord
            // We use the unique constraint [employeeId, date]
            const [day, month, year] = [record.date.getUTCDate(), record.date.getUTCMonth() + 1, record.date.getUTCFullYear()];
            // Ensure we query exactly midnight UTC to prevent timezone overlaps
            const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

            // Try finding if it exists first because we didn't specify a composite unique ID in Prisma schema properly we used @@unique.
            // Wait, we DO have @@unique([employeeId, date]). We can upsert.
            const existing = await prisma.timeRecord.findUnique({
                where: {
                    employeeId_date: {
                        employeeId: record.id,
                        date: startOfDay,
                    }
                }
            });

            if (!existing) {
                await prisma.timeRecord.create({
                    data: {
                        employeeId: record.id,
                        date: startOfDay,
                        clockIn: record.clockIn,
                        clockOut: record.clockOut,
                        weekday: record.weekday,
                    }
                });
                insertedCount++;
            } else {
                // Update if already exists, maybe they fixed a missed punch?
                await prisma.timeRecord.update({
                    where: { id: existing.id },
                    data: {
                        clockIn: record.clockIn,
                        clockOut: record.clockOut,
                    }
                });
            }
        }

        return NextResponse.json({ success: true, recordsParsed: records.length, recordsInserted: insertedCount });
    } catch (error: any) {
        console.error("PDF Upload Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process PDF" }, { status: 500 });
    }
}
