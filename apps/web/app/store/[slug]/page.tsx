import type { Metadata } from "next";
import { headers } from "next/headers";
import StoreFront from "./StoreFront";

type Params = { slug: string };

/** Public storefront — no login, no dashboard chrome (see proxy.ts) */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const headersObj = await headers();
    const protocol = headersObj.get("x-forwarded-proto") || "http";
    const host = headersObj.get("host");
    const res = await fetch(`${protocol}://${host}/backend/public/store/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { title: "Store not found" };
    const body = await res.json();
    const store = body?.data?.data?.store;
    if (!store?.name) return { title: "Online Store" };
    return {
      title: `${store.name} — Online Store`,
      description: `Browse and order from ${store.name}.`,
      ...(store.logoUrl && { openGraph: { title: store.name, images: [{ url: store.logoUrl }] } }),
    };
  } catch {
    return { title: "Online Store" };
  }
}

export default async function StorePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <StoreFront slug={slug} />;
}
