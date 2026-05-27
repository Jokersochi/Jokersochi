import { getServiceSupabase } from "../supabase/server";

export async function getIdempotentResponse(operation: string, idempotencyKey: string) {
  const db = getServiceSupabase();
  if (!db) return null;

  const { data } = await db
    .from("api_idempotency_keys")
    .select("response_json")
    .eq("operation", operation)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  return data?.response_json ?? null;
}

export async function saveIdempotentResponse(operation: string, idempotencyKey: string, responseJson: Record<string, unknown>) {
  const db = getServiceSupabase();
  if (!db) return;

  await db.from("api_idempotency_keys").upsert({
    operation,
    idempotency_key: idempotencyKey,
    response_json: responseJson
  }, { onConflict: "operation,idempotency_key" });
}
