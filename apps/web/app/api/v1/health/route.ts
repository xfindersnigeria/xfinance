import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("GET /api/v1/health called", request);
  return NextResponse.json({ status: "ok" });
}