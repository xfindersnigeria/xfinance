"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { fiscalCalendarData, periodCloseData } from "./SettingsColumn";
import CurrencySettings from "./currency";

export default function Settings() {
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState<string>("");

  const handleOpenModal = (type: string) => {
    setModalType(type);
    setOpen(true);
  };

  const handleModalClose = (value: boolean) => {
    setOpen(value);
    if (!value) setModalType("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Closed":
        return "bg-green-100 text-green-800";
      case "Open":
        return "bg-blue-100 text-blue-800";
      case "In Review":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Fiscal Calendar Section */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Fiscal Calendar</h3>
          <Button onClick={() => handleOpenModal("fiscal")}>Edit</Button>
        </div>
        {fiscalCalendarData.map((calendar) => (
          <div key={calendar.id} className="space-y-2">
            <p className="text-sm">
              <strong>Fiscal Year:</strong> {calendar.fiscalYear}
            </p>
            <p className="text-sm">
              <strong>Period:</strong> {calendar.startDate} to {calendar.endDate}
            </p>
            <p className="text-sm">
              <strong>Periods:</strong> {calendar.periods.length} periods
            </p>
          </div>
        ))}
      </div>

      {/* Currency & FX Section */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Currency & FX Settings</h3>
        <CurrencySettings />
      </div>

      {/* Period Close Section */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Period Close</h3>
          <Button onClick={() => handleOpenModal("period")}>Close Period</Button>
        </div>
        <div className="space-y-3">
          {periodCloseData.map((period) => (
            <div
              key={period.id}
              className="flex items-center justify-between p-3 border rounded-md"
            >
              <div>
                <p className="text-sm font-medium">{period.period}</p>
                {period.closedDate && (
                  <p className="text-xs text-gray-500">
                    Closed: {period.closedDate}
                  </p>
                )}
                {period.reviewedBy && (
                  <p className="text-xs text-gray-500">
                    Reviewed by: {period.reviewedBy}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(period.status)}>
                {period.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <CustomModal
        open={open}
        onOpenChange={handleModalClose}
        title={
          modalType === "fiscal" ? "Edit Fiscal Calendar" : "Close Period"
        }
        module={MODULES.SETTINGS}
      >
        <div className="space-y-4">
          {modalType === "fiscal" && (
            <>
              <input
                type="text"
                placeholder="Fiscal Year"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="date"
                placeholder="Start Date"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="date"
                placeholder="End Date"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </>
          )}

          {modalType === "period" && (
            <>
              <select className="w-full px-3 py-2 border rounded-md text-sm">
                <option>Select Period</option>
                <option>January 2026</option>
                <option>December 2025</option>
                <option>November 2025</option>
              </select>
              <textarea
                placeholder="Close Notes"
                className="w-full px-3 py-2 border rounded-md text-sm h-20"
              />
            </>
          )}

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => handleModalClose(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleModalClose(false)}>Save</Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
