import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const hours = await prisma.officeHours.findMany({
            orderBy: {
                startDate: "asc"
            }
        });
        return NextResponse.json(hours);
    } catch (error: any) {
        console.error("Error fetching office hours:", error);
        return NextResponse.json({ error: "Failed to fetch office hours" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { departmentName, startDate, endDate, expectedIn, expectedOut } = body;

        if (!startDate || !endDate || !expectedIn || !expectedOut) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newHours = await prisma.officeHours.create({
            data: {
                departmentName: departmentName || "ALL",
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                expectedIn,
                expectedOut
            }
        });

        return NextResponse.json(newHours);
    } catch (error: any) {
        console.error("Error creating office hours:", error);
        return NextResponse.json({ error: "Failed to save office hours" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.officeHours.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting office hours:", error);
        return NextResponse.json({ error: "Failed to delete office hours" }, { status: 500 });
    }
}
