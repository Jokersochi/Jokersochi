import { supabase } from "../supabase/client";
import type { Lead } from "../../shared/types";

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Lead[];
}
