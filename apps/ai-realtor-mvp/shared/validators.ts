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

export const propertyPassportSchema = z.object({
  rooms: z.number().nullable(),
  area: z.number().nullable(),
  floor: z.number().nullable(),
  renovation: z.string().nullable(),
  documents: z.string(),
  description: z.string()
});

const propertyBaseSchema = z.object({
  title: z.string().min(3),
  address: z.string().min(3),
  price_listing: z.number().positive(),
  price_floor: z.number().positive(),
  passport_json: propertyPassportSchema
});

export const propertyCreateSchema = propertyBaseSchema.refine((v) => v.price_floor <= v.price_listing, {
  message: "price_floor must be <= price_listing",
  path: ["price_floor"]
});

export const propertyUpdateSchema = propertyBaseSchema.partial().refine((v) => {
  if (v.price_floor === undefined || v.price_listing === undefined) return true;
  return v.price_floor <= v.price_listing;
}, {
  message: "price_floor must be <= price_listing",
  path: ["price_floor"]
});

export const leadInboundSchema = z.object({
  property_id: z.string().uuid(),
  external_id: z.string().optional(),
  source: z.string().min(2),
  name: z.string().optional(),
  phone: z.string().optional(),
  channel: z.string().min(2),
  message: z.string().min(1)
});

export const classifyResultSchema = z.object({
  temperature: leadTemperatureSchema,
  status: z.enum(["new", "in_conversation", "awaiting_phone", "viewing_requested", "escalated"]),
  should_escalate_to_owner: z.boolean(),
  reasons: z.array(z.string()).min(1)
});

export const viewingCreateSchema = z.object({
  lead_id: z.string().uuid(),
  property_id: z.string().uuid(),
  phone: z.string().min(10),
  scheduled_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  no_show_count: z.number().int().nonnegative().default(0),
  owner_manual_approval: z.boolean().default(false)
}).superRefine((v, ctx) => {
  const scheduledAt = new Date(v.scheduled_at).getTime();
  const now = Date.now();
  const minAllowed = now + 2 * 60 * 60 * 1000;
  if (scheduledAt < minAllowed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Viewing must be at least 2 hours ahead", path: ["scheduled_at"] });
  }

  const endMs = v.ends_at ? new Date(v.ends_at).getTime() : scheduledAt + 45 * 60 * 1000;
  const duration = endMs - scheduledAt;
  if (duration !== 45 * 60 * 1000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Viewing slot must be exactly 45 minutes", path: ["ends_at"] });
  }

  if (v.no_show_count >= 2 && !v.owner_manual_approval) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Owner confirmation required after 2 no-shows", path: ["owner_manual_approval"] });
  }
});

export const ownerSummarySchema = z.object({
  leadId: z.string().uuid(),
  summary: z.string().min(10).max(600),
  status: leadStatusSchema,
  temperature: leadTemperatureSchema,
  urgency: z.enum(["low", "medium", "high"])
});

export function validatePriceOffer(price: number, floor: number): void {
  if (price < floor) {
    throw new Error("AI price offer cannot be below price_floor");
  }
}
