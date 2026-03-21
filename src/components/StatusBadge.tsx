import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  VehicleStatus, AuctionStatus, BidStatus, LeadStatus, PublicationStatus,
  VEHICLE_STATUS_LABELS, AUCTION_STATUS_LABELS, BID_STATUS_LABELS,
  LEAD_STATUS_LABELS, PUBLICATION_STATUS_LABELS,
} from '@/lib/types';
import { forwardRef } from 'react';

type StatusType = VehicleStatus | AuctionStatus | BidStatus | LeadStatus | PublicationStatus;

const statusColorMap: Record<string, string> = {
  // Vehicle
  draft: 'bg-status-neutral-bg text-status-neutral',
  ready: 'bg-status-info-bg text-status-info',
  published: 'bg-status-success-bg text-status-success',
  sold: 'bg-primary/10 text-primary',
  archived: 'bg-status-neutral-bg text-status-neutral',
  // Auction
  scheduled: 'bg-status-info-bg text-status-info',
  active: 'bg-status-success-bg text-status-success',
  paused: 'bg-status-warning-bg text-status-warning',
  closed: 'bg-status-neutral-bg text-status-neutral',
  awarded: 'bg-primary/10 text-primary',
  cancelled: 'bg-status-danger-bg text-status-danger',
  // Bid
  submitted: 'bg-status-info-bg text-status-info',
  valid: 'bg-status-success-bg text-status-success',
  rejected: 'bg-status-danger-bg text-status-danger',
  leading: 'bg-status-success-bg text-status-success',
  outbid: 'bg-status-warning-bg text-status-warning',
  winning: 'bg-primary/10 text-primary',
  // Lead
  new: 'bg-status-info-bg text-status-info',
  interested: 'bg-status-info-bg text-status-info',
  bid_once: 'bg-status-warning-bg text-status-warning',
  active_bidder: 'bg-status-success-bg text-status-success',
  finalist: 'bg-primary/10 text-primary',
  winner: 'bg-status-success-bg text-status-success',
  lost: 'bg-status-neutral-bg text-status-neutral',
  follow_up: 'bg-status-warning-bg text-status-warning',
  // Publication
  pending: 'bg-status-warning-bg text-status-warning',
  posted: 'bg-status-success-bg text-status-success',
  failed: 'bg-status-danger-bg text-status-danger',
};

const allLabels: Record<string, string> = {
  ...VEHICLE_STATUS_LABELS,
  ...AUCTION_STATUS_LABELS,
  ...BID_STATUS_LABELS,
  ...LEAD_STATUS_LABELS,
  ...PUBLICATION_STATUS_LABELS,
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className }, ref) => {
    return (
      <Badge
        ref={ref}
        variant="secondary"
        className={cn(
          'font-semibold text-[10px] uppercase tracking-wider border-0 px-2 py-0.5',
          statusColorMap[status] || 'bg-status-neutral-bg text-status-neutral',
          className
        )}
      >
        {allLabels[status] || status}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';