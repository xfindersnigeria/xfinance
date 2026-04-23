"use client";
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import dayjs from "dayjs";
import { Calendar, Users, TrendingUp, CalendarDays, Info } from "lucide-react";

// --- Custom Implementation for Process Payroll ---
const PAY_PERIODS = [
  "January 2024",
  "February 2024",
  "March 2024",
  "April 2024",
  "May 2024",
  "June 2024",
  "July 2024",
  "August 2024",
  "September 2024",
  "October 2024",
  "November 2024",
  "December 2024",
];
const PAYMENT_METHODS = ["Bank Transfer", "Cash", "Cheque"];

export default function ProcessPayrollForm({
  employees = [],
  onSubmit,
  onSaveDraft,
  loading = false,
  isSubmitting = false,
  initialBatch,
  isEditMode = false,
}: any) {
  const buildRows = (emps: any[]) =>
    emps.map((emp: any) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.position || "",
      basicSalary: emp.salary || 0,
      allowances: emp.allowances || 0,
      bonus: emp._bonus ?? 0,
      overtime: emp._overtime ?? 0,
      deductionsStat: emp.suggestedStatutoryDed || 0,
      deductionsOther: emp.suggestedOtherDed || 0,
      netPay:
        (emp.salary || 0) +
        (emp.allowances || 0) +
        (emp._bonus ?? 0) +
        (emp._overtime ?? 0) -
        (emp.suggestedStatutoryDed || 0) -
        (emp.suggestedOtherDed || 0),
    }));

  const [selected, setSelected] = useState<boolean[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [payPeriod, setPayPeriod] = useState(
    initialBatch?.period ?? PAY_PERIODS[10],
  );
  const [paymentDate, setPaymentDate] = useState(
    initialBatch?.paymentDate
      ? new Date(initialBatch.paymentDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialBatch?.paymentMethod ?? PAYMENT_METHODS[0],
  );
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setRows(buildRows(employees));
      setSelected(employees.map(() => true));
      setSelectAll(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  // --- Handlers ---
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelected(selected.map(() => checked));
  };
  const handleSelect = (idx: number, checked: boolean) => {
    const updated = [...selected];
    updated[idx] = checked;
    setSelected(updated);
    setSelectAll(updated.every(Boolean));
  };
  const handleRowChange = (idx: number, key: string, value: any) => {
    const updated = [...rows];
    updated[idx][key] = value;
    // recalc net pay
    updated[idx].netPay =
      Number(updated[idx].basicSalary) +
      Number(updated[idx].allowances) +
      Number(updated[idx].bonus) +
      Number(updated[idx].overtime) -
      Number(updated[idx].deductionsStat) -
      Number(updated[idx].deductionsOther);
    setRows(updated);
  };

  // --- Totals ---
  const selectedRows = rows.filter((_: any, i: any) => selected[i]);
  const totalBasic = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.basicSalary),
    0,
  );
  const totalAllowances = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.allowances),
    0,
  );
  const totalBonus = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.bonus),
    0,
  );
  const totalOvertime = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.overtime),
    0,
  );
  const totalDeductionsStat = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.deductionsStat),
    0,
  );
  const totalDeductionsOther = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.deductionsOther),
    0,
  );
  const totalNetPay = selectedRows.reduce(
    (a: any, b: any) => a + Number(b.netPay),
    0,
  );

  // --- Render ---
  const handleFormSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    const selectedEmployees = rows
      .filter((_: any, i: number) => selected[i])
      .map((r: any) => ({
        employeeId: r.id,
        basicSalary: Number(r.basicSalary),
        allowances: Number(r.allowances),
        bonus: Number(r.bonus),
        overtime: Number(r.overtime),
        statutoryDed: Number(r.deductionsStat),
        otherDed: Number(r.deductionsOther),
      }));
    const now = new Date();
    onSubmit &&
      onSubmit({
        batchName: initialBatch?.batchName ?? `Payroll - ${payPeriod}`,
        period: payPeriod,
        paymentDate,
        paymentMethod,
        status: isDraft ? "Draft" : "Pending",
        employees: selectedEmployees,
      });
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400 animate-pulse">
        Loading employee data...
      </div>
    );
  }

  return (
    <form onSubmit={(e) => handleFormSubmit(e)}>
      {/* Payroll Period & Payment Details */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6">
        <div className="font-semibold text-base flex items-center gap-2 mb-4 text-blue-900">
          <Calendar className="w-5 h-5 text-blue-500" /> Payroll Period &
          Payment Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
              Pay Period <span className="text-red-500">*</span>
            </div>
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger className="w-full rounded-xl bg-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {PAY_PERIODS.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
              Payment Date <span className="text-red-500">*</span>
            </div>
            <Input
              type="date"
              className="w-full rounded-xl bg-white"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
              Payment Method <span className="text-red-500">*</span>
            </div>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full rounded-xl bg-white">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee Payroll Details */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6">
        <div className="font-semibold text-base flex items-center gap-2 mb-4 text-blue-900">
          <Users className="w-5 h-5 text-blue-500" /> Employee Payroll Details
          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              checked={selectAll}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({selected && selected.filter(Boolean).length}/
              {rows.length})
            </span>
          </div>
        </div>
        <div className="space-y-4 max-h-87.5 overflow-y-auto pr-2">
          {rows.map((row: any, idx: any) => (
            <div
              key={row.id}
              className={`flex flex-col md:flex-row md:items-center gap-2 bg-white rounded-xl px-4 py-3 ${selected[idx] ? "" : "opacity-60"}`}
            >
              <div className="flex items-center gap-3 min-w-50">
                <Checkbox
                  checked={selected[idx]}
                  onCheckedChange={(checked) => handleSelect(idx, !!checked)}
                />
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {row.name
                    .split(" ")
                    .map((n: any) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.role}</div>
                </div>
              </div>
              {/* <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2 items-center">
                <Input type="number" className="rounded-xl bg-gray-50" value={row.basicSalary} onChange={e => handleRowChange(idx, 'basicSalary', e.target.value)} placeholder="Basic Salary" />
                <Input type="number" className="rounded-xl bg-gray-50" value={row.allowances} onChange={e => handleRowChange(idx, 'allowances', e.target.value)} placeholder="Allowances" />
                <Input type="number" className="rounded-xl bg-gray-50" value={row.bonus} onChange={e => handleRowChange(idx, 'bonus', e.target.value)} placeholder="Bonus" />
                <Input type="number" className="rounded-xl bg-gray-50" value={row.overtime} onChange={e => handleRowChange(idx, 'overtime', e.target.value)} placeholder="Overtime" />
                <Input type="number" className="rounded-xl bg-gray-50" value={row.deductionsStat} onChange={e => handleRowChange(idx, 'deductionsStat', e.target.value)} placeholder="Statutory Ded." />
                <Input type="number" className="rounded-xl bg-gray-50" value={row.deductionsOther} onChange={e => handleRowChange(idx, 'deductionsOther', e.target.value)} placeholder="Other Ded." />
                <Input type="text" className="rounded-xl bg-gray-100 font-semibold text-blue-900 text-center" value={row.netPay.toLocaleString()} readOnly tabIndex={-1} />
              </div> */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
                {/* Basic Salary */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Basic Salary</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.basicSalary}
                    onChange={(e) =>
                      handleRowChange(idx, "basicSalary", e.target.value)
                    }
                  />
                </div>

                {/* Allowances */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Allowances</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.allowances}
                    onChange={(e) =>
                      handleRowChange(idx, "allowances", e.target.value)
                    }
                  />
                </div>

                {/* Bonus */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bonus</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.bonus}
                    onChange={(e) =>
                      handleRowChange(idx, "bonus", e.target.value)
                    }
                  />
                </div>

                {/* Overtime */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Overtime</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.overtime}
                    onChange={(e) =>
                      handleRowChange(idx, "overtime", e.target.value)
                    }
                  />
                </div>

                {/* Statutory Ded. */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Statutory Ded.</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.deductionsStat}
                    onChange={(e) =>
                      handleRowChange(idx, "deductionsStat", e.target.value)
                    }
                  />
                </div>

                {/* Other Ded. */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Other Ded.</p>
                  <Input
                    type="number"
                    className="rounded-xl bg-gray-50"
                    value={row.deductionsOther}
                    onChange={(e) =>
                      handleRowChange(idx, "deductionsOther", e.target.value)
                    }
                  />
                </div>

                {/* Net Pay */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Net Pay</p>
                  <Input
                    type="text"
                    className="rounded-xl bg-gray-100 font-semibold text-blue-900 text-center"
                    value={row.netPay.toLocaleString()}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payroll Summary */}
      <div className="bg-green-50 rounded-2xl p-4 mb-6">
        <div className="font-semibold text-base flex items-center gap-2 mb-4 text-green-900">
          <TrendingUp className="w-5 h-5 text-green-500" /> Payroll Summary
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <div>
              Total Basic Salary:{" "}
              <span className="font-semibold text-gray-700">
                ${totalBasic.toLocaleString()}
              </span>
            </div>
            <div>
              Total Allowances:{" "}
              <span className="font-semibold text-green-700">
                +${totalAllowances.toLocaleString()}
              </span>
            </div>
            <div>
              Total Bonus:{" "}
              <span className="font-semibold text-green-700">
                +${totalBonus.toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <div>
              Total Overtime:{" "}
              <span className="font-semibold text-green-700">
                +${totalOvertime.toLocaleString()}
              </span>
            </div>
            <div>
              Total Statutory Deductions:{" "}
              <span className="font-semibold text-red-600">
                -${totalDeductionsStat.toLocaleString()}
              </span>
            </div>
            <div>
              Total Other Deductions:{" "}
              <span className="font-semibold text-red-600">
                -${totalDeductionsOther.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-lg font-bold text-blue-900 mb-2">
          Total Net Pay: ${totalNetPay.toLocaleString()}
        </div>
        <div className="flex flex-wrap gap-4 items-center bg-white rounded-xl p-3 mt-2">
          <div>
            Employees Selected{" "}
            <span className="font-semibold">
              {selectedRows.length} of {rows.length} employees
            </span>
          </div>
          <div>
            Payment Method{" "}
            <span className="inline-block ml-2 px-2 py-1 rounded bg-gray-100 text-blue-700 font-medium">
              {paymentMethod}
            </span>
          </div>
          <div>
            Payment Date{" "}
            <span className="inline-block ml-2 px-2 py-1 rounded bg-gray-100 text-blue-700 font-medium">
              {dayjs(paymentDate).format("MMM DD, YYYY")}
            </span>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
        <div className="font-semibold mb-2 flex items-center gap-2 text-yellow-700">
          <Info className="w-5 h-5" /> Important Notice
        </div>
        <ul className="text-sm text-yellow-700 list-disc pl-5">
          <li>
            Once processed, this payroll cannot be reversed. Please review all
            details carefully.
          </li>
          <li>
            Payments will be scheduled for{" "}
            {dayjs(paymentDate).format("MMMM DD, YYYY")}.
          </li>
          <li>
            All selected employees will receive payment confirmations via email.
          </li>
          <li>Ensure sufficient funds are available in the company account.</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-violet-700 border-violet-300"
          disabled={isSubmitting}
          onClick={(e) => handleFormSubmit(e as any, true)}
        >
          Save as Draft
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || selectedRows.length === 0}
          className="bg-linear-to-r from-violet-500 to-blue-500 text-white font-semibold shadow"
        >
          {isSubmitting
            ? "Processing..."
            : `Process Payroll (${selectedRows.length} Employees)`}
        </Button>
      </div>
    </form>
  );
}
