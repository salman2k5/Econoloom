/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CORRIDOR_BY_ID,
  EDGE_BY_ID,
  EDGES,
  INITIAL_VALIDATION_REPORT,
  NODE_BY_ID,
  PRESET_BY_ID,
  PRESETS,
} from '../data';
import {
  normalizeScenarioParameters,
  normalizeWeekIndex,
} from '../engine/normalizeInputs';
import { simulateScenario } from '../engine/simulateScenario';
import type {
  CorridorGeometry,
  DataClassification,
  DependencyEdge,
  NetworkNode,
  NodeCategory,
  ScenarioParameters,
  ScenarioPreset,
} from '../types/domain';
import type {
  CausalPathway,
  EdgeWeeklyState,
  NetworkValidationReport,
  NodeWeeklyState,
  SimulationResult,
  SimulationSummaryMetrics,
} from '../types/simulation';
import type { CanvasViewMode, DatasetFilterState, WorkspaceTab } from '../types/ui';
import {
  buildShareableScenarioUrl,
  createScenarioSnapshotExport,
  resolveInitialScenarioState,
  type ScenarioSnapshotExport,
  syncScenarioStateToBrowserUrl,
  writePersistedScenarioToStorage,
} from './scenarioPersistence';

interface ScenarioStoreValue {
  activePreset: ScenarioPreset;
  activeCorridor: CorridorGeometry;
  scenarioParams: ScenarioParameters;
  isCustomModified: boolean;
  currentWeek: number;
  isPlaying: boolean;
  simulationResult: SimulationResult;
  currentWeekNodeStates: Record<string, NodeWeeklyState>;
  currentWeekEdgeStates: Record<string, EdgeWeeklyState>;
  currentWeekSummary: SimulationSummaryMetrics;
  selectedNode: NetworkNode;
  selectedNodeState: NodeWeeklyState;
  selectedNodePathways: CausalPathway[];
  selectedPathwayIndex: number;
  incomingEdgesForSelectedNode: DependencyEdge[];
  outgoingEdgesForSelectedNode: DependencyEdge[];
  selectedEdgeId: string | null;
  selectedEdge: DependencyEdge | null;
  selectedEdgeState: EdgeWeeklyState | null;
  activeWorkspaceTab: WorkspaceTab;
  canvasViewMode: CanvasViewMode;
  datasetFilter: DatasetFilterState;
  isMethodologyModalOpen: boolean;
  validationReport: NetworkValidationReport;
  selectPreset: (presetId: string) => void;
  updateParameter: (key: keyof ScenarioParameters, value: number) => void;
  setScenarioParameters: (params: Partial<ScenarioParameters>) => void;
  resetToPresetDefaults: () => void;
  applyZeroShock: () => void;
  setCurrentWeek: (weekOrUpdater: number | ((prev: number) => number)) => void;
  stepWeek: (delta: number) => void;
  setIsPlaying: (playingOrUpdater: boolean | ((prev: boolean) => boolean)) => void;
  selectNode: (nodeId: string) => void;
  setSelectedPathwayIndex: (index: number) => void;
  selectEdge: (edgeId: string | null) => void;
  setActiveWorkspaceTab: (tab: WorkspaceTab) => void;
  setCanvasViewMode: (mode: CanvasViewMode) => void;
  setCategoryFilter: (category: NodeCategory | 'all') => void;
  setClassificationFilter: (classification: DataClassification | 'all') => void;
  setSearchQuery: (query: string) => void;
  setMethodologyModalOpen: (open: boolean) => void;
  getShareableScenarioUrl: () => string;
  getScenarioSnapshotExport: (exportedAtIso?: string) => ScenarioSnapshotExport;
}

const ScenarioStoreContext = createContext<ScenarioStoreValue | null>(null);

function areParamsEqual(a: ScenarioParameters, b: ScenarioParameters): boolean {
  return (
    Math.abs(a.shockSeverityPct - b.shockSeverityPct) < 1e-4 &&
    a.durationDays === b.durationDays &&
    Math.abs(a.inventoryBufferScale - b.inventoryBufferScale) < 1e-4 &&
    Math.abs(a.rerouteCapacityShare - b.rerouteCapacityShare) < 1e-4 &&
    Math.abs(a.substitutionFlexibility - b.substitutionFlexibility) < 1e-4 &&
    Math.abs(a.shippingCostMultiplier - b.shippingCostMultiplier) < 1e-4
  );
}

export const ScenarioStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const defaultPreset = PRESETS[0]!;
  // Synchronously resolve initial state from URL query > localStorage > defaults on mount
  const [initialPersisted] = useState(() => resolveInitialScenarioState());

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialPersisted.activePresetId,
  );
  const [scenarioParams, setScenarioParamsState] = useState<ScenarioParameters>(
    initialPersisted.scenarioParams,
  );
  const [currentWeek, setCurrentWeekState] = useState<number>(
    initialPersisted.currentWeek,
  );
  const [isPlaying, setIsPlayingState] = useState<boolean>(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    initialPersisted.selectedNodeId,
  );
  const [selectedPathwayIndexState, setSelectedPathwayIndexState] =
    useState<number>(0);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>(
    initialPersisted.activeWorkspaceTab,
  );
  const [canvasViewMode, setCanvasViewMode] =
    useState<CanvasViewMode>('split');
  const [datasetFilter, setDatasetFilter] = useState<DatasetFilterState>({
    category: 'all',
    classification: 'all',
    searchQuery: '',
  });
  const [isMethodologyModalOpen, setMethodologyModalOpen] = useState(false);

  const activePreset = useMemo(
    () => PRESET_BY_ID.get(selectedPresetId) ?? defaultPreset,
    [selectedPresetId, defaultPreset],
  );

  // Synchronize persisted scenario state to localStorage and URL (via history.replaceState)
  useEffect(() => {
    const persistedSnapshot = {
      activePresetId: activePreset.id,
      scenarioParams,
      selectedNodeId,
      currentWeek,
      activeWorkspaceTab,
    };
    writePersistedScenarioToStorage(persistedSnapshot);
    syncScenarioStateToBrowserUrl(persistedSnapshot);
  }, [
    activePreset.id,
    scenarioParams,
    selectedNodeId,
    currentWeek,
    activeWorkspaceTab,
  ]);

  // Support browser back/forward navigation via popstate without update loops
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const restored = resolveInitialScenarioState({
        search: window.location.search,
      });
      setSelectedPresetId(restored.activePresetId);
      setScenarioParamsState(restored.scenarioParams);
      setSelectedNodeId(restored.selectedNodeId);
      setCurrentWeekState(restored.currentWeek);
      setActiveWorkspaceTab(restored.activeWorkspaceTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const activeCorridor = useMemo(
    () =>
      CORRIDOR_BY_ID.get(activePreset.affectedCorridorId) ??
      CORRIDOR_BY_ID.get('cor_hormuz_asia_europe')!,
    [activePreset],
  );

  // Memoize the 26-week simulation calculation strictly on activePreset and scenarioParams
  const simulationResult = useMemo(
    () => simulateScenario(activePreset, scenarioParams),
    [activePreset, scenarioParams],
  );

  const isCustomModified = useMemo(
    () => !areParamsEqual(scenarioParams, activePreset.defaultParams),
    [scenarioParams, activePreset.defaultParams],
  );

  const selectedNode = useMemo(
    () => NODE_BY_ID.get(selectedNodeId) ?? NODE_BY_ID.get('chk_hormuz')!,
    [selectedNodeId],
  );

  const currentWeekNodeStates = useMemo(
    () =>
      simulationResult.nodeStatesByWeek[currentWeek] ??
      simulationResult.nodeStatesByWeek[0]!,
    [simulationResult, currentWeek],
  );

  const currentWeekEdgeStates = useMemo(
    () =>
      simulationResult.edgeStatesByWeek[currentWeek] ??
      simulationResult.edgeStatesByWeek[0]!,
    [simulationResult, currentWeek],
  );

  const currentWeekSummary = useMemo(
    () =>
      simulationResult.summaryByWeek[currentWeek] ??
      simulationResult.overallPeakSummary,
    [simulationResult, currentWeek],
  );

  const selectedNodeState = useMemo(
    () =>
      currentWeekNodeStates[selectedNode.id] ?? {
        nodeId: selectedNode.id,
        week: currentWeek,
        rawInputShortfall: 0,
        remainingInventoryDays: selectedNode.baselineInventoryDays.value,
        inventoryCoverageRatio: 1,
        effectiveSubstitution: 0,
        unbufferedShortfall: 0,
        relativeExposureIndex: 0,
        directRei: 0,
        indirectRei: 0,
        costPressureIndex: 0,
        severityBand: 'Baseline' as const,
        dominantUpstreamNodeId: null,
        dominantEdgeId: null,
      },
    [currentWeekNodeStates, selectedNode, currentWeek],
  );

  const selectedNodePathways = useMemo(
    () =>
      simulationResult.topPathwaysByTargetAndWeek[currentWeek]?.[selectedNode.id] ??
      [],
    [simulationResult, currentWeek, selectedNode.id],
  );

  const incomingEdgesForSelectedNode = useMemo(
    () => EDGES.filter((e) => e.targetNodeId === selectedNode.id),
    [selectedNode.id],
  );

  const outgoingEdgesForSelectedNode = useMemo(
    () => EDGES.filter((e) => e.sourceNodeId === selectedNode.id),
    [selectedNode.id],
  );

  const selectedEdge = useMemo(
    () => (selectedEdgeId ? EDGE_BY_ID.get(selectedEdgeId) ?? null : null),
    [selectedEdgeId],
  );

  const selectedEdgeState = useMemo(
    () =>
      selectedEdgeId ? currentWeekEdgeStates[selectedEdgeId] ?? null : null,
    [selectedEdgeId, currentWeekEdgeStates],
  );

  const selectPreset = useCallback((presetId: string) => {
    const targetPreset = PRESET_BY_ID.get(presetId);
    if (!targetPreset) return;
    setIsPlayingState(false);
    setSelectedPresetId(targetPreset.id);
    setSelectedEdgeId(null);
    setSelectedPathwayIndexState(0);
    setScenarioParamsState(
      normalizeScenarioParameters(
        targetPreset.defaultParams,
        targetPreset.defaultParams,
      ),
    );
    const firstOrigin = targetPreset.shockOriginNodeIds[0];
    if (firstOrigin && NODE_BY_ID.has(firstOrigin)) {
      setSelectedNodeId(firstOrigin);
    }
  }, []);

  const updateParameter = useCallback(
    (key: keyof ScenarioParameters, value: number) => {
      setScenarioParamsState((prev) =>
        normalizeScenarioParameters(
          { ...prev, [key]: value },
          activePreset.defaultParams,
        ),
      );
    },
    [activePreset.defaultParams],
  );

  const setScenarioParameters = useCallback(
    (partial: Partial<ScenarioParameters>) => {
      setScenarioParamsState((prev) =>
        normalizeScenarioParameters(
          { ...prev, ...partial },
          activePreset.defaultParams,
        ),
      );
    },
    [activePreset.defaultParams],
  );

  const resetToPresetDefaults = useCallback(() => {
    setIsPlayingState(false);
    setSelectedPathwayIndexState(0);
    setScenarioParamsState(
      normalizeScenarioParameters(
        activePreset.defaultParams,
        activePreset.defaultParams,
      ),
    );
  }, [activePreset.defaultParams]);

  const applyZeroShock = useCallback(() => {
    setIsPlayingState(false);
    setSelectedPathwayIndexState(0);
    setScenarioParamsState((prev) =>
      normalizeScenarioParameters(
        { ...prev, shockSeverityPct: 0 },
        activePreset.defaultParams,
      ),
    );
  }, [activePreset.defaultParams]);

  const setCurrentWeek = useCallback(
    (weekOrUpdater: number | ((prev: number) => number)) => {
      setCurrentWeekState((prev) => {
        const nextRaw =
          typeof weekOrUpdater === 'function' ? weekOrUpdater(prev) : weekOrUpdater;
        return normalizeWeekIndex(nextRaw, prev);
      });
    },
    [],
  );

  const stepWeek = useCallback((delta: number) => {
    setIsPlayingState(false);
    setCurrentWeekState((prev) => normalizeWeekIndex(prev + delta, prev));
  }, []);

  const setIsPlaying = useCallback(
    (playingOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      setIsPlayingState((prev) =>
        typeof playingOrUpdater === 'function'
          ? playingOrUpdater(prev)
          : playingOrUpdater,
      );
    },
    [],
  );

  const selectNode = useCallback((nodeId: string) => {
    if (NODE_BY_ID.has(nodeId)) {
      setSelectedNodeId((prev) => {
        if (prev !== nodeId) {
          setSelectedPathwayIndexState(0);
        }
        return nodeId;
      });
    }
  }, []);

  const setSelectedPathwayIndex = useCallback((index: number) => {
    if (!Number.isFinite(index)) {
      setSelectedPathwayIndexState(0);
      return;
    }
    setSelectedPathwayIndexState(Math.max(0, Math.floor(index)));
  }, []);

  const selectEdge = useCallback((edgeId: string | null) => {
    if (edgeId === null || EDGE_BY_ID.has(edgeId)) {
      setSelectedEdgeId(edgeId);
    }
  }, []);

  const setCategoryFilter = useCallback((category: NodeCategory | 'all') => {
    setDatasetFilter((prev) => ({ ...prev, category }));
  }, []);

  const setClassificationFilter = useCallback(
    (classification: DataClassification | 'all') => {
      setDatasetFilter((prev) => ({ ...prev, classification }));
    },
    [],
  );

  const setSearchQuery = useCallback((searchQuery: string) => {
    setDatasetFilter((prev) => ({ ...prev, searchQuery }));
  }, []);

  const getShareableScenarioUrl = useCallback(() => {
    return buildShareableScenarioUrl({
      activePresetId: activePreset.id,
      scenarioParams,
      selectedNodeId: selectedNode.id,
      currentWeek,
      activeWorkspaceTab,
    });
  }, [
    activePreset.id,
    scenarioParams,
    selectedNode.id,
    currentWeek,
    activeWorkspaceTab,
  ]);

  const getScenarioSnapshotExport = useCallback(
    (exportedAtIso?: string) => {
      return createScenarioSnapshotExport(
        {
          activePresetId: activePreset.id,
          scenarioParams,
          selectedNodeId: selectedNode.id,
          currentWeek,
          activeWorkspaceTab,
        },
        exportedAtIso,
      );
    },
    [
      activePreset.id,
      scenarioParams,
      selectedNode.id,
      currentWeek,
      activeWorkspaceTab,
    ],
  );

  const value: ScenarioStoreValue = {
    activePreset,
    activeCorridor,
    scenarioParams,
    isCustomModified,
    currentWeek,
    isPlaying,
    simulationResult,
    currentWeekNodeStates,
    currentWeekEdgeStates,
    currentWeekSummary,
    selectedNode,
    selectedNodeState,
    selectedNodePathways,
    selectedPathwayIndex: selectedPathwayIndexState,
    incomingEdgesForSelectedNode,
    outgoingEdgesForSelectedNode,
    selectedEdgeId,
    selectedEdge,
    selectedEdgeState,
    activeWorkspaceTab,
    canvasViewMode,
    datasetFilter,
    isMethodologyModalOpen,
    validationReport: INITIAL_VALIDATION_REPORT,
    selectPreset,
    updateParameter,
    setScenarioParameters,
    resetToPresetDefaults,
    applyZeroShock,
    setCurrentWeek,
    stepWeek,
    setIsPlaying,
    selectNode,
    setSelectedPathwayIndex,
    selectEdge,
    setActiveWorkspaceTab,
    setCanvasViewMode,
    setCategoryFilter,
    setClassificationFilter,
    setSearchQuery,
    setMethodologyModalOpen,
    getShareableScenarioUrl,
    getScenarioSnapshotExport,
  };

  return (
    <ScenarioStoreContext.Provider value={value}>
      {children}
    </ScenarioStoreContext.Provider>
  );
};

export function useScenarioStore(): ScenarioStoreValue {
  const ctx = useContext(ScenarioStoreContext);
  if (!ctx) {
    throw new Error('useScenarioStore must be used within a ScenarioStoreProvider');
  }
  return ctx;
}
