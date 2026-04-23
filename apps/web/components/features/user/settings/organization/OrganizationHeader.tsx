"use client";

import React from "react";

export default function OrganizationHeader() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Organization Settings
          </h2>
          <p className="text-muted-foreground">
            Configure entity-level settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button> */}
          {/* <Button onClick={() => setOpen(true)} className="rounded-xl">
            <Plus /> Add Account
          </Button> */}
        </div>
      </div>
    </div>
  );
}
