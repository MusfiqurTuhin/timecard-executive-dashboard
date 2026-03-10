"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export default function SettingsPage() {
  const [hours, setHours] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expectedIn, setExpectedIn] = useState("10:00");
  const [expectedOut, setExpectedOut] = useState("19:00");
  const [departmentName, setDepartmentName] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Example departments to pick from (can be dynamically fetched if needed)
  const availableDepartments = ["ALL", "MM DEV", "MM SUP", "MM BA", "MM OUT"];

  const fetchHours = async () => {
    try {
      const res = await fetch("/api/settings/office-hours");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHours(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHours();
  }, []);

  const handleCreate = async () => {
    if (!startDate || !endDate || !expectedIn || !expectedOut) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/office-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          expectedIn,
          expectedOut,
          departmentName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Office hours rule saved!");
        fetchHours();
        setStartDate("");
        setEndDate("");
      } else {
        toast.error(data.error || "Failed to save rule");
      }
    } catch (err) {
      toast.error("Error saving rule");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/office-hours?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Rule deleted");
        fetchHours();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure global application rules like Office Hours.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurable Expected Office Hours</CardTitle>
          <CardDescription>Set expected clock-in and clock-out times for specific date ranges (e.g. Ramadan). This is used by the analytics engine to calculate lateness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-muted/20 p-4 rounded-lg border">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentName} onValueChange={setDepartmentName}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Expected In</Label>
              <Input type="time" value={expectedIn} onChange={(e) => setExpectedIn(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Expected Out</Label>
              <Input type="time" value={expectedOut} onChange={(e) => setExpectedOut(e.target.value)} />
            </div>

            <div className="lg:col-span-5 flex justify-end mt-2">
              <Button onClick={handleCreate} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>

          <div className="rounded-md border mt-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Department</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Expected Clock-In</TableHead>
                  <TableHead>Expected Clock-Out</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No office hour rules configured. By default, analytics may assume you are on-time or fallback to 10:00 to 19:00.
                    </TableCell>
                  </TableRow>
                ) : (
                  hours.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.departmentName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(rule.startDate).toLocaleDateString()} to {new Date(rule.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{rule.expectedIn}</TableCell>
                      <TableCell>{rule.expectedOut}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
