import { apiClient } from "@/lib/api/client";
import { GroupCustomization } from "@/lib/utils/colorUtils";

export interface CustomizationRecord {
  groupId: string;
  primaryColor: string | null;
  logoPublicId: string | null;
  logoUrl: string | null;
  loginBgPublicId: string | null;
  loginBgUrl: string | null;
  siteName: string | null;
  faviconPublicId: string | null;
  faviconUrl: string | null;
}

export const getCustomization = async (): Promise<CustomizationRecord> =>
  apiClient<CustomizationRecord>("settings/customization", { method: "GET" });

export const updateCustomization = async (
  data: { primaryColor?: string; siteName?: string },
  logoFile?: File,
  loginBgFile?: File,
  faviconFile?: File,
): Promise<CustomizationRecord> => {
  const form = new FormData();
  if (data.primaryColor) form.append("primaryColor", data.primaryColor);
  if (data.siteName !== undefined) form.append("siteName", data.siteName);
  if (logoFile) form.append("logo", logoFile);
  if (loginBgFile) form.append("loginBg", loginBgFile);
  if (faviconFile) form.append("favicon", faviconFile);

  return apiClient<CustomizationRecord>("settings/customization", {
    method: "PATCH",
    body: form,
  });
};

/** Server-side only — called from layouts and the login page server component. */
export async function getPublicCustomizationServer(host: string): Promise<GroupCustomization> {
  const DEFAULT: GroupCustomization = {
    primaryColor: "#4152B6",
    logoUrl: "/images/logo.png",
    loginBgUrl: "/images/auth.jpg",
    siteName: null,
    faviconUrl: null,
  };
  try {
    const apiUrl = process.env.API_URL || "http://localhost:3000";
    const res = await fetch(`${apiUrl}/api/v1/public/customization`, {
      headers: { "X-Forwarded-Host": host },
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT;
    const json = await res.json();
    const d = json.data ?? json;
    return {
      primaryColor: d?.primaryColor || DEFAULT.primaryColor,
      logoUrl: d?.logoUrl || DEFAULT.logoUrl,
      loginBgUrl: d?.loginBgUrl || DEFAULT.loginBgUrl,
      siteName: d?.siteName ?? null,
      faviconUrl: d?.faviconUrl ?? null,
    };
  } catch {
    return DEFAULT;
  }
}
