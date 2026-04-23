import { z } from "zod";

export const leadStatusSchema = z.enum([
  "new",
  "in_conversation",
  "awaiting_phone",
  "viewing_requested",
  "viewing_scheduled",
  "viewing_confirmed",
  "viewing_done",
  "paused",
  "escalated",
  "closed"
]);

export const leadTemperatureSchema = z.enum(["cold", "warm", "hot"]);

export const viewingStatusSchema = z.enum([
  "requested",
  "awaiting_confirmation",
  "confirmed",
  "completed",
  "cancelled",
  "no_show"
]);

export const propertySchema = z.object({
  title: z.string().min(3),
  address: z.string().min(5),
  price_listing: z.number().int().positive(),
  price_floor: z.number().int().positive(),
  passport_json: z.record(z.unknown()).default({})
}).refine((value) => value.price_floor <= value.price_listing, {
  message: "price_floor must be lower or equal to price_listing",
  path: ["price_floor"]
});

export const leadClassifyResponseSchema = z.object({
  temperature: leadTemperatureSchema,
  status: z.enum(["new", "in_conversation", "awaiting_phone", "viewing_requested", "escalated"]),
  should_escalate_to_whatsapp: z.boolean(),
  reasons: z.array(z.string()).min(1)
});

export const scheduleViewingSchema = z.object({
  lead_id: z.string().uuid(),
  property_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  phone: z.string().min(10)
});
