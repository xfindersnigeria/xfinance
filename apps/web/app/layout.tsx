import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";
import { ModalProvider } from "@/components/providers/ModalProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xFinance | Financial Dashboard & Management Platform",
  description:
    "xFinance is a modern financial dashboard and management platform for tracking sales, purchases, products, and business analytics. Empower your business with real-time insights and streamlined operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${geistMono.variable} antialiased font-sans`}
      >
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
