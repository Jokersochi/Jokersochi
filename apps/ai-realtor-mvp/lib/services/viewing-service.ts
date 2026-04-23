import { supabase } from "../supabase/client";
import type { Viewing } from "../../shared/types";

export async function listViewings(): Promise<Viewing[]> {
  const { data, error } = await supabase.from("viewings").select("*").order("scheduled_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Viewing[];
}
