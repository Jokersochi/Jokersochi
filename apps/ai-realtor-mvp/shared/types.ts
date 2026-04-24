export type LeadStatus =
  | "new"
  | "in_conversation"
  | "awaiting_phone"
  | "viewing_requested"
  | "viewing_scheduled"
  | "viewing_confirmed"
  | "viewing_done"
  | "paused"
  | "escalated"
  | "closed";

export type LeadTemperature = "cold" | "warm" | "hot";
export type ViewingStatus = "requested" | "awaiting_confirmation" | "confirmed" | "completed" | "cancelled" | "no_show";
export type MessageDirection = "inbound" | "outbound" | "internal";

export interface PropertyPassport {
  rooms: number | null;
  area: number | null;
  floor: number | null;
  renovation: string | null;
  documents: string;
  description: string;
}

export interface Property {
  id: string;
  owner_id: string | null;
  title: string;
  address: string;
  price_listing: number;
  price_floor: number;
  passport_json: PropertyPassport;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  property_id: string;
  external_id: string | null;
  source: string;
  name: string | null;
  phone: string | null;
  channel: string;
  first_message: string | null;
  temperature: LeadTemperature;
  status: LeadStatus;
  escalated_to_owner: boolean;
  no_show_count: number;
  manual_confirmation_required: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadMessage {
  id: string;
  lead_id: string;
  external_message_id: string | null;
  direction: MessageDirection;
  channel: string;
  message_text: string;
  ai_generated: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface Viewing {
  id: string;
  lead_id: string;
  property_id: string;
  scheduled_at: string;
  ends_at: string;
  status: ViewingStatus;
  confirmation_status: "pending" | "confirmed" | "cancelled";
  no_show_flag: boolean;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  reminder_2h_sent_at: string | null;
  reminder_30m_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassifyResult {
  temperature: "cold" | "warm" | "hot";
  status: "new" | "in_conversation" | "awaiting_phone" | "viewing_requested" | "escalated";
  should_escalate_to_owner: boolean;
  reasons: string[];
}

export interface OwnerSummaryPayload {
  leadId: string;
  summary: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  urgency: "low" | "medium" | "high";
}
