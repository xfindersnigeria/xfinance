"use client";

import SetupConfigHeader from "./SetupConfigHeader";
import GeneralConfigForm from "./GeneralConfigForm";
import GeneralPreferenceForm from "./GeneralPreferenceForm";

export default function SetupConfig() {
  return (
    <div className="space-y-4">
      <SetupConfigHeader />

      <GeneralConfigForm />
      <GeneralPreferenceForm />
    </div>
  );
}
