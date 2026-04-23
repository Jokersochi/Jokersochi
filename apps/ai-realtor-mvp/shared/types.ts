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

export type ViewingStatus =
  | "requested"
  | "awaiting_confirmation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type ViewingConfirmationStatus = "pending" | "confirmed" | "declined";

export interface Property {
  id: string;
  title: string;
  address: string;
  price_listing: number;
  price_floor: number;
  passport_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  property_id: string;
  source: string;
  name: string | null;
  phone: string | null;
  channel: string;
  first_message: string;
  temperature: LeadTemperature;
  status: LeadStatus;
  escalated_to_whatsapp: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadMessage {
  id: string;
  lead_id: string;
  direction: "inbound" | "outbound";
  channel: string;
  message_text: string;
  ai_generated: boolean;
  created_at: string;
}

export interface Viewing {
  id: string;
  lead_id: string;
  property_id: string;
  scheduled_at: string;
  ends_at: string;
  status: ViewingStatus;
  confirmation_status: ViewingConfirmationStatus;
  no_show_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: "property" | "lead" | "viewing" | "message";
  entity_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface LeadClassification {
  temperature: LeadTemperature;
  status: Extract<LeadStatus, "new" | "in_conversation" | "awaiting_phone" | "viewing_requested" | "escalated">;
  should_escalate_to_whatsapp: boolean;
  reasons: string[];
}

export interface DashboardMetrics {
  newLeads: number;
  hotLeads: number;
  scheduledViewings: number;
  confirmedViewings: number;
  noShowCount: number;
  recommendations: string[];
}
