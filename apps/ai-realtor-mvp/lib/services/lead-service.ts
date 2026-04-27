import { classifyLeadMessage } from "../ai/classifier";
import { leadInboundSchema } from "../../shared/validators";
import type { Lead, LeadMessage } from "../../shared/types";
import { getServiceSupabase } from "../supabase/server";
import { writeAuditLog } from "./audit-service";

export async function listLeads(): Promise<Lead[]> {
  const db = getServiceSupabase();
  if (!db) return [];
  const { data, error } = await db.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export async function patchLead(id: string, payload: Partial<Lead>) {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const { data, error } = await db.from("leads").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  await writeAuditLog("lead", data.id, "lead_patched", payload as Record<string, unknown>);
  return data as Lead;
}

export async function saveLeadMessage(payload: Omit<LeadMessage, "id" | "created_at">) {
  const db = getServiceSupabase();
  if (!db) return null;
  const { data } = await db.from("lead_messages").insert(payload).select("*").single();
  return data as LeadMessage;
}

export async function upsertInboundLead(payload: unknown) {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const valid = leadInboundSchema.parse(payload);

  const query = db.from("leads").select("*").eq("source", valid.source).limit(1);
  if (valid.external_id) query.eq("external_id", valid.external_id);
  else if (valid.phone) query.eq("phone", valid.phone);

  const { data: existing } = await query.maybeSingle();

  const classification = classifyLeadMessage(valid.message, Boolean(valid.phone));

  let lead: Lead;
  if (existing) {
    const { data, error } = await db.from("leads").update({
      phone: valid.phone ?? existing.phone,
      name: valid.name ?? existing.name,
      status: classification.status,
      temperature: classification.temperature,
      escalated_to_owner: classification.should_escalate_to_owner,
      last_message_at: new Date().toISOString()
    }).eq("id", existing.id).select("*").single();
    if (error) throw new Error(error.message);
    lead = data as Lead;
  } else {
    const { data, error } = await db.from("leads").insert({
      property_id: valid.property_id,
      external_id: valid.external_id ?? null,
      source: valid.source,
      name: valid.name,
      phone: valid.phone ?? null,
      channel: valid.channel,
      first_message: valid.message,
      temperature: classification.temperature,
      status: classification.status,
      escalated_to_owner: classification.should_escalate_to_owner,
      last_message_at: new Date().toISOString()
    }).select("*").single();
    if (error) throw new Error(error.message);
    lead = data as Lead;
  }

  await saveLeadMessage({
    lead_id: lead.id,
    external_message_id: valid.external_id ?? null,
    direction: "inbound",
    channel: valid.channel,
    message_text: valid.message,
    ai_generated: false,
    metadata_json: {}
  });

  await writeAuditLog("lead", lead.id, "lead_inbound_upserted", classification as unknown as Record<string, unknown>);
  return { lead, classification };
}
