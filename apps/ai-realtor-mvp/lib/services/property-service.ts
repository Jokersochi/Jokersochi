import type { Property } from "../../shared/types";
import { propertyCreateSchema, propertyUpdateSchema } from "../../shared/validators";
import { getServiceSupabase } from "../supabase/server";
import { writeAuditLog } from "./audit-service";

export async function listProperties(): Promise<Property[]> {
  const db = getServiceSupabase();
  if (!db) return [];
  const { data, error } = await db.from("properties").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Property[];
}

export async function getProperty(id: string): Promise<Property | null> {
  const db = getServiceSupabase();
  if (!db) return null;
  const { data, error } = await db.from("properties").select("*").eq("id", id).single();
  if (error) return null;
  return data as Property;
}

export async function createProperty(payload: unknown): Promise<Property> {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const valid = propertyCreateSchema.parse(payload);
  const { data, error } = await db.from("properties").insert(valid).select("*").single();
  if (error) throw new Error(error.message);
  await writeAuditLog("property", data.id, "property_created", valid);
  return data as Property;
}

export async function updateProperty(id: string, payload: unknown): Promise<Property> {
  const db = getServiceSupabase();
  if (!db) throw new Error("supabase_not_configured");
  const valid = propertyUpdateSchema.parse(payload);
  const { data, error } = await db.from("properties").update(valid).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  await writeAuditLog("property", data.id, "property_updated", valid);
  return data as Property;
}
