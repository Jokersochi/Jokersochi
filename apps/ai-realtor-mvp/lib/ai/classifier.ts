import type { ClassifyResult, PropertyPassport } from "../../shared/types";

function includesAny(message: string, terms: string[]): boolean {
  const normalized = message.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function classifyLeadMessage(message: string, hasPhone: boolean): ClassifyResult {
  const lower = message.toLowerCase();

  const hotIntent = includesAny(lower, [
    "хочу посмотреть",
    "можно сегодня посмотреть",
    "можно завтра посмотреть",
    "документ",
    "бронь",
    "задат",
    "быстро выйти на сделку",
    "сделку",
    "посмотреть квартиру"
  ]);

  if (hotIntent) {
    return {
      temperature: "hot",
      status: hasPhone ? "viewing_requested" : "awaiting_phone",
      should_escalate_to_owner: true,
      reasons: ["Detected high-intent request related to viewing/docs/deal speed"]
    };
  }

  if (includesAny(lower, ["актуально", "дорого", "уступите", "скидк"])) {
    return {
      temperature: includesAny(lower, ["уступите", "скидк", "дорого"]) ? "warm" : "cold",
      status: "in_conversation",
      should_escalate_to_owner: false,
      reasons: ["General intent without clear action to schedule viewing"]
    };
  }

  return {
    temperature: "warm",
    status: "in_conversation",
    should_escalate_to_owner: false,
    reasons: ["Ongoing conversation"]
  };
}

export function generateSellerReply(input: {
  message: string;
  hasPhone: boolean;
  priceFloor: number;
  passport: PropertyPassport;
}): string {
  const { message, hasPhone, priceFloor, passport } = input;
  const lower = message.toLowerCase();

  if (!hasPhone && includesAny(lower, ["посмотреть", "показ", "сегодня", "завтра"])) {
    return "Показ возможен ежедневно с 10:00 до 18:00. Чтобы закрепить слот, пришлите номер телефона для подтверждения.";
  }

  if (includesAny(lower, ["документ"])) {
    return `По документам: сейчас в паспорте объекта указано «${passport.documents}». Это можно оперативно уточнить у владельца. Следующий шаг — согласовать показ.`;
  }

  if (includesAny(lower, ["скид", "уступ", "дешевле"])) {
    return `Цена в продаже 9 000 000 ₽, ниже ${priceFloor.toLocaleString("ru-RU")} ₽ обещать не могу. Если вам подходит просмотр, предложу ближайшие 2-3 слота.`;
  }

  return "Объект актуален. Могу предложить конкретные слоты показа сегодня/завтра, после подтверждения телефона.";
}
