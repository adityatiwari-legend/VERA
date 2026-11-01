import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: string;
  accent?: 'default' | 'mint' | 'cyan' | 'indigo' | 'amber';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  accent = 'default',
  className = '',
}) => {
  const getAccentClass = () => {
    switch (accent) {
      case 'mint':
        return 'text-accent';
      case 'cyan':
        return 'text-accent-deep';
      case 'indigo':
        return 'text-lav-deep';
      case 'amber':
        return 'text-warn';
      default:
        return 'text-ink';
    }
  };

  return (
    <div className={`card card-hover p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <span className="block font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-mute truncate">
            {label}
          </span>
          <div
            title={typeof value === 'string' ? value : String(value)}
            className={`font-mono text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap overflow-visible ${getAccentClass()}`}
          >
            {value}
          </div>
          {subtext && (
            <p className="pt-0.5 text-xs leading-relaxed text-mute truncate">
              {subtext}
            </p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 rounded-lg border border-line bg-mist p-2 text-mute [&_svg]:text-accent">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5 font-mono text-xs text-accent">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
