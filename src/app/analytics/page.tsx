"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { AlertTriangle, Award, TrendingDown, Users, Clock, Frown, Activity, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444']; // onTime, grace, late, veryLate

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState("ALL");
  const [uniqueEmployees, setUniqueEmployees] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/records").then(res => res.json()).then(resData => {
      if (Array.isArray(resData)) {
         setUniqueEmployees(Array.from(new Set(resData.map(r => r.employee.name))).sort());
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?employeeId=${encodeURIComponent(employeeId)}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch analytics:", err);
        setLoading(false);
      });
  }, [employeeId]);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const trendsData = data.trends.map((t: any) => ({
      Date: new Date(t.date).toLocaleDateString(),
      "Employee Name": t.name,
      Department: t.department,
      "Expected In": t.expectedIn,
      "Actual In": t.clockIn,
      "Actual Out": t.clockOut,
      "Hours Logged": t.hoursWorked,
      "Minutes Late": t.minutesLate
    }));
    const trendsWs = XLSX.utils.json_to_sheet(trendsData);
    XLSX.utils.book_append_sheet(wb, trendsWs, "Raw Trends");

    const statsData = data.employeeStats.map((s: any) => ({
      "Employee Name": s.name,
      Department: s.department,
      "Days Worked": s.totalDaysWorked,
      "Total Hours Logged": s.totalHoursWorked,
      "Days Late": s.totalDaysLate,
      "Missing Clock-Outs": s.missingClockOuts,
      "Total Minutes Late": s.totalMinutesLate,
      "Punctuality %": s.punctualityScore,
      "On Time Arrivals": s.arrivalBuckets?.onTime || 0,
      "Grace (<15m)": s.arrivalBuckets?.grace || 0,
      "Late (<1H)": s.arrivalBuckets?.late || 0,
      "Very Late (>1H)": s.arrivalBuckets?.veryLate || 0
    }));
    const statsWs = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, "Deep Employee Analytics");

    XLSX.writeFile(wb, "Executive_Analytics_Export.xlsx");
  };

  const handleExportPDF = () => {
    if (!data || data.employeeStats.length === 0) return;
    
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();

    let targetEmp = null;
    if (employeeId !== "ALL" && data.employeeStats.length === 1) {
       targetEmp = data.employeeStats[0];
    } else if (data.rankings && data.rankings.leastPunctual) {
       targetEmp = data.rankings.leastPunctual; 
    } else {
       targetEmp = data.employeeStats[0]; // fallback
    }

    if (!targetEmp) return;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("OFFICIAL ATTENDANCE MEMO", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${currentDate}`, 20, 40);
    doc.text(`To: ${targetEmp.name} (${targetEmp.department})`, 20, 50);
    doc.text(`From: Management / HR Department`, 20, 60);
    
    doc.line(20, 65, 190, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Subject: Executive Attendance & Performance Review", 20, 75);

    doc.setFont("helvetica", "normal");
    const bodyText = targetEmp.punctualityScore >= 95 
      ? `Dear ${targetEmp.name},\n\We are writing to officially commend you on your outstanding punctuality record. During the recent tracking period, you have maintained a Punctuality Score of ${targetEmp.punctualityScore}%, arriving late only ${targetEmp.totalDaysLate} out of ${targetEmp.totalDaysWorked} days.\n\nWe note you have successfully logged ${targetEmp.totalHoursWorked} total working hours during this period. Your dedication and respect for office hours sets an excellent example for the entire ${targetEmp.department} department. We deeply appreciate your professionalism.\n\nKeep up the great work!`
      : `Dear ${targetEmp.name},\n\nWe are writing to bring to your attention a concerning trend regarding your recent attendance and punctuality. During the tracking period, our records indicate that you have arrived late on ${targetEmp.totalDaysLate} out of ${targetEmp.totalDaysWorked} working days, resulting in a Punctuality Score of ${targetEmp.punctualityScore}%.\n\nPunctuality is critical to our operational success. This letter serves as an official notice to improve your adherence to the expected office hours immediately. Additionally, you are required to ensure strict compliance with clocking out, as you currently process ${targetEmp.missingClockOuts} missing end-of-day times.\n\nPlease ensure your schedules going forward align with company policy to avoid further administrative actions.`;

    const splitText = doc.splitTextToSize(bodyText, 170);
    doc.text(splitText, 20, 90);

    doc.text("Sincerely,", 20, 200);
    doc.text("__________________________", 20, 220);
    doc.text("Authorized Signature", 20, 230);

    doc.save(`${targetEmp.name.replace(/\s+/g, "_")}_Attendance_Letter.pdf`);
  };

  if (loading) {
     return <div className="flex flex-col h-[50vh] items-center justify-center text-muted-foreground"><Activity className="w-8 h-8 animate-spin mb-4" /> Generating Executive Insights...</div>;
  }

  if (!data || data.error) {
     return <div className="flex h-[50vh] items-center justify-center text-destructive">Failed to load deep analytics payload.</div>;
  }

  // Aggregate Pie Chart Data
  let aggPie = { onTime: 0, grace: 0, late: 0, veryLate: 0 };
  data.employeeStats.forEach((e: any) => {
      aggPie.onTime += e.arrivalBuckets?.onTime || 0;
      aggPie.grace += e.arrivalBuckets?.grace || 0;
      aggPie.late += e.arrivalBuckets?.late || 0;
      aggPie.veryLate += e.arrivalBuckets?.veryLate || 0;
  });
  const pieData = [
      { name: "On Time (Before Expected)", value: aggPie.onTime },
      { name: "Grace (0-15m Late)", value: aggPie.grace },
      { name: "Late (15-60m Late)", value: aggPie.late },
      { name: "Critical (>60m Late)", value: aggPie.veryLate }
  ];

  // Top KPI calculations
  const totalCompanyHours = data.employeeStats.reduce((sum: number, e: any) => sum + (e.totalHoursWorked || 0), 0);
  const totalCompanyLateMins = data.employeeStats.reduce((sum: number, e: any) => sum + (e.totalMinutesLate || 0), 0);
  const avgCompanyPunctuality = data.employeeStats.length > 0 ? (data.employeeStats.reduce((sum: number, e: any) => sum + e.punctualityScore, 0) / data.employeeStats.length).toFixed(0) : 0;
  const totalMissingOut = data.employeeStats.reduce((sum: number, e: any) => sum + (e.missingClockOuts || 0), 0);


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">COO / Executive Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive overview of company attendance, hours lost, and deep organizational tracking.</p>
        </div>
        <div className="flex items-center gap-4">
           <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || "ALL")}>
              <SelectTrigger className="w-[200px] bg-background">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="All Employees" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Entire Company</SelectItem>
                {uniqueEmployees.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExportExcel} className="hidden sm:flex">
              <FileDown className="w-4 h-4 mr-2" /> Comprehensive Excel
            </Button>
            <Button variant="default" onClick={handleExportPDF} className="hidden sm:flex">
               <FileText className="w-4 h-4 mr-2" /> Execute Memo (PDF)
            </Button>
        </div>
      </div>

       {/* Top KPI Cards row */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked Input</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanyHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">Cumulative logged office time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mean Punctuality</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompanyPunctuality}%</div>
            <p className="text-xs text-muted-foreground">Average operational readiness</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost of Lateness</CardTitle>
            <Frown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{(totalCompanyLateMins / 60).toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">Directly lost operational time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timesheet Compliance Hits</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{totalMissingOut} logs</div>
            <p className="text-xs text-muted-foreground">Missing End-of-Day clock outs</p>
          </CardContent>
        </Card>
      </div>


      {/* AI Suggestions Engine (Dynamic Executive Forensics) */}
      {data.suggestions && data.suggestions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.suggestions.map((sug: any, i: number) => (
            <Alert key={i} className={sug.type === "warning" ? "border-destructive/50 bg-destructive/10" : sug.type === "celebration" ? "border-green-500/50 bg-green-500/10" : "border-blue-500/50 bg-blue-500/10"}>
              {sug.type === "warning" ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : sug.type === "celebration" ? <Award className="h-4 w-4 text-green-500 shrink-0" /> : <Activity className="h-4 w-4 text-blue-500 shrink-0" />}
              <div className="ml-2">
                <AlertTitle>{sug.title || "Executive Insight"}</AlertTitle>
                <AlertDescription className="mt-1 text-sm">
                  {sug.message}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Complex Analytics Layout */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        
        {/* Arrival Heatmap Pie */}
        <Card className="col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Arrival Distribution</CardTitle>
              <CardDescription>Visual breakdown of check-in times vs expected.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                 </PieChart>
               </ResponsiveContainer>
            </CardContent>
        </Card>

         {/* Line Chart for Lateness over Time */}
         <Card className="col-span-1 lg:col-span-8">
            <CardHeader>
              <CardTitle>Chronological Latency Forensic (Minutes)</CardTitle>
              <CardDescription>A daily cumulative tracking of delays in operations.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data.trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="minutesLate" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{ r: 8 }} />
                 </LineChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         {/* Departmental Radar (Only show if multiple depts) */}
         {data.departmentStats && data.departmentStats.length > 1 && (
             <Card className="col-span-1 lg:col-span-12">
                <CardHeader>
                  <CardTitle>Departmental Operations Overview</CardTitle>
                  <CardDescription>A comparative analysis of sub-organization discipline.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.departmentStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="department" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgPunctuality" name="Average Punctuality %" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="totalMinutesLate" name="Total Minutes Late" fill="#ef4444" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
         )}
      </div>

      {/* Deep Employee Drilldown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Workforce Datatable</CardTitle>
          <CardDescription>Complete individual metrics sorted by total operational output.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead className="text-right">Logged Hours</TableHead>
                    <TableHead className="text-right">Punctuality Score</TableHead>
                    <TableHead className="text-right">Days Late</TableHead>
                    <TableHead className="text-right text-destructive">Mins Lost</TableHead>
                    <TableHead className="text-right text-orange-500">Missing Out Logs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employeeStats.sort((a: any, b: any) => b.totalHoursWorked - a.totalHoursWorked).map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell className="text-right tracking-tight">{emp.totalHoursWorked.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${emp.punctualityScore >= 90 ? 'bg-green-100 text-green-800' : emp.punctualityScore >= 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {emp.punctualityScore}%
                         </span>
                      </TableCell>
                      <TableCell className="text-right">{emp.totalDaysLate}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{emp.totalMinutesLate}m</TableCell>
                      <TableCell className="text-right text-orange-500 font-mono">{emp.missingClockOuts}</TableCell>
                    </TableRow>
                  ))}
                  {data.employeeStats.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No executive data found for this context.</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
