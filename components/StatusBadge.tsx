import React from 'react';

export type UnifiedStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LOCKED'
  | 'IN_PROGRESS'
  | 'IN PROGRESS'
  | 'PROOF_SUBMITTED'
  | 'PROOF SUBMITTED'
  | 'UNDER_REVIEW'
  | 'UNDER REVIEW'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CONFIRMED'
  | 'PENDING'
  | string;

interface StatusBadgeProps {
  status: UnifiedStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'sm',
}) => {
  const normalized = (status || '').toUpperCase().replace(/_/g, ' ');

  // Semantic categories on the light theme: green = money moved / verified,
  // amber = waiting on humans, blue = live / in progress, red = stopped badly.
  const getStyle = () => {
    switch (normalized) {
      case 'APPROVED':
      case 'RELEASED':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'PAID':
        return {
          dot: 'bg-ok',
          badge: 'bg-ok-soft text-ok border-ok/20',
        };
      case 'ACTIVE':
      case 'IN PROGRESS':
        return {
          dot: 'bg-accent',
          badge: 'bg-accent-faint text-accent-deep border-accent/20',
        };
      case 'PROOF SUBMITTED':
      case 'UNDER REVIEW':
      case 'SUBMITTED':
      case 'PENDING':
      case 'AUDITING':
        return {
          dot: 'bg-warn',
          badge: 'bg-warn-soft text-warn border-warn/25',
        };
      case 'ESCROW LOCKED':
      case 'LOCKED':
      case 'ESCALATED':
        return {
          dot: 'bg-lav-deep',
          badge: 'bg-lav-soft text-lav-deep border-lav-deep/20',
        };
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return {
          dot: 'bg-bad',
          badge: 'bg-bad-soft text-bad border-bad/20',
        };
      case 'REFUNDED':
        return {
          dot: 'bg-violet-600',
          badge: 'bg-violet-50 text-violet-700 border-violet-200',
        };
      case 'PAUSED':
      case 'DRAFT':
      case 'OPEN':
      default:
        return {
          dot: 'bg-faint',
          badge: 'bg-mist text-mute border-line',
        };
    }
  };

  const { dot, badge } = getStyle();

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 tracking-wide',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium ${badge} ${sizeClasses[size]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      <span>{normalized}</span>
    </span>
  );
};

export default StatusBadge;
