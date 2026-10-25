import { NextResponse } from "next/server";
import { PSP_MODE } from "@/lib/config";
import { initStore, USE_PG } from "@/lib/store";

// GET /api/health — uptime + readiness check
export async function GET() {
  try {
    await initStore();
    return NextResponse.json({
      status: "ok",
      psp_mode: PSP_MODE,
      storage: USE_PG ? "postgres" : "sqlite",
      time: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: e.message }, { status: 500 });
  }
}
