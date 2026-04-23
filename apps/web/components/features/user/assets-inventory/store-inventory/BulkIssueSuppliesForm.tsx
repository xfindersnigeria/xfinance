"use client";
import React, { useState } from "react";
import { useEmployees } from "@/lib/api/hooks/useHR";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useDepartments } from "@/lib/api/hooks/useSettings";

interface BulkIssueSuppliesFormProps {
  selectedItems: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
  }>;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const issueTypes = ["Department", "Employee", "Project"];

export default function BulkIssueSuppliesForm({
  selectedItems,
  onSubmit,
  onCancel,
  isLoading,
}: BulkIssueSuppliesFormProps) {
  const [quantities, setQuantities] = useState<{ [id: string]: number }>(
    Object.fromEntries(selectedItems.map((item) => [item.id, 1])),
  );
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [issueTo, setIssueTo] = useState("");

  // Fetch employees and projects
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    limit: 1000,
  });
  const employees = (employeesData as any)?.employees || [];
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    limit: 1000,
  });
  const projects = (projectsData as any)?.data || [];

  const { data: departmentsData, isLoading: departmentsLoading } =
    useDepartments();
  const departments = (departmentsData as any)?.data || [];
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const handleQtyChange = (id: string, value: string) => {
    const qty = Math.max(1, Number(value));
    setQuantities((q) => ({ ...q, [id]: qty }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert issueDate (YYYY-MM-DD) to ISO string with time (e.g., 2024-04-01T00:00:00.000Z)
    const isoIssueDate = issueDate
      ? new Date(issueDate).toISOString()
      : undefined;
    onSubmit({
      items: selectedItems.map((item) => ({
        supplyId: item.id,
        quantity: quantities[item.id],
      })),
      type: issueType.toLowerCase(),
      issuedTo: issueTo,
      issueDate: isoIssueDate,
      purpose,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded p-2">
        <div className="font-semibold mb-2">Selected Items</div>
        <div className="bg-background-subtle rounded-2xl p-4 flex flex-col gap-4 max-h-64 overflow-y-auto">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border"
            >
              <div>
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.sku} • {item.quantity} available
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Qty:</span>
                <Input
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={quantities[item.id]}
                  onChange={(e) => handleQtyChange(item.id, e.target.value)}
                  className="w-20 bg-gray-100 text-center"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-green-50 rounded p-2">
        <div className="">
          <div className="font-semibold mb-2">Issue Type</div>
          <Select onValueChange={setIssueType} defaultValue={issueType}>
            <SelectTrigger className="w-full bg-gray-100">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {issueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="font-semibold mb-2">Issue To</div>
          <Select onValueChange={setIssueTo} defaultValue={issueTo}>
            <SelectTrigger className="w-full bg-gray-100">
              <SelectValue
                placeholder={
                  issueType === "Department"
                    ? departmentsLoading
                      ? "Loading departments..."
                      : "Select Department"
                    : issueType === "Employee"
                      ? employeesLoading
                        ? "Loading employees..."
                        : "Select employee"
                      : issueType === "Project"
                        ? projectsLoading
                          ? "Loading projects..."
                          : "Select project"
                        : "Select department"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {issueType === "Department" &&
                departments.map((dep: any) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.name}
                  </SelectItem>
                ))}
              {issueType === "Employee" &&
                employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}{" "}
                    <span className="text-xs text-gray-400">({emp.email})</span>
                  </SelectItem>
                ))}
              {issueType === "Project" &&
                projects.map((proj: any) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="font-semibold mb-2">Issue Date</div>
          <Input
            type="date"
            className="w-full bg-gray-100"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <div className="font-semibold mb-2">Purpose</div>
          <Input
            className="w-full bg-gray-100"
            placeholder="e.g., Monthly operations"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>
        <div>
          <div className="font-semibold mb-2">Notes (Optional)</div>
          <Textarea
            className="w-full bg-gray-100"
            placeholder="Additional notes or comments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin mr-2" />}
          {isLoading ? "Issuing..." : "Issue Supplies"}
        </Button>
      </div>
    </form>
  );
}
