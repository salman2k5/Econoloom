import type { DataClassification, NodeCategory } from './domain';

export type WorkspaceTab =
  | 'overview'
  | 'pathway_explorer'
  | 'scenario_comparison'
  | 'dataset_explorer'
  | 'evidence_sources';

export type CanvasViewMode = 'split' | 'network' | 'map';

export interface DatasetFilterState {
  category: NodeCategory | 'all';
  classification: DataClassification | 'all';
  searchQuery: string;
}
