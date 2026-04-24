import { NextResponse } from "next/server";
import { createProperty, listProperties } from "../../../lib/services/property-service";

export async function GET() {
  const data = await listProperties();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createProperty(body);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
