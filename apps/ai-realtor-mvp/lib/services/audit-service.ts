import { getServiceSupabase } from "../supabase/server";

export async function writeAuditLog(entityType: string, entityId: string, actionType: string, payload: Record<string, unknown>) {
  const db = getServiceSupabase();
  if (!db) return;

  await db.from("audit_logs").insert({
    entity_type: entityType,
    entity_id: entityId,
    action_type: actionType,
    payload
  });
}
