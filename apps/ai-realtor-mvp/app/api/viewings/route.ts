import { NextResponse } from "next/server";
import { listViewings } from "../../../lib/services/viewing-service";

export async function GET() {
  const data = await listViewings();
  return NextResponse.json({ data });
}
