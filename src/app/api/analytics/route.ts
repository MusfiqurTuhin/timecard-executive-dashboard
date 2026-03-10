import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to convert HH:MM string to minutes for easy diffing
function timeToMinutes(timeStr: string) {
    if (!timeStr || timeStr === "--") return null;
    const [h, m] = timeStr.split(":").map(Number);
    return Math.floor(h * 60 + m);
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const employeeId = url.searchParams.get("employeeId"); // Optional filtering

        // Fetch office hours configurations
        const rules = await prisma.officeHours.findMany();

        // Fetch time records
        const recordsQuery: any = { include: { employee: true }, orderBy: { date: 'asc' } };
        if (employeeId && employeeId !== "ALL") {
            recordsQuery.where = { employee: { name: employeeId } };
        }
        const records: any[] = await prisma.timeRecord.findMany(recordsQuery);

        const employeeStats: Record<string, any> = {};
        const dailyTrends: any[] = [];

        records.forEach((record) => {
            const dateStr = record.date.toISOString().split("T")[0];
            const name = record.employee.name;

            // 1. Find matching Office Hour Rule
            // Fallback: 10:00 to 19:00
            let expectedInMin = 10 * 60; 
            let expectedInStr = "10:00";
            
            const matchingRule = rules.find((r: any) => {
                const isDeptMatch = r.departmentName === "ALL" || r.departmentName === record.employee.department;
                const isDateMatch = record.date >= r.startDate && record.date <= r.endDate;
                return isDeptMatch && isDateMatch;
            });

            if (matchingRule) {
                const parsedMin = timeToMinutes(matchingRule.expectedIn);
                if (parsedMin !== null) {
                    expectedInMin = parsedMin;
                    expectedInStr = matchingRule.expectedIn;
                }
            }

            // 2. Calculate Lateness & Hours Worked
            let minutesLate = 0;
            let isLate = false;
            let hoursWorked = 0;
            let isMissingClockOut = record.clockOut === "--";
            
            const actualInMin = timeToMinutes(record.clockIn);
            const actualOutMin = timeToMinutes(record.clockOut);

            let bucket = "none";
            
            if (actualInMin !== null) {
                if (actualInMin <= expectedInMin) {
                    bucket = "onTime";
                } else {
                    minutesLate = actualInMin - expectedInMin;
                    isLate = true;
                    if (minutesLate <= 15) bucket = "grace";
                    else if (minutesLate <= 60) bucket = "late";
                    else bucket = "veryLate";
                }
            }

            if (actualInMin !== null && actualOutMin !== null && actualOutMin > actualInMin) {
                hoursWorked = (actualOutMin - actualInMin) / 60;
            }

            // Stats Aggregation per Employee
            if (!employeeStats[name]) {
                employeeStats[name] = {
                    id: record.employeeId,
                    name,
                    department: record.employee.department,
                    totalDaysWorked: 0,
                    totalDaysLate: 0,
                    totalMinutesLate: 0,
                    totalHoursWorked: 0,
                    missingClockOuts: 0,
                    arrivalBuckets: { onTime: 0, grace: 0, late: 0, veryLate: 0 },
                    latenessTrends: [] // Track days and minutes late for patterns
                };
            }

            if (actualInMin !== null) {
                employeeStats[name].totalDaysWorked++;
                employeeStats[name].totalHoursWorked += hoursWorked;
                if (isMissingClockOut) employeeStats[name].missingClockOuts++;
                if (bucket !== "none") employeeStats[name].arrivalBuckets[bucket]++;

                if (isLate) {
                    employeeStats[name].totalDaysLate++;
                    employeeStats[name].totalMinutesLate += minutesLate;
                }
                
                employeeStats[name].latenessTrends.push({
                    date: dateStr,
                    minutesLate
                });
            }

            // Timeline Aggregation for charts
            dailyTrends.push({
                id: record.id,
                name: name,
                date: dateStr,
                department: record.employee.department,
                minutesLate,
                hoursWorked: Number(hoursWorked.toFixed(1)),
                clockIn: record.clockIn,
                clockOut: record.clockOut,
                expectedIn: expectedInStr
            });
        });

        // Calculate final rankings and scores
        const statsArray = Object.values(employeeStats);
        statsArray.forEach((emp: any) => {
            if (emp.totalDaysWorked > 0) {
                // Percentage of days NOT late
                emp.punctualityScore = Math.round(((emp.totalDaysWorked - emp.totalDaysLate) / emp.totalDaysWorked) * 100);
            } else {
                emp.punctualityScore = 0;
            }
            emp.totalHoursWorked = Number(emp.totalHoursWorked.toFixed(1));
        });

        // 3. Executive Aggregations
        const activeEmployees = statsArray.filter(e => e.totalDaysWorked > 0 && e.department !== "MM OUT" && e.department !== "Resigned");
        const remoteEmployees = statsArray.filter(e => e.totalDaysWorked > 0 && e.department === "MM OUT");
        
        // Sort active descending by score
        activeEmployees.sort((a, b) => b.punctualityScore - a.punctualityScore);

        const departmentStats: Record<string, any> = {};
        let totalCompanyMinutesLate = 0;
        let totalCompanyHoursWorked = 0;
        let totalCompanyMissingOuts = 0;

        activeEmployees.forEach((emp: any) => {
            totalCompanyMinutesLate += emp.totalMinutesLate;
            totalCompanyHoursWorked += emp.totalHoursWorked;
            totalCompanyMissingOuts += emp.missingClockOuts;

            if (!departmentStats[emp.department]) {
                departmentStats[emp.department] = { 
                    department: emp.department, 
                    totalDaysWorked: 0, 
                    totalDaysLate: 0, 
                    totalMinutesLate: 0,
                    totalHoursWorked: 0,
                    employeeCount: 0,
                    arrivalBuckets: { onTime: 0, grace: 0, late: 0, veryLate: 0 }
                };
            }
            departmentStats[emp.department].employeeCount++;
            departmentStats[emp.department].totalDaysWorked += emp.totalDaysWorked;
            departmentStats[emp.department].totalDaysLate += emp.totalDaysLate;
            departmentStats[emp.department].totalMinutesLate += emp.totalMinutesLate;
            departmentStats[emp.department].totalHoursWorked += emp.totalHoursWorked;
            
            departmentStats[emp.department].arrivalBuckets.onTime += emp.arrivalBuckets.onTime;
            departmentStats[emp.department].arrivalBuckets.grace += emp.arrivalBuckets.grace;
            departmentStats[emp.department].arrivalBuckets.late += emp.arrivalBuckets.late;
            departmentStats[emp.department].arrivalBuckets.veryLate += emp.arrivalBuckets.veryLate;
        });

        // Calculate Averages for Departments
        Object.values(departmentStats).forEach((dept: any) => {
            dept.avgPunctuality = dept.totalDaysWorked > 0 ? Math.round(((dept.totalDaysWorked - dept.totalDaysLate) / dept.totalDaysWorked) * 100) : 0;
            dept.totalHoursWorked = Number(dept.totalHoursWorked.toFixed(1));
        });

        const mostPunctual = activeEmployees.length > 0 ? activeEmployees[0] : null;
        const leastPunctual = activeEmployees.length > 0 ? activeEmployees[activeEmployees.length - 1] : null;
        
        // Find most dedicated (Most Hours Worked)
        const sortedByHours = [...activeEmployees].sort((a, b) => b.totalHoursWorked - a.totalHoursWorked);
        const mostDedicated = sortedByHours.length > 0 ? sortedByHours[0] : null;

        // Find worst at clocking out
        const sortedByMissingOut = [...activeEmployees].sort((a, b) => b.missingClockOuts - a.missingClockOuts);
        const worstClockout = sortedByMissingOut.length > 0 && sortedByMissingOut[0].missingClockOuts > 0 ? sortedByMissingOut[0] : null;

        // Generate dynamic CEO-level suggestions based on data
        const suggestions = [];

        // Overall Impact
        if (totalCompanyHoursWorked > 0) {
            suggestions.push({
                id: "overall-work",
                type: "insight",
                title: "Total Workforce Output",
                message: `The active team has successfully logged ${totalCompanyHoursWorked.toFixed(1)} hours of productive office time during this period.`
            });
        }

        if (totalCompanyMinutesLate > 0) {
            const hoursLost = (totalCompanyMinutesLate / 60).toFixed(1);
            suggestions.push({
                id: "overall-cost",
                type: "warning",
                title: "Business Impact: Hours Lost",
                message: `Across the tracked period, the company has lost approximately ${hoursLost} hours of expected productivity purely due to late arrivals.`
            });
        }

        if (totalCompanyMissingOuts > 0) {
            suggestions.push({
                id: "missing-outs",
                type: "warning",
                title: "Timesheet Compliance Issue",
                message: `There are ${totalCompanyMissingOuts} instances of employees completely missing their clock-outs, corrupting total hour tracking visibility.`
            });
        }

        if (mostDedicated && mostDedicated.totalHoursWorked > 0) {
            suggestions.push({
                id: "dedicated",
                type: "celebration",
                title: "MVP: Maximum Input",
                message: `${mostDedicated.name} has logged the most office time within this period, generating ${mostDedicated.totalHoursWorked} total hours of presence.`
            });
        }

        if (worstClockout) {
            suggestions.push({
                id: "compliance",
                type: "warning",
                title: "Compliance Risk",
                message: `${worstClockout.name} has failed to clock-out ${worstClockout.missingClockOuts} times. Management should mandate strict clock-out policies.`
            });
        }

        // Department insights
        const deptArray = Object.values(departmentStats);
        if (deptArray.length > 0) {
            deptArray.sort((a: any, b: any) => b.totalMinutesLate - a.totalMinutesLate); // Worst offenders first
            const worstDept: any = deptArray[0];
            if (worstDept.totalMinutesLate > 0) {
                 const hours = (worstDept.totalMinutesLate / 60).toFixed(1);
                 suggestions.push({
                    id: "dept-worst",
                    type: "warning",
                    title: "Department Insight: Lowest Punctuality",
                    message: `The ${worstDept.department} department has accumulated the most lateness, losing ${hours} hours across ${worstDept.totalDaysLate} incidents.`
                 });
            }
        }

        // Remote worker insights
        if (remoteEmployees.length > 0) {
            suggestions.push({
                 id: "remote",
                 type: "insight",
                 title: "Remote Worker Activity",
                 message: `You have ${remoteEmployees.length} remote (MM OUT) employees who clocked into the office a combined ${remoteEmployees.reduce((sum, e) => sum + e.totalDaysWorked, 0)} times during this period.`
            });
        }
        
        if (mostPunctual && mostPunctual.punctualityScore >= 95 && mostPunctual.totalDaysWorked > 0) {
            suggestions.push({
                id: "best-punctual",
                type: "celebration",
                title: "Top Performer: Punctuality",
                message: `${mostPunctual.name} has an outstanding punctuality score of ${mostPunctual.punctualityScore}%!`
            });
        }

        return NextResponse.json({
            trends: dailyTrends,
            employeeStats: activeEmployees,
            departmentStats: deptArray, // Exposing new deep dept analytics
            rankings: {
                mostPunctual,
                leastPunctual,
                mostDedicated,
                worstClockout
            },
            suggestions
        });
    } catch (error: any) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
    }
}
