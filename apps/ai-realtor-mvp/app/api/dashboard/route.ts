import { NextResponse } from "next/server";
import { getDashboardMetrics } from "../../../lib/services/dashboard-service";

export async function GET() {
  const data = await getDashboardMetrics();
  return NextResponse.json({ data });
}
