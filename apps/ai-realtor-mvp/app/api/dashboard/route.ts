import { NextResponse } from "next/server";
import { getDashboardMetrics } from "../../../lib/services/dashboard-service";

export async function GET() {
  try {
    const data = await getDashboardMetrics();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
