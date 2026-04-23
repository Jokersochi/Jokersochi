import { NextResponse } from "next/server";
import { listLeads } from "../../../lib/services/lead-service";

export async function GET() {
  const data = await listLeads();
  return NextResponse.json({ data });
}
