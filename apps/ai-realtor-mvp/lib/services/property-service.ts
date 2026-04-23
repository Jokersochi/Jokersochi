import { supabase } from "../supabase/client";
import { propertySchema } from "../../shared/validators";
import type { Property } from "../../shared/types";

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Property[];
}

export async function createProperty(payload: unknown): Promise<Property> {
  const valid = propertySchema.parse(payload);
  const { data, error } = await supabase.from("properties").insert(valid).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return data as Property;
}
