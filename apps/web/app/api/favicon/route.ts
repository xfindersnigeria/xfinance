import { NextRequest, NextResponse } from "next/server";
import { getPublicCustomizationServer } from "@/lib/api/services/customizationService";

// Proxies the per-subdomain favicon from Cloudinary.
// Referenced by generateMetadata in app/layout.tsx via icons.url = "/api/favicon".
// Falls back to the static /favicon.ico when no custom favicon is configured.
export async function GET(req: NextRequest) {
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  ).split(":")[0];

  const customization = await getPublicCustomizationServer(host);

  if (!customization.faviconUrl) {
    return NextResponse.redirect(new URL("/favicon.ico", req.url), {
      status: 302,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const upstream = await fetch(customization.faviconUrl, {
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) throw new Error("upstream failed");

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/x-icon";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/favicon.ico", req.url), {
      status: 302,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
