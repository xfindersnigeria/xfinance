"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, Palette, X } from "lucide-react";
import { useCustomization, useUpdateCustomization } from "@/lib/api/hooks/useCustomization";
import { isValidHex, DEFAULT_PRIMARY } from "@/lib/utils/colorUtils";
import { useSessionStore } from "@/lib/store/session";

const PRESET_COLORS = [
  "#4152B6",
  "#1a56db",
  "#0e9f6e",
  "#e74694",
  "#9061f9",
  "#e3a008",
  "#f05252",
  "#057a55",
];

export default function Customization() {
  const { data: record, isLoading } = useCustomization();
  const { mutate: save, isPending } = useUpdateCustomization();

  // Immediate source from session store — available before the settings query resolves
  const whoamiCustomization = useSessionStore((state) => state.whoami?.customization);

  const [primaryColor, setPrimaryColor] = useState(
    whoamiCustomization?.primaryColor ?? DEFAULT_PRIMARY,
  );
  const [hexInput, setHexInput] = useState(
    whoamiCustomization?.primaryColor ?? DEFAULT_PRIMARY,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    whoamiCustomization?.logoUrl ?? null,
  );
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(
    whoamiCustomization?.loginBgUrl ?? null,
  );

  const logoRef = useRef<HTMLInputElement>(null);
  const loginBgRef = useRef<HTMLInputElement>(null);

  // Once the settings query resolves, sync with the DB record (authoritative source).
  // Only override color/previews if the record has saved non-null values —
  // avoids clobbering the correct whoami-seeded initial state with DEFAULT_PRIMARY.
  useEffect(() => {
    if (!record) return;
    if (record.primaryColor) {
      setPrimaryColor(record.primaryColor);
      setHexInput(record.primaryColor);
    }
    if (!logoFile && record.logoUrl) setLogoPreview(record.logoUrl);
    if (!loginBgFile && record.loginBgUrl) setLoginBgPreview(record.loginBgUrl);
  }, [record]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleColorChange(hex: string) {
    setPrimaryColor(hex);
    setHexInput(hex);
  }

  function handleHexInput(value: string) {
    setHexInput(value);
    if (isValidHex(value)) setPrimaryColor(value);
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File) => void,
    previewSetter: (url: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setter(file);
    previewSetter(URL.createObjectURL(file));
  }

  function handleSave() {
    save(
      {
        data: { primaryColor },
        logoFile: logoFile ?? undefined,
        loginBgFile: loginBgFile ?? undefined,
      },
      {
        onSuccess: (saved) => {
          // Clear staged file objects (already uploaded)
          setLogoFile(null);
          setLoginBgFile(null);
          // Sync previews: use server URL if returned, otherwise keep existing preview
          setLogoPreview(saved.logoUrl ?? logoPreview);
          setLoginBgPreview(saved.loginBgUrl ?? loginBgPreview);
        },
      },
    );
  }

  if (isLoading && !whoamiCustomization) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Theme Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={18} /> Brand Color
          </CardTitle>
          <CardDescription>
            Choose your group&apos;s primary color. This controls buttons, active states, and highlights across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg border shadow-sm flex-shrink-0 transition-colors"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Open color picker"
              />
              <Input
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#4152B6"
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
              {isValidHex(hexInput) && hexInput !== DEFAULT_PRIMARY && (
                <button
                  type="button"
                  onClick={() => handleColorChange(DEFAULT_PRIMARY)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => handleColorChange(c)}
                  className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: primaryColor === c ? "currentColor" : "transparent",
                    outline: primaryColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={18} /> Logo
          </CardTitle>
          <CardDescription>
            Displayed in the sidebar header and login page. Recommended: 180×180px PNG/SVG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logoPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-20 h-20 rounded-lg object-contain border bg-white p-1"
              />
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
            <Upload size={14} className="mr-2" />
            {logoPreview ? "Change Logo" : "Upload Logo"}
          </Button>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
          />
        </CardContent>
      </Card>

      {/* Login Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={18} /> Login Page Image
          </CardTitle>
          <CardDescription>
            The illustration shown on the left panel of the login screen. Recommended: 1000×800px.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loginBgPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={loginBgPreview}
                alt="Login background preview"
                className="w-40 h-24 rounded-lg object-cover border"
              />
              <button
                type="button"
                onClick={() => { setLoginBgFile(null); setLoginBgPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => loginBgRef.current?.click()}>
            <Upload size={14} className="mr-2" />
            {loginBgPreview ? "Change Image" : "Upload Image"}
          </Button>
          <input
            ref={loginBgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, setLoginBgFile, setLoginBgPreview)}
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="min-w-28">
          {isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving…</> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
