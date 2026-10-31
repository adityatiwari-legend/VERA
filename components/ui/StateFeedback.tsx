'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Inbox,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Surface } from './Surface';
import { Button } from './Button';
import { Badge } from './Badge';
import { getExplorerTxUrl } from '@/lib/blockchain';

/* -------------------------------------------------------------------------- */
/* 1. EmptyState                                                              */
/* -------------------------------------------------------------------------- */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = <Inbox className="w-8 h-8 text-faint" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Surface
      variant="default"
      padding="xl"
      rounded="2xl"
      className={`flex flex-col items-center justify-center p-12 text-center ${className || ''}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-mist text-mute">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-mute">{description}</p>
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-5">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary" size="sm">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. ErrorState                                                              */
/* -------------------------------------------------------------------------- */
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'An unexpected error occurred',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Surface
      variant="default"
      padding="lg"
      rounded="2xl"
      className={`flex flex-col items-center border-bad/25 bg-bad-soft/50 p-8 text-center ${className || ''}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-bad/20 bg-bad-soft text-bad">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-bad/90">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. LoadingState                                                            */
/* -------------------------------------------------------------------------- */
export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading cryptographic state...', className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-3 p-12 ${className || ''}`}>
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="font-mono text-xs uppercase tracking-wider text-mute">{message}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. MoneyDisplay                                                            */
/* -------------------------------------------------------------------------- */
export interface MoneyDisplayProps {
  amount: number | string;
  currency?: string;
  variant?: 'large' | 'medium' | 'small';
  color?: 'default' | 'mint' | 'cyan' | 'amber' | 'muted';
  className?: string;
}

export function MoneyDisplay({
  amount,
  currency = 'INR',
  variant = 'medium',
  color = 'default',
  className,
}: MoneyDisplayProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);

  const sizeClasses = {
    large: 'text-3xl sm:text-4xl font-bold tracking-tight',
    medium: 'text-xl sm:text-2xl font-bold tracking-tight',
    small: 'text-sm sm:text-base font-semibold',
  }[variant];

  const colorClasses = {
    default: 'text-ink',
    mint: 'text-accent',
    cyan: 'text-accent-deep',
    amber: 'text-warn',
    muted: 'text-mute',
  }[color];

  return (
    <span className={`font-sans ${sizeClasses} ${colorClasses} ${className || ''}`}>
      {formatted}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. BlockchainTx                                                            */
/* -------------------------------------------------------------------------- */
export interface BlockchainTxProps {
  txHash: string;
  chainId?: number | string;
  network?: string;
  status?: string;
  showLink?: boolean;
  className?: string;
}

export function BlockchainTx({
  txHash,
  chainId,
  network = 'Hardhat Testnet',
  status = 'CONFIRMED',
  showLink = true,
  className,
}: BlockchainTxProps) {
  const truncated = `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 6)}`;
  const explorerUrl = getExplorerTxUrl(chainId, txHash);

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs ${className || ''}`}>
      <span className="chip !bg-white">{truncated}</span>
      {network && (
        <span className="rounded-md border border-accent/20 bg-accent-faint px-2 py-0.5 text-[10px] text-accent-deep">
          {network}
        </span>
      )}
      {showLink && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-accent underline transition-colors hover:text-accent-deep"
        >
          View ↗
        </a>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. MilestoneStatus                                                         */
/* -------------------------------------------------------------------------- */
export function MilestoneStatus({
  status,
  sequence,
}: {
  status: string;
  sequence?: number;
}) {
  const getVariant = () => {
    switch (status) {
      case 'COMPLETED':
      case 'RELEASED':
        return 'emerald';
      case 'IN_PROGRESS':
        return 'amber';
      case 'PENDING':
        return 'slate';
      default:
        return 'slate';
    }
  };

  return (
    <Badge
      variant={getVariant() as any}
      dot
      pulse={status === 'IN_PROGRESS'}
      label={sequence ? `M${sequence}: ${status}` : status}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* 7. ProofStatus                                                             */
/* -------------------------------------------------------------------------- */
export function ProofStatus({
  status,
}: {
  status: 'PENDING' | 'PASS' | 'FLAG' | 'FAIL' | 'MANUAL_REVIEW' | string;
}) {
  switch (status) {
    case 'PASS':
      return <Badge variant="emerald" dot label="PASS" />;
    case 'FLAG':
      return <Badge variant="amber" dot pulse label="FLAG" />;
    case 'FAIL':
      return <Badge variant="rose" dot label="FAIL" />;
    case 'MANUAL_REVIEW':
      return <Badge variant="indigo" dot label="MANUAL REVIEW" />;
    default:
      return <Badge variant="slate" dot label={status || 'PENDING'} />;
  }
}

/* -------------------------------------------------------------------------- */
/* 8. ApprovalStatus                                                          */
/* -------------------------------------------------------------------------- */
export function ApprovalStatus({
  currentSignatures,
  requiredSignatures = 2,
  status,
}: {
  currentSignatures: number;
  requiredSignatures?: number;
  status?: string;
}) {
  const isReady = currentSignatures >= requiredSignatures;

  return (
    <div className="inline-flex items-center gap-2">
      <Badge
        variant={isReady ? 'emerald' : 'amber'}
        dot
        pulse={!isReady}
        label={`${currentSignatures} of ${requiredSignatures} Signatures`}
      />
      {status && (
        <span className="font-mono text-[11px] text-mute">({status})</span>
      )}
    </div>
  );
}
