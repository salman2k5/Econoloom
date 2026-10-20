import React, { useEffect } from 'react';
import { BookOpen, ShieldAlert, X } from 'lucide-react';
import { MODEL_ASSUMPTIONS } from '../../data';
import { useScenarioStore } from '../../state/useScenarioStore';
import { Button } from '../common/Button';
import { DataTierBadge } from '../common/DataTierBadge';
import { SeverityBadge } from '../common/SeverityBadge';

export const MethodologyModal: React.FC = () => {
  const { isMethodologyModalOpen, setMethodologyModalOpen } = useScenarioStore();

  useEffect(() => {
    if (!isMethodologyModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMethodologyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMethodologyModalOpen, setMethodologyModalOpen]);

  if (!isMethodologyModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060B10]/80 p-4 backdrop-blur-sm"
      onClick={() => setMethodologyModalOpen(false)}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-border-subtle border-t-2 border-t-[#D5A653] bg-panel p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#D5A653]/45 bg-[#D5A653]/12 text-[#D5A653]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="methodology-modal-title"
                className="font-display text-lg font-semibold tracking-tight text-text-primary"
              >
                EconoLoom Methodology, Provenance Tiers & Epistemic Guardrails
              </h2>
              <p className="text-xs text-text-secondary">
                Transparent scenario-analysis rules governing all 48 nodes and 78 dependency edges
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close methodology dialog"
            onClick={() => setMethodologyModalOpen(false)}
            icon={<X className="h-4 w-4" />}
          >
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-6 text-xs leading-relaxed text-text-secondary">
          {/* Epistemic Guardrail */}
          <div className="rounded-sm border border-l-2 border-border-subtle border-l-[#D5A653] bg-recess/90 p-4">
            <div className="flex items-center gap-2 font-semibold text-[#E6C27A]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#D5A653]" aria-hidden="true" />
              <span>Non-Negotiable Epistemic Guardrail: Exploration, Never Price Prediction</span>
            </div>
            <p className="mt-1.5 text-text-secondary">
              EconoLoom is an educational scenario-analysis instrument. It never predicts specific
              dollar commodity prices ($/bbl), retail store price changes (% markup), or national
              CPI inflation rates. All outputs are expressed as bounded ordinal indices—the{' '}
              <strong className="text-text-primary">Relative Exposure Index (REI 0–100)</strong> and{' '}
              <strong className="text-text-primary">Cost-Pressure Index (CPI 0–100)</strong>—paired
              with five qualitative severity bands.
            </p>
          </div>

          {/* 5-Tier Data Provenance Taxonomy */}
          <div>
            <h3 className="font-display text-sm font-semibold text-text-primary">
              1. Five-Tier Data Classification Taxonomy
            </h3>
            <p className="mt-1">
              Every quantitative parameter in the EconoLoom network carries an explicit{' '}
              <code className="rounded-sm border border-border-subtle bg-recess px-1.5 py-0.5 font-mono text-[#E6C27A]">
                TraceableValue
              </code>{' '}
              wrapper distinguishing empirical observations from structural model assumptions:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <DataTierBadge classification="observed" confidence="high" />
              <DataTierBadge classification="derived" confidence="medium" />
              <DataTierBadge classification="model_parameter" confidence="medium" />
              <DataTierBadge classification="user_input" />
              <DataTierBadge classification="illustrative" confidence="illustrative_only" />
            </div>
          </div>

          {/* Severity Scale */}
          <div>
            <h3 className="font-display text-sm font-semibold text-text-primary">
              2. Bounded Exposure & Cost-Pressure Severity Bands (0–100)
            </h3>
            <p className="mt-1">
              All visualizations pair color with explicit icons, border styles, and numeric scores
              for WCAG 2.1 AA colorblind accessibility:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SeverityBadge band="Baseline" score={2} />
              <SeverityBadge band="Low" score={12} />
              <SeverityBadge band="Moderate" score={28} />
              <SeverityBadge band="Elevated" score={52} />
              <SeverityBadge band="Severe" score={78} />
            </div>
          </div>

          {/* Structural Model Assumptions */}
          <div>
            <h3 className="font-display text-sm font-semibold text-text-primary">
              3. Core Structural Model Assumptions
            </h3>
            <div className="mt-2.5 grid gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
              {MODEL_ASSUMPTIONS.map((asm) => (
                <div
                  key={asm.id}
                  className="bg-recess/95 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-text-primary">{asm.title}</span>
                    <DataTierBadge classification={asm.classification} compact />
                  </div>
                  <p className="mt-1 text-text-primary/90">{asm.valueSummary}</p>
                  <p className="mt-1.5 text-text-secondary">
                    <strong className="text-text-primary">Rationale:</strong> {asm.rationale}
                  </p>
                  <p className="mt-1 text-text-muted">
                    <strong className="text-text-secondary">Limitation:</strong> {asm.limitation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
