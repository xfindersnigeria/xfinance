"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { integrationsData, getStatusColor } from "./IntegrationsColumn";

export default function Integrations() {
  const [open, setOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");

  const handleConfigureClick = (id: string) => {
    setSelectedIntegration(id);
    setOpen(true);
  };

  const handleModalClose = (value: boolean) => {
    setOpen(value);
    if (!value) setSelectedIntegration("");
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600">
        Manage integrations with external systems to enhance functionality and
        streamline data flow.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {integrationsData.map((integration) => (
          <div
            key={integration.id}
            className="border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{integration.icon}</div>
              <Badge className={getStatusColor(integration.status)}>
                {integration.status}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-2">{integration.title}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {integration.description}
            </p>

            {integration.configuredDate && (
              <p className="text-xs text-gray-500 mb-4">
                Configured: {integration.configuredDate}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleConfigureClick(integration.id)}
              >
                {integration.status === "Connected"
                  ? "Reconfigure"
                  : "Configure"}
              </Button>
              {integration.status === "Connected" && (
                <Button size="sm" variant="outline">
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CustomModal
        open={open}
        onOpenChange={handleModalClose}
        title={`Configure Integration`}
        module={MODULES.ENTITY}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Enter the configuration details for this integration.
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="API Key"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="API URL"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <textarea
              placeholder="Additional Configuration"
              className="w-full px-3 py-2 border rounded-md text-sm h-24"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => handleModalClose(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleModalClose(false)}>Save Configuration</Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
