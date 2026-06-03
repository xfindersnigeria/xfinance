import type { Metadata } from "next";
import { headers } from "next/headers";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";
import { ModalProvider } from "@/components/providers/ModalProvider";
import { getPublicCustomizationServer } from "@/lib/api/services/customizationService";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_DEFAULT_TITLE = "xFinance";
const APP_DEFAULT_DESCRIPTION =
  "Modern financial dashboard and management platform for tracking sales, purchases, and business analytics.";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = (headersList.get("x-forwarded-host") || headersList.get("host") || "").split(":")[0];

  const customization = await getPublicCustomizationServer(host);
  const siteName = customization.siteName?.trim() || null;

  const title = siteName ? `${siteName} — xFinance` : `${APP_DEFAULT_TITLE} | Financial Dashboard & Management Platform`;

  // Always point to the proxy route — it returns the custom favicon or falls
  // back to the static file. Browsers cache this per the Cache-Control header.
  const faviconHref = "/api/favicon";
  const icons: Metadata["icons"] = [
    { rel: "icon", url: faviconHref },
    { rel: "shortcut icon", url: faviconHref },
    { rel: "apple-touch-icon", url: faviconHref },
  ];

  return {
    title,
    description: APP_DEFAULT_DESCRIPTION,
    icons,
    ...(siteName && {
      openGraph: {
        siteName,
        title,
        description: APP_DEFAULT_DESCRIPTION,
        ...(customization.faviconUrl && { images: [{ url: customization.faviconUrl }] }),
      },
    }),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${geistMono.variable} antialiased font-sans`}>
        <QueryProvider>
          <ModalProvider>
            <main className="bg-background-subtle min-h-screen">{children}</main>
          </ModalProvider>
        </QueryProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
