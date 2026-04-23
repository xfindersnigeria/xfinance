"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateStoreSupplyIssueBulk } from "@/lib/api/hooks/useAssets";
import { useEmployees } from "@/lib/api/hooks/useHR";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useDepartments } from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface SingleIssueFormProps {
  row: { id: string; name: string; sku?: string; quantity: number };
  onCancel: () => void;
}

const issueTypes = ["Department", "Employee", "Project"];

export default function SingleIssueForm({ row, onCancel }: SingleIssueFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [issueTo, setIssueTo] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const createIssue = useCreateStoreSupplyIssueBulk();
  const { closeModal } = useModal();

  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ limit: 1000 });
  const employees = (employeesData as any)?.employees || [];

  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 1000 });
  const projects = (projectsData as any)?.data || [];

  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
  const departments = (departmentsData as any)?.data || [];

  const handleIssueTypeChange = (val: string) => {
    setIssueType(val);
    setIssueTo("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isoDate = issueDate ? new Date(issueDate).toISOString() : new Date().toISOString();
    createIssue.mutate(
      {
        items: [{ supplyId: row.id, quantity }],
        type: issueType.toLowerCase(),
        issuedTo: issueTo,
        issueDate: isoDate,
        purpose,
        notes: notes || undefined,
      } as any,
      { onSuccess: () => closeModal(MODAL.SUPPLY_ISSUE_SINGLE + "-" + row.id) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Item summary */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="font-semibold text-gray-800 mb-1">{row.name}</div>
        <div className="text-xs text-gray-500">{row.sku} &bull; {row.quantity} available</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Qty to Issue:</span>
          <Input
            type="number"
            min={1}
            max={row.quantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(row.quantity, Number(e.target.value))))}
            className="w-24 bg-white text-center"
          />
        </div>
      </div>

      <div className="bg-green-50 rounded-xl p-4 space-y-3">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Issue Type</div>
          <Select value={issueType} onValueChange={handleIssueTypeChange}>
            <SelectTrigger className="w-full bg-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issueTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Issue To</div>
          <Select value={issueTo} onValueChange={setIssueTo} required>
            <SelectTrigger className="w-full bg-gray-100">
              <SelectValue
                placeholder={
                  issueType === "Department"
                    ? departmentsLoading ? "Loading..." : "Select Department"
                    : issueType === "Employee"
                    ? employeesLoading ? "Loading..." : "Select Employee"
                    : projectsLoading ? "Loading..." : "Select Project"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {issueType === "Department" &&
                departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              {issueType === "Employee" &&
                employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              {issueType === "Project" &&
                projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Issue Date</div>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="bg-gray-100"
          />
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Purpose</div>
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Monthly operations"
            className="bg-gray-100"
            required
          />
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Notes (Optional)</div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="bg-gray-100"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createIssue.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createIssue.isPending || !issueTo}>
          {createIssue.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          {createIssue.isPending ? "Issuing..." : "Issue Supply"}
        </Button>
      </div>
    </form>
  );
}
