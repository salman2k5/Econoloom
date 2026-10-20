import React from 'react';
import {
  Calculator,
  CheckCircle2,
  Compass,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { DataClassification, EvidenceConfidence } from '../../types/domain';

interface DataTierBadgeProps {
  classification: DataClassification;
  confidence?: EvidenceConfidence;
  compact?: boolean;
}

const CLASSIFICATION_META: Record<
  DataClassification,
  {
    label: string;
    shortLabel: string;
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  observed: {
    label: 'Observed Source Data',
    shortLabel: 'Observed',
    className:
      'bg-[#38B688]/12 text-[#80D8B6] border-[#38B688]/40',
    Icon: CheckCircle2,
    description: 'Directly reported in an official empirical dataset or agency publication.',
  },
  derived: {
    label: 'Derived from Source',
    shortLabel: 'Derived',
    className:
      'bg-[#7CA3C7]/12 text-[#ACC7E0] border-[#7CA3C7]/40 border-dashed',
    Icon: Calculator,
    description: 'Calculated mathematically from one or more observed empirical datasets.',
  },
  model_parameter: {
    label: 'Model Assumption',
    shortLabel: 'Model Param',
    className:
      'bg-[#B392CE]/12 text-[#D1BAE3] border-[#B392CE]/40',
    Icon: Compass,
    description: 'Structural simulation parameter calibrated from empirical literature ranges.',
  },
  user_input: {
    label: 'Scenario Parameter',
    shortLabel: 'Scenario Input',
    className:
      'bg-[#D5A653]/14 text-[#E6C27A] border-[#D5A653]/45',
    Icon: Sliders,
    description: 'Controlled by the scenario preset or user-adjusted simulation levers.',
  },
  illustrative: {
    label: 'Illustrative Heuristic',
    shortLabel: 'Illustrative',
    className:
      'bg-slate-500/15 text-text-secondary border-border-subtle border-dotted',
    Icon: Sparkles,
    description: 'Pedagogical estimate used where granular public data is unavailable.',
  },
};

const CONFIDENCE_LABEL: Record<EvidenceConfidence, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
  illustrative_only: 'Illustrative Only',
};

export const DataTierBadge: React.FC<DataTierBadgeProps> = ({
  classification,
  confidence,
  compact = false,
}) => {
  const meta = CLASSIFICATION_META[classification];
  const { Icon } = meta;

  return (
    <span
      title={`${meta.label}: ${meta.description}${confidence ? ` (${CONFIDENCE_LABEL[confidence]})` : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium tracking-tight ${meta.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
      {confidence && !compact && (
        <span className="opacity-75">· {CONFIDENCE_LABEL[confidence]}</span>
      )}
    </span>
  );
};
