import { NextResponse } from "next/server";
import { generateSellerReply } from "../../../../lib/ai/classifier";
import { validatePriceOffer } from "../../../../shared/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    validatePriceOffer(body.proposed_price ?? 9000000, body.price_floor ?? 8500000);

    const reply = generateSellerReply({
      message: body.message ?? "",
      hasPhone: Boolean(body.has_phone),
      priceFloor: Number(body.price_floor ?? 8500000),
      passport: body.passport_json ?? {
        rooms: null,
        area: null,
        floor: null,
        renovation: null,
        documents: "уточнить у владельца",
        description: "Пилотный объект для AI Realtor MVP"
      }
    });

    return NextResponse.json({ ok: true, data: { reply } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
