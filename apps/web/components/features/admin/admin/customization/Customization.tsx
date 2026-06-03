"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, Palette, X, Globe } from "lucide-react";
import { toast } from "sonner";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGIN_BG_MAX_BYTES = 5 * 1024 * 1024;
const FAVICON_MAX_BYTES = 512 * 1024; // 512 KB

import { useCustomization, useUpdateCustomization } from "@/lib/api/hooks/useCustomization";
import { isValidHex, DEFAULT_PRIMARY } from "@/lib/utils/colorUtils";
import { useSessionStore } from "@/lib/store/session";

const PRESET_COLORS = [
  "#4152B6", "#1a56db", "#0e9f6e", "#e74694",
  "#9061f9", "#e3a008", "#f05252", "#057a55",
];

export default function Customization() {
  const { data: record, isLoading } = useCustomization();
  const { mutate: save, isPending } = useUpdateCustomization();
  const whoamiCustomization = useSessionStore((state) => state.whoami?.customization);

  const [primaryColor, setPrimaryColor] = useState(whoamiCustomization?.primaryColor ?? DEFAULT_PRIMARY);
  const [hexInput, setHexInput] = useState(whoamiCustomization?.primaryColor ?? DEFAULT_PRIMARY);
  const [siteName, setSiteName] = useState(whoamiCustomization?.siteName ?? "");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(whoamiCustomization?.logoUrl ?? null);
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(whoamiCustomization?.loginBgUrl ?? null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(whoamiCustomization?.faviconUrl ?? null);

  const logoRef = useRef<HTMLInputElement>(null);
  const loginBgRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!record) return;
    if (record.primaryColor) { setPrimaryColor(record.primaryColor); setHexInput(record.primaryColor); }
    if (record.siteName !== undefined) setSiteName(record.siteName ?? "");
    if (!logoFile && record.logoUrl) setLogoPreview(record.logoUrl);
    if (!loginBgFile && record.loginBgUrl) setLoginBgPreview(record.loginBgUrl);
    if (!faviconFile && record.faviconUrl) setFaviconPreview(record.faviconUrl);
  }, [record]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleColorChange(hex: string) { setPrimaryColor(hex); setHexInput(hex); }
  function handleHexInput(value: string) { setHexInput(value); if (isValidHex(value)) setPrimaryColor(value); }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File) => void,
    previewSetter: (url: string) => void,
    maxBytes: number,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > maxBytes) {
      toast.error(`File too large. Maximum allowed size is ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }
    setter(file);
    previewSetter(URL.createObjectURL(file));
  }

  function handleSave() {
    save(
      {
        data: { primaryColor, siteName: siteName || undefined },
        logoFile: logoFile ?? undefined,
        loginBgFile: loginBgFile ?? undefined,
        faviconFile: faviconFile ?? undefined,
      },
      {
        onSuccess: (saved) => {
          setLogoFile(null);
          setLoginBgFile(null);
          setFaviconFile(null);
          setLogoPreview(saved.logoUrl ?? logoPreview);
          setLoginBgPreview(saved.loginBgUrl ?? loginBgPreview);
          setFaviconPreview(saved.faviconUrl ?? faviconPreview);
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

      {/* Site Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} /> Site Identity
          </CardTitle>
          <CardDescription>
            The site name appears in browser tab titles, bookmarks, and search results for your subdomain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Site Name</Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Acme Finance"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              Shown as: <span className="font-medium">{siteName || "Your Site Name"} — xFinance</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={18} /> Brand Color
          </CardTitle>
          <CardDescription>
            Controls buttons, active states, and highlights across the app.
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
              />
              <Input
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#4152B6"
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
              {isValidHex(hexInput) && hexInput !== DEFAULT_PRIMARY && (
                <button type="button" onClick={() => handleColorChange(DEFAULT_PRIMARY)}
                  className="text-xs text-muted-foreground hover:text-foreground underline">
                  Reset
                </button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" title={c} onClick={() => handleColorChange(c)}
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
          <CardTitle className="flex items-center gap-2"><Upload size={18} /> Logo</CardTitle>
          <CardDescription>Displayed in the sidebar and login page. PNG/SVG recommended. Max 2 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logoPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Logo preview" className="h-14 w-auto max-w-[200px] rounded-lg object-contain border bg-white p-1" />
              <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
            <Upload size={14} className="mr-2" />{logoPreview ? "Change Logo" : "Upload Logo"}
          </Button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview, LOGO_MAX_BYTES)} />
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload size={18} /> Favicon</CardTitle>
          <CardDescription>
            Shown in browser tabs and bookmarks for your subdomain. Use a square image (ICO, PNG, or SVG). Max 512 KB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faviconPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconPreview} alt="Favicon preview" className="w-10 h-10 rounded border bg-white p-1 object-contain" />
              <button type="button" onClick={() => { setFaviconFile(null); setFaviconPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()}>
            <Upload size={14} className="mr-2" />{faviconPreview ? "Change Favicon" : "Upload Favicon"}
          </Button>
          <input ref={faviconRef} type="file" accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml" className="hidden"
            onChange={(e) => handleFileChange(e, setFaviconFile, setFaviconPreview, FAVICON_MAX_BYTES)} />
        </CardContent>
      </Card>

      {/* Login Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload size={18} /> Login Page Image</CardTitle>
          <CardDescription>The illustration on the login screen left panel. 1000×800px recommended. Max 5 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loginBgPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loginBgPreview} alt="Login background preview" className="w-40 h-24 rounded-lg object-cover border" />
              <button type="button" onClick={() => { setLoginBgFile(null); setLoginBgPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => loginBgRef.current?.click()}>
            <Upload size={14} className="mr-2" />{loginBgPreview ? "Change Image" : "Upload Image"}
          </Button>
          <input ref={loginBgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileChange(e, setLoginBgFile, setLoginBgPreview, LOGIN_BG_MAX_BYTES)} />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="min-w-28">
          {isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Saving…</> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
