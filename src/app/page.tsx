"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Search, AlertCircle, Filter } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterEmployee, setFilterEmployee] = useState("ALL");

  useEffect(() => {
    fetch("/api/records")
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          console.error("Error fetching records:", resData.error || resData);
          setData([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load records", err);
        setData([]);
        setLoading(false);
      });
  }, []);

  const departments = Array.from(new Set(data.map((row) => row.employee.department))).sort();
  const employees = Array.from(new Set(data.map((row) => row.employee.name))).sort();

  const filteredData = data.filter((row) => {
    const matchesSearch =
      row.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      row.employee.department.toLowerCase().includes(search.toLowerCase());

    const matchesDept = filterDepartment === "ALL" || row.employee.department === filterDepartment;
    const matchesEmp = filterEmployee === "ALL" || row.employee.name === filterEmployee;

    return matchesSearch && matchesDept && matchesEmp;
  });

  const missingClockOuts = data.filter((row) => row.clockIn !== "--" && row.clockOut === "--").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-muted-foreground">Insights and timecard records for your team.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total timecard entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Set(data.map((d) => d.employeeId)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique IDs in records</p>
          </CardContent>
        </Card>
        <Card className={missingClockOuts > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Clock-Outs</CardTitle>
            <AlertCircle className={`h-4 w-4 ${missingClockOuts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${missingClockOuts > 0 ? "text-red-500" : ""}`}>{missingClockOuts}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or department..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterDepartment} onValueChange={(val) => setFilterDepartment(val || "ALL")}>
              <SelectTrigger className="w-[180px] bg-background">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="All Departments" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEmployee} onValueChange={(val) => setFilterEmployee(val || "ALL")}>
              <SelectTrigger className="w-[180px] bg-background">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="All Employees" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {employees.map((name: string) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{row.employee.name}</TableCell>
                    <TableCell>
                      <Badge variant={row.employee.department === "Resigned" ? "destructive" : "secondary"}>
                        {row.employee.department}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.weekday}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-200 dark:border-green-900">
                        {row.clockIn}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900">
                        {row.clockOut}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
