import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Database,
  FileCheck2,
  GitBranch,
  GitCompare,
  Layers,
  Network,
} from 'lucide-react';
import { useScenarioStore } from '../../state/useScenarioStore';
import type { WorkspaceTab } from '../../types/ui';
import { Button } from '../common/Button';

const NAV_TABS: {
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'overview',
    label: 'Interactive Explorer (Map & Graph)',
    shortLabel: 'Explorer',
    Icon: Layers,
  },
  {
    id: 'pathway_explorer',
    label: 'Impact Pathway Explorer',
    shortLabel: 'Pathways',
    Icon: GitBranch,
  },
  {
    id: 'scenario_comparison',
    label: 'Scenario Comparison (A/B)',
    shortLabel: 'Compare (A/B)',
    Icon: GitCompare,
  },
  {
    id: 'dataset_explorer',
    label: 'Audited Network (48 Nodes / 78 Edges)',
    shortLabel: 'Network Data (48)',
    Icon: Database,
  },
  {
    id: 'evidence_sources',
    label: 'Evidence & Sources (14)',
    shortLabel: 'Sources (14)',
    Icon: FileCheck2,
  },
];

export const AppHeader: React.FC = () => {
  const {
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    setMethodologyModalOpen,
    validationReport,
  } = useScenarioStore();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle border-t-2 border-t-[#D5A653]/75 bg-panel/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity & Editorial Masthead */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#D5A653]/50 bg-recess shadow-glow">
            <Network className="h-5 w-5 text-[#D5A653]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
                EconoLoom
              </span>
              <span className="rounded-sm border border-[#D5A653]/40 bg-[#D5A653]/12 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E6C27A]">
                Interactive Shock Explorer
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Pull one thread of the global economy. Explore what else might unravel.
            </p>
          </div>
        </div>

        {/* Primary View Navigation */}
        <nav
          aria-label="Primary Workbench Views"
          className="flex flex-wrap items-center gap-1 rounded border border-border-subtle bg-recess/90 p-1"
        >
          {NAV_TABS.map(({ id, label, shortLabel, Icon }) => {
            const isActive = activeWorkspaceTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveWorkspaceTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A653]/75 ${
                  isActive
                    ? 'border border-[#D5A653]/65 bg-elevated text-text-primary shadow-sm'
                    : 'border border-transparent text-text-secondary hover:bg-elevated/50 hover:text-text-primary'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive ? 'text-[#D5A653]' : 'text-[#7CA3C7]'
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Dataset Integrity Status & Methodology Trigger */}
        <div className="flex items-center gap-2">
          <div
            className="hidden items-center gap-1.5 rounded-sm border border-[#38B688]/35 bg-[#38B688]/10 px-2.5 py-1.5 font-mono text-xs font-medium text-[#80D8B6] xl:inline-flex"
            title="Live output of validateNetworkDataset() across all 48 nodes, 78 edges, and 14 sources"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {validationReport.nodeCount} Nodes · {validationReport.edgeCount} Edges ·{' '}
              {validationReport.isValid ? 'DAG Verified' : 'Validation Error'}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMethodologyModalOpen(true)}
            icon={<BookOpen className="h-3.5 w-3.5 text-[#D5A653]" />}
          >
            Methodology & Guardrails
          </Button>
        </div>
      </div>
    </header>
  );
};
