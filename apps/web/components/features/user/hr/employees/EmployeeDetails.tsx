"use client";

import React from "react";
import { Employee } from "./utils/types";

interface EmployeeDetailsProps {
  employee: Employee;
}

export default function EmployeeDetails({ employee }: EmployeeDetailsProps) {
  // TODO: Implement colored segments for each section
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Name:</strong> {employee.firstName} {employee.lastName}</div>
          <div><strong>Email:</strong> {employee.email}</div>
          <div><strong>Phone:</strong> {employee.phoneNumber}</div>
          <div><strong>Date of Birth:</strong> {employee.dateOfBirth}</div>
        </div>
      </div>
      <div className="bg-green-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Employment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Employee ID:</strong> {employee.employeeId}</div>
          <div><strong>Department:</strong> {employee.department}</div>
          <div><strong>Position:</strong> {employee.position}</div>
          <div><strong>Employment Type:</strong> {employee.employmentType}</div>
          <div><strong>Date of Hire:</strong> {employee.dateOfHire}</div>
          <div><strong>Status:</strong> {employee.status}</div>
        </div>
      </div>
      <div className="bg-yellow-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Bank Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Bank Name:</strong> {employee.bankName}</div>
          <div><strong>Account Type:</strong> {employee.acountType}</div>
          <div><strong>Account Number:</strong> {employee.accountNumber}</div>
          <div><strong>Routing Number:</strong> {employee.routingNumber}</div>
        </div>
      </div>
      <div className="bg-purple-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Address:</strong> {employee.addressInfo?.address}</div>
          <div><strong>City:</strong> {employee.addressInfo?.city}</div>
          <div><strong>Province:</strong> {employee.addressInfo?.province}</div>
          <div><strong>Postal Code:</strong> {employee.addressInfo?.postalCode}</div>
          <div><strong>Country:</strong> {employee.addressInfo?.country}</div>
        </div>
      </div>
      <div className="bg-red-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Emergency Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Name:</strong> {employee.emergencyContact?.contactName}</div>
          <div><strong>Phone:</strong> {employee.emergencyContact?.contactPhone}</div>
          <div><strong>Relationship:</strong> {employee.emergencyContact?.relationship}</div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-2">Other</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Annual Leave:</strong> {employee.anualLeave}</div>
          <div><strong>Salary:</strong> {employee.salary}</div>
          <div><strong>Allowances:</strong> {employee.allowances}</div>
          <div><strong>Per Frequency:</strong> {employee.perFrequency}</div>
          <div><strong>Currency:</strong> {employee.currency}</div>
          <div><strong>Note:</strong> {employee.note}</div>
        </div>
      </div>
    </div>
  );
}
