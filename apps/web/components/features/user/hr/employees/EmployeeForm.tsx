"use client";

import React, { useEffect } from "react";
import { useCreateEmployee, useUpdateEmployee } from "@/lib/api/hooks/useHR";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { employeeSchema } from "./utils/schema";
import { useDepartments } from "@/lib/api/hooks/useSettings";

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: Partial<any> & { id?: string };
  isEditMode?: boolean;
  onSuccess?: () => void;
}

export default function EmployeeForm({
  employee,
  isEditMode = false,
  onSuccess,
}: EmployeeFormProps) {
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const { data: departmentsData, isLoading: departmentsLoading } =
    useDepartments();

  console.log(departmentsData);

  const departments = (departmentsData as any)?.data || [];

  //   const departments =[{
  //     id: "ddd",
  //     name: "dd",
  //   },
  // {
  //     id: "ddd",
  //     name: "dd",
  //   }]
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      profilePicture: employee?.profilePicture || undefined,
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      email: employee?.email || "",
      phoneNumber: employee?.phoneNumber || "",
      dateOfBirth: employee?.dateOfBirth || "",
      // employeeId: employee?.employeeId || "",
      departmentId: employee?.departmentId || "",
      jobTitle: employee?.jobTitle || "",
      employmentType: employee?.employmentType || "Full-time",
      hireDate: employee?.hireDate || "",
      reportsTo: employee?.reportsTo || "",
      annualLeaveDays: employee?.annualLeaveDays || 20,
      baseSalary: employee?.baseSalary || 0,
      allowances: employee?.allowances || 0,
      payFrequency: employee?.payFrequency || "Monthly",
      currency: employee?.currency || "NGN - Nige",
      bankName: employee?.bankName || "",
      accountType: employee?.accountType || "Checking",
      accountNumber: employee?.accountNumber || "",
      routingNumber: employee?.routingNumber || "",
      address: employee?.address || "",
      city: employee?.city || "",
      state: employee?.state || "",
      postalCode: employee?.postalCode || "",
      country: employee?.country || "",
      emergencyContactName: employee?.emergencyContactName || "",
      emergencyContactPhone: employee?.emergencyContactPhone || "",
      emergencyContactRelationship:
        employee?.emergencyContactRelationship || "",
      note: employee?.note || "",
    },
  });

  useEffect(() => {
    // Reset when employee prop changes (edit mode)
    if (employee) {
      form.reset({
        profilePicture: employee?.profilePicture || undefined,
        firstName: employee?.firstName || "",
        lastName: employee?.lastName || "",
        email: employee?.email || "",
        phoneNumber: employee?.phoneNumber || "",
        dateOfBirth: employee?.dateOfBirth || "",
        // employeeId: employee?.employeeId || "",
        departmentId: employee?.departmentId || "",
        jobTitle: employee?.jobTitle || "",
        employmentType: employee?.employmentType || "Full-time",
        hireDate: employee?.hireDate || "",
        reportsTo: employee?.reportsTo || "",
        annualLeaveDays: employee?.annualLeaveDays || 20,
        baseSalary: employee?.baseSalary || 0,
        allowances: employee?.allowances || 0,
        payFrequency: employee?.payFrequency || "Monthly",
        currency: employee?.currency || "NGN - Nige",
        bankName: employee?.bankName || "",
        accountType: employee?.accountType || "Checking",
        accountNumber: employee?.accountNumber || "",
        routingNumber: employee?.routingNumber || "",
        address: employee?.address || "",
        city: employee?.city || "",
        state: employee?.state || "",
        postalCode: employee?.postalCode || "",
        country: employee?.country || "",
        emergencyContactName: employee?.emergencyContactName || "",
        emergencyContactPhone: employee?.emergencyContactPhone || "",
        emergencyContactRelationship:
          employee?.emergencyContactRelationship || "",
        note: employee?.note || "",
      });
    }
  }, [employee]);

  const onSubmit = async (values: EmployeeFormData) => {
    try {
      const formData = new FormData();

      // Basic fields
      formData.append("firstName", values.firstName || "");
      formData.append("lastName", values.lastName || "");
      formData.append("email", values.email || "");
      formData.append("phoneNumber", values.phoneNumber || "");
      formData.append(
        "dateOfBirth",
        values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : "",
      );
      // formData.append("employeeId", values.employeeId || "");
      formData.append("departmentId", values.departmentId || "");
      formData.append("position", values.jobTitle || "");
      formData.append("employmentType", values.employmentType || "");
      formData.append(
        "dateOfHire",
        values.hireDate ? new Date(values.hireDate).toISOString() : "",
      );
      formData.append("reportingManager", values.reportsTo || "");
      formData.append("anualLeave", String(values.annualLeaveDays || 0));
      formData.append(
        "salary",
        String(Math.round(Number(values.baseSalary)) || 0),
      );
      formData.append(
        "allowances",
        String(Math.round(Number(values.allowances)) || 0),
      );
      formData.append("perFrequency", values.payFrequency || "");
      formData.append("currency", values.currency || "");
      formData.append("bankName", values.bankName || "");
      formData.append("acountType", values.accountType || "");
      formData.append("accountNumber", values.accountNumber || "");
      formData.append("routingNumber", values.routingNumber || "");
      formData.append("note", values.note || "");

      // Address Info as JSON
      formData.append(
        "addressInfo",
        JSON.stringify({
          address: values.address || "",
          city: values.city || "",
          province: values.state || "",
          postalCode: values.postalCode || "",
          country: values.country || "",
        }),
      );

      // Emergency Contact as JSON
      formData.append(
        "emergencyContact",
        JSON.stringify({
          contactName: values.emergencyContactName,
          contactPhone: values.emergencyContactPhone,
          relationship: values.emergencyContactRelationship,
        }),
      );

      // Profile Picture (if it's a File)
      if (values.profilePicture instanceof File) {
        formData.append("profileImage", values.profilePicture);
      }

      if (isEditMode && employee?.id) {
        await updateEmployee.mutateAsync({ id: employee.id, formData });
      } else {
        await createEmployee.mutateAsync(formData);
      }
    } catch (error) {
      // error handled below
    }
  };

  useEffect(() => {
    if (createEmployee.isSuccess || updateEmployee.isSuccess) {
      toast.success("Employee saved successfully");
      if (onSuccess) onSuccess();
    }
    if (createEmployee.isError) {
      toast.error(createEmployee.error?.message || "Failed to create employee");
    }
    if (updateEmployee.isError) {
      toast.error(updateEmployee.error?.message || "Failed to update employee");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    createEmployee.isSuccess,
    createEmployee.isError,
    updateEmployee.isSuccess,
    updateEmployee.isError,
  ]);

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-blue-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">📝</span> Basic Information
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Picture Upload */}
              <FormField
                control={form.control}
                name="profilePicture"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Profile Picture</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Recommended: Square image, at least 400x400px
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Auto-generated if left blank"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-indigo-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">🎁</span> Employment Details
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Department</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue
                            placeholder={
                              departmentsLoading
                                ? "Loading..."
                                : "Select Department"
                            }
                          />{" "}
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dep: any) => (
                            <SelectItem key={dep.id} value={dep.id}>
                              {dep.name}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position/Job Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Accountant" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportsTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports To (Manager)</FormLabel>
                    <FormControl>
                      <Input placeholder="Select manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="annualLeaveDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Leave Days</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-green-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">💲</span> Compensation
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Salary *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowances</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Frequency *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="Annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="NGN - Nige" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-red-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">🏦</span> Bank Details
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Checking">Checking</SelectItem>
                          <SelectItem value="Savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="routingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Routing number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-blue-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">📍</span> Address Information
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP/Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-orange-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">🧑‍🤝‍🧑</span> Emergency Contact
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 987-6543" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Select relationship" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-cyan-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-lg">🗒️</span> Additional Information
            </h6>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the employee..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Important Notes and Actions */}
          <div className="bg-violet-50 p-4 rounded-xl">
            <div className="mb-2 text-sm text-blue-900 flex items-start gap-2">
              <span className="mt-1">ℹ️</span>
              <ul className="list-disc ml-4">
                <li>All required fields must be completed before submitting</li>
                <li>Employee ID will be auto-generated if not provided</li>
                <li>
                  Ensure all contact information is accurate for payroll and
                  communication
                </li>
                <li>Employee records can be edited after creation</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            {/* <Button onClick={() => onSuccess?.()} variant={"outline"}>Cancel</Button> */}
            {/* <Button type="button" variant="secondary">
              Save as Draft
            </Button> */}
            <Button
              type="submit"
              className="bg-linear-to-r from-indigo-500 to-purple-500 text-white"
              disabled={createEmployee.isPending || updateEmployee.isPending}
            >
              {createEmployee.isPending || updateEmployee.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  <span>Please wait</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? "Update Employee" : "Add Employee"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
