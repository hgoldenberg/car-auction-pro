import { Database } from '@/integrations/supabase/types';

export type VehicleStatus = Database['public']['Enums']['vehicle_status'];
export type AuctionStatus = Database['public']['Enums']['auction_status'];
export type BidStatus = Database['public']['Enums']['bid_status'];
export type LeadStatus = Database['public']['Enums']['lead_status'];
export type PublicationStatus = Database['public']['Enums']['publication_status'];

export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type Auction = Database['public']['Tables']['auctions']['Row'];
export type Bid = Database['public']['Tables']['bids']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadNote = Database['public']['Tables']['lead_notes']['Row'];
export type TelegramGroup = Database['public']['Tables']['telegram_groups']['Row'];
export type ActivityLogEntry = Database['public']['Tables']['activity_log']['Row'];
export type AuctionGroupPublication = Database['public']['Tables']['auction_group_publications']['Row'];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  draft: 'Borrador',
  ready: 'Listo',
  published: 'Publicado',
  sold: 'Vendido',
  archived: 'Archivado',
};

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  active: 'Activa',
  paused: 'Pausada',
  closed: 'Cerrada',
  awarded: 'Adjudicada',
  cancelled: 'Cancelada',
};

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  submitted: 'Enviada',
  valid: 'Válida',
  rejected: 'Rechazada',
  leading: 'Liderando',
  outbid: 'Superada',
  winning: 'Ganadora',
  cancelled: 'Cancelada',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nuevo',
  interested: 'Interesado',
  bid_once: 'Primera oferta',
  active_bidder: 'Ofertante activo',
  finalist: 'Finalista',
  winner: 'Ganador',
  lost: 'Perdido',
  follow_up: 'Seguimiento',
  closed: 'Cerrado',
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  pending: 'Pendiente',
  posted: 'Publicado',
  failed: 'Fallido',
};
