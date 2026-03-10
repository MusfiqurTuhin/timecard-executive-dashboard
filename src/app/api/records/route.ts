import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const records = await prisma.timeRecord.findMany({
            include: {
                employee: true, // Includes Employee relation (name, department, etc)
            },
            orderBy: {
                date: "desc", // Latest dates first
            },
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error("Failed to fetch records:", error);
        return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
    }
}
