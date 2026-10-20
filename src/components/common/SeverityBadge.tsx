import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Info,
  Minus,
} from 'lucide-react';
import type { SeverityBand } from '../../types/simulation';

interface SeverityBadgeProps {
  band: SeverityBand;
  score?: number;
  metricLabel?: string;
}

const BAND_META: Record<
  SeverityBand,
  {
    rangeText: string;
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Baseline: {
    rangeText: '0–4',
    className: 'bg-[#172331] text-[#B4BFCC] border-[#2C3E52]',
    Icon: Minus,
  },
  Low: {
    rangeText: '5–19',
    className: 'bg-[#7CA3C7]/15 text-[#A5C4E0] border-[#7CA3C7]/45',
    Icon: Info,
  },
  Moderate: {
    rangeText: '20–39',
    className: 'bg-[#D5A653]/15 text-[#E6C27A] border-[#D5A653]/55 border-dashed',
    Icon: Activity,
  },
  Elevated: {
    rangeText: '40–64',
    className: 'bg-[#D97742]/18 text-[#F2A679] border-[#D97742]/55',
    Icon: AlertTriangle,
  },
  Severe: {
    rangeText: '65–100',
    className: 'bg-[#E05A6D]/18 text-[#F598A6] border-[#E05A6D]/65 ring-1 ring-[#E05A6D]/30',
    Icon: AlertOctagon,
  },
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  band,
  score,
  metricLabel,
}) => {
  const meta = BAND_META[band];
  const { Icon } = meta;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-tight tabular-nums ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {metricLabel && <span className="font-normal opacity-80">{metricLabel}:</span>}
      {typeof score === 'number' && (
        <span className="font-mono font-bold">{Math.round(score)}</span>
      )}
      <span>{band}</span>
    </span>
  );
};
