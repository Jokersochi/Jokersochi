import { NextResponse } from "next/server";
import { createProperty, listProperties } from "../../../lib/services/property-service";

export async function GET() {
  const data = await listProperties();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = await createProperty(body);
  return NextResponse.json({ data }, { status: 201 });
}
