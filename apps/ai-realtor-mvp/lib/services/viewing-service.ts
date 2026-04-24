import type { Viewing } from "../../shared/types";
import { viewingCreateSchema } from "../../shared/validators";
import { getServiceSupabase } from "../supabase/server";
import { writeAuditLog } from "./audit-service";

export async function listViewings(): Promise<Viewing[]> {
  const db = getServiceSupabase();
  if (!db) return [];
  const { data, error } = await db.from("viewings").select("*").order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Viewing[];
}

export async function createViewing(payload: unknown) {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const valid = viewingCreateSchema.parse(payload);
  const start = new Date(valid.scheduled_at);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const { data, error } = await db.from("viewings").insert({
    lead_id: valid.lead_id,
    property_id: valid.property_id,
    scheduled_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "awaiting_confirmation",
    confirmation_status: "pending"
  }).select("*").single();

  if (error) throw new Error(error.message);
  await writeAuditLog("viewing", data.id, "viewing_created", valid as unknown as Record<string, unknown>);
  return data as Viewing;
}

export async function confirmViewing(id: string) {
  return patchViewing(id, { status: "confirmed", confirmation_status: "confirmed", confirmed_at: new Date().toISOString() }, "viewing_confirmed");
}

export async function cancelViewing(id: string) {
  return patchViewing(id, { status: "cancelled", confirmation_status: "cancelled", cancelled_at: new Date().toISOString() }, "viewing_cancelled");
}

export async function completeViewing(id: string, noShow = false) {
  return patchViewing(
    id,
    { status: noShow ? "no_show" : "completed", no_show_flag: noShow, completed_at: new Date().toISOString() },
    noShow ? "viewing_no_show" : "viewing_completed"
  );
}

async function patchViewing(id: string, patch: Record<string, unknown>, auditType: string) {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const { data, error } = await db.from("viewings").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  await writeAuditLog("viewing", id, auditType, patch);
  return data as Viewing;
}
