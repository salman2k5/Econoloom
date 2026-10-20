# ECONOLOOM — USER EXPERIENCE (UX) & VISUAL DESIGN SPECIFICATION

**Document Status:** Phase 0 Baseline Specification  
**Last Updated:** 2026-10-19

---

## 1. Design Philosophy & Visual Direction

### 1.1 Aesthetic Archetype: The Precision Research Instrument
EconoLoom is designed to feel like a **tactile, high-precision research instrument**—combining the editorial authority of *Financial Times* / *Chatham House* visual journalism with the responsive analytical clarity of a Bloomberg or Observable workspace.

### 1.2 Dark-First Color & Surface System
The interface uses a disciplined, low-fatigue dark palette where color luminance is reserved strictly for encoding **shock severity, exposure intensity, mitigation flows, and epistemic provenance**:

| Token Name | Hex Value | Usage & Analytical Role | Contrast vs. `#0B0F17` |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#0B0F17` | Deep obsidian primary workspace background (Map & Graph canvas) | — |
| `--bg-panel` | `#111722` | Elevated control bars, side inspector, and timeline dock | 1.15:1 |
| `--bg-elevated` | `#182030` | Cards, hover surfaces, active tab pills, and modal dialogs | 1.35:1 |
| `--border-subtle` | `#222D42` | 1px structural grid hairlines and panel dividers | — |
| `--text-primary` | `#F1F5F9` | Primary headings, node titles, and active numerical metrics | 16.8:1 (AAA) |
| `--text-secondary` | `#94A3B8` | Context labels, axis titles, and mechanism descriptions | 7.2:1 (AA) |
| `--text-muted` | `#64748B` | Unexposed node captions and secondary metadata | 4.5:1 (AA) |
| `--stress-none` | `#475569` | **Baseline / Unexposed** ($\text{REI} = 0$) | — |
| `--stress-low` | `#38BDF8` | **Low Exposure / Buffer-Absorbed** ($\text{REI } 0.1–19.9$) | 9.4:1 |
| `--stress-moderate`| `#FBBF24` | **Moderate Stress / Early Spillover** ($\text{REI } 20.0–44.9$) | 11.6:1 |
| `--stress-elevated`| `#FB923C` | **Elevated Exposure / Buffer Depletion** ($\text{REI } 45.0–69.9$) | 8.9:1 |
| `--stress-severe` | `#F43F5E` | **Severe Bottleneck / Shock Origin** ($\text{REI } 70.0–100.0$) | 6.1:1 |
| `--mitigation-cyan`| `#10B981` | **Active Bypass Corridor / Inventory Buffer Shield** | 8.4:1 |
| `--focus-ring` | `#60A5FA` | 2px keyboard focus outline (`outline-offset: 2px`) | 7.8:1 |

### 1.3 Typography System
- **UI & Editorial Copy (`--font-sans`):** `'Plus Jakarta Sans', 'Inter', system-ui, sans-serif` — clean geometric legibility for node names, narrative explanations, and controls.
- **Data, Indices & Equations (`--font-mono`):** `'IBM Plex Mono', 'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums` — prevents layout jitter when scrubbing the 26-week timeline or dragging parameter sliders.
- **Minimum Type Sizes:** No chart axis label, node badge, or provenance tag may render smaller than `11px` (`0.6875rem`). Primary body copy is `14px` (`0.875rem`), and panel titles are `15px–18px` semi-bold.

### 1.4 Strict Visual Anti-Patterns (Forbidden)
- **No Decorative "AI SaaS" Tropes:** No purple-to-pink neon gradients, no heavy blurred glassmorphism (`backdrop-filter` overload), and no floating 3D decorative orbs.
- **No Fake Live Tickers:** Never display scrolling stock-style tickers or simulated "LIVE FEED" indicators.
- **No Unbacked Network Edges:** Every rendered graph link and map arc must correspond 1:1 to a documented `DependencyEdge` in `src/data/network.ts`.
- **No Dead Controls:** Every button, filter, tab, and slider in the UI must be wired to real state and covered by automated tests.

---

## 2. Information Architecture & Screen Layout

### 2.1 Desktop Analytical Workspace (`1280px` and wider)
At standard desktop resolutions (`1440×900` reference), EconoLoom uses a **four-zone synchronized single-viewport workbench** (avoiding long page scrolling so the user can see parameter changes ripple across map, network, timeline, and inspector simultaneously):

```
+--------------------------------------------------------------------------------------------------+
| TOP BAR (64px): Brand | Scenario Preset Selector | Severity | Duration | Buffer | Mitigation     |
|                 [Run/Reset] | [Compare Scenarios (Badge)] | [Methodology & Guardrails]           |
+-------------------------------------------------------+------------------------------------------+
|                                                       | RIGHT DOCK (380px width, full height):   |
|  MAIN VISUALIZATION STAGE (Flex 1, Split / Toggle):   |  [Tab 1: Node & Edge Inspector]          |
|                                                       |  [Tab 2: Impact Pathway Explorer]        |
|  +-----------------------+-------------------------+  |  [Tab 3: Evidence & Provenance]          |
|  | B. GEOGRAPHIC VIEW    | C. DEPENDENCY NETWORK   |  |                                          |
|  | (42% Stage Width)     | (58% Stage Width)       |  |  - Active Entity Header & Category Badge |
|  |                       |                         |  |  - Direct vs. Indirect REI Breakdown     |
|  | - World Vector Map    | - 4-Tier Directed DAG   |  |  - Inventory Buffer Gauge (Weeks left)   |
|  | - Chokepoint Beacons  |   (Geo/Chk -> Com ->    |  |  - Causal Pathway Step-by-Step Chain     |
|  | - Disrupted & Bypass  |    Ind -> Consumer)     |  |  - Consumer Cost-Pressure Index (0-100)  |
|  |   Corridor Arcs       | - Anti-clutter toolbar: |  |    & Illustrative BOM Breakdown          |
|  | - Regional Exposure   |   [Hop Depth] [Filter]  |  |  - Traceable Source Citations & Tier     |
|  |   Halos               |   [Min REI Threshold]   |  |    Badges (Observed / Derived / Param)   |
|  +-----------------------+-------------------------+  |                                          |
+-------------------------------------------------------+                                          |
| BOTTOM DOCK (210px height): D. SIMULATION TIMELINE    |                                          |
| - Week Scrubber (Week 0 to Week 26 / Day 0 to 182)    |                                          |
| - Play/Pause | Step -/+ | Phase Annotations           |                                          |
| - Synchronized Multi-Series Chart: REI(t), Buffer(t), |                                          |
|   and CPI(t) with Shock Window Shading                |                                          |
+-------------------------------------------------------+------------------------------------------+
```

- **Canvas Expansion Controls:** Users can view the **Geographic Map** and **Dependency Network** side-by-side (`42% / 58%` split, default on $\ge 1280\text{px}$) or maximize either canvas to `100%` of the center stage with a single toggle (`[Split View | Map Focus | Network Focus]`).
- **Scenario Comparison Drawer / Modal:** Clicking **Compare Scenarios** opens a structured bottom/overlay comparison sheet contrasting the active configuration against the Baseline or any Saved Snapshot across parameters, time-series trajectories, and top-exposed nodes.

### 2.2 Responsive Adaptation for Tablet & Mobile

| Breakpoint | Layout Adaptation Strategy |
| :--- | :--- |
| **Desktop Wide (`>= 1280px`)** | Full 4-zone synchronized workbench with side-by-side Map (`42%`) + Network (`58%`), persistent Right Inspector Dock (`380px`), and Bottom Timeline Dock (`210px`). |
| **Compact Laptop / Tablet Landscape (`1024px – 1279px`)** | Center stage defaults to tabbed `[Dependency Network | Geographic Map]` view (`100%` stage width) to prevent cramped node labels; Right Inspector (`340px`) and Bottom Timeline (`190px`) remain docked. |
| **Tablet Portrait (`768px – 1023px`)** | Collapsible Top Scenario Drawer; main stage switches between `Network`, `Map`, and `Compare`; Timeline remains docked below the canvas; Right Inspector converts into a slide-over sheet/bottom panel. |
| **Mobile (`< 768px`)** | **Guided Narrative Stack & Bottom Navigation Bar:** Instead of shrinking a 48-node hairball onto a 375px screen, mobile presents: (1) Compact Sticky Scenario & Week Scrubber Header, (2) Tabbed Workspace (`[Pathway Cards | Map | Network | Timeline | Evidence]`), where the **Dependency Network** automatically defaults to `1-Hop Focused Neighborhood Mode` around the selected node with touch pan/zoom. |

---

## 3. Primary Interaction Inventory & State Synchronization

Every interactive control in EconoLoom reads from and mutates a single canonical store (`useScenarioStore`), ensuring that all four visual panels reflect the exact same simulation state at all times.

| Control ID | Component Location | User Action | State Read | State Modified | Synchronized View Updates |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CTL-01** | Top Bar: `PresetSelector` | Select preset (`Hormuz`, `Taiwan Fabs`, `Panama Canal`) | `activePresetId` | `activePresetId`, `params`, `selectedNodeId` (sets to shock origin), `currentWeek` (sets to preset inflection week) | Recomputes 26-week simulation; centers Map on chokepoint; highlights preset pathway; updates Timeline & Inspector. |
| **CTL-02** | Top Bar: `SeverityControl` | Drag slider or type `%` ($0–100\%$, step $5\%$) | `params.severity` | `params.severity` (clamped $[0, 1]$) | Recomputes `SimulationResult`; updates Map corridor thickness/color, Graph node/edge colors, Timeline curves, and Inspector metrics. |
| **CTL-03** | Top Bar: `DurationControl` | Drag slider or type days ($7–180\text{d}$, step $7\text{d}$) | `params.durationDays` | `params.durationDays` (clamped $[7, 180]$) | Shifts the shaded `Active Disruption Window` on the Timeline; recalculates buffer exhaustion week and post-shock recovery tail. |
| **CTL-04** | Top Bar: `BufferMultiplierControl` | Select or slide buffer multiplier ($0.5\times–2.0\times$) | `params.inventoryBufferMultiplier` | `params.inventoryBufferMultiplier` | Scales initial node buffer capacities $I_i^{\max}$; shifts stockout onset week $t^*_i$ earlier or later on the Timeline. |
| **CTL-05** | Top Bar: `MitigationToggle` | Select `Restricted`, `Baseline`, or `Enhanced` | `params.mitigationProfile` | `params.mitigationProfile` | Updates bypass corridor arcs on the Map (`--mitigation-cyan`) and substitution absorption in the Node Inspector. |
| **CTL-06** | Top Bar: `ResetBaselineBtn` | Click *Reset to Preset* or *Zero Disruption* | `activePresetId`, `params` | Resets `params` to preset default (or $S=0$) | Restores clean baseline or default preset state; announces reset to screen readers. |
| **CTL-07** | Geographic View: `MapEntityClick` | Click chokepoint beacon, hub circle, or corridor arc | `selectedNodeId`, `selectedEdgeId` | `selectedNodeId` or `selectedEdgeId` | Selects corresponding node/edge in Dependency Network; scrolls Right Inspector to entity details; plots node on Timeline. |
| **CTL-08** | Dependency Network: `GraphNodeClick` | Click or press `Enter`/`Space` on any graph node | `selectedNodeId`, `graphFilter` | `selectedNodeId` | Highlights all upstream/downstream connected paths; pans Map to node's region; updates Inspector and Timeline series. |
| **CTL-09** | Dependency Network: `GraphFilterBar` | Change Hop Depth (`All`, `1-Hop`, `2-Hop`), Category filter, or Min $\text{REI}$ slider | `graphFilter` | `graphFilter.maxHops`, `graphFilter.categories`, `graphFilter.minRei` | Filters or dims non-matching nodes in the DAG without altering underlying simulation calculations. |
| **CTL-10** | Timeline Dock: `WeekScrubber` | Drag scrubber, click week tick ($t \in [0, 26]$), or press `Play/Pause` | `currentWeek`, `isPlaying` | `currentWeek` ($0 \dots 26$), `isPlaying` | Updates Map halos, Graph node/edge colors, and Inspector metrics to the exact state at week $t$. |
| **CTL-11** | Right Dock: `PathwayTargetSelect` | Pick downstream industry or consumer category | `pathwayTargetNodeId` | `pathwayTargetNodeId`, `activeInspectorTab = 'pathway'` | Computes and highlights the dominant causal chain from shock origin $\to$ target node on both Map and Network; renders step-by-step narrative cards. |
| **CTL-12** | Top Bar / Drawer: `SaveAndCompare` | Click *Save Snapshot*, select two snapshots, or toggle *Compare vs. Baseline* | `savedScenarios`, `comparisonScenarioId` | `savedScenarios` (persisted to `localStorage`), `comparisonScenarioId`, `isCompareOpen` | Opens Comparison Drawer showing parameter deltas and side-by-side $\Delta\text{REI}(t)$ and $\Delta t^*_{\text{stockout}}$ metrics. |

---

## 4. Application States, Microcopy & Epistemic Guardrails

### 4.1 Self-Explanatory Interface Copy (Zero-Manual Onboarding)
- **Top Epistemic Pill:** Always visible in the header: `Deterministic Scenario Explorer · Outputs are Relative Exposure & Cost-Pressure Indices (0–100), not retail price forecasts.`
- **Plain-Language Metric Tooltips:**
  - *Relative Exposure Index ($\text{REI}$):* *"Measures how severely upstream supply shortages constrain this node at Week $t$ ($0 =$ normal operations; $100 =$ complete bottleneck halt) after accounting for route bypasses, input substitution, and remaining inventory buffers."*
  - *Inventory Buffer Cover:* *"Estimated weeks of baseline input stock remaining at Week $t$. While buffers remain above zero, they cushion downstream production; once exhausted, shortages cascade rapidly."*
  - *Cost-Pressure Index ($\text{CPI}$):* *"Relative indicator ($0–100$) combining upstream input scarcity, buffer depletion, and rerouting freight friction. Does not predict exact retail dollar prices."*

### 4.2 Empty, Loading, Zero-Shock & Error States
1. **Zero-Disruption State ($S = 0\%$):**
   - Map and Network render in calm baseline slate (`#475569`) with steady green inventory gauges.
   - Impact Explorer banner: *"Baseline Equilibrium ($0\%$ Disruption). Increase Disruption Severity above $0\%$ or select a Scenario Preset to explore shock propagation."*
2. **Unexposed Node Selected ($\text{REI}_i(t) = 0$ for all $t$):**
   - Inspector card: *"Not Exposed in Current Scenario — No directed supply pathway connects [Shock Origin] to [Selected Node] within the modeled network."* Includes a quick-action button: *"Switch to a scenario that affects this node"* or *"Trigger custom shock here."*
3. **Over-Filtered Graph Empty State:**
   - If filters hide all 48 nodes, an inline overlay centered on the Network canvas states: *"No nodes match your current filter threshold ($\text{REI} \ge X$)."* with a prominent **`Reset Filters`** button.
4. **Persistence / Import Error State:**
   - If a user imports a malformed scenario JSON or `localStorage` fails, a dismissible amber toast explains the exact validation error (via Zod issue formatting) and preserves the current active workspace state.

---

## 5. Accessibility Requirements (WCAG 2.1 AA Compliance)

1. **Colorblind-Safe Dual Encoding:** Exposure state is never communicated by color alone. Every node card in the Dependency Network displays:
   - Its numeric $\text{REI}$ badge in monospace font (e.g., `REI 64`),
   - A distinct geometric category icon (`Diamond` = Chokepoint, `Globe` = Geography, `Hexagon` = Commodity, `Factory` = Industry, `Cart` = Consumer), and
   - Distinct border dash/weight patterns (`solid 2.5px` for shock origin, `solid 1.5px` for affected, `dashed 1px` for bypassed/unexposed).
2. **Full Keyboard Navigation:**
   - All top-bar controls, tabs, and drawers use accessible Radix UI primitives (`roving tabindex`, `Escape` to close modals, visible `--focus-ring`).
   - Every node in the Dependency Network SVG is focusable (`tabIndex={0}`, `role="button"`, `aria-label="[Node Name], [Category], Relative Exposure [X] out of 100 at Week [t]"`) and supports `Enter`/`Space` selection.
   - The 26-week Timeline Scrubber is a native/Radix accessible slider (`role="slider"`, `aria-valuemin={0}`, `aria-valuemax={26}`, `aria-valuenow={currentWeek}`, `aria-valuetext="Week [t] ([d] days): [Phase Label]"`), operable via `ArrowLeft` / `ArrowRight` / `Home` / `End`.
3. **Screen-Reader Chart Summaries & Live Regions:**
   - An `aria-live="polite"` status region announces scenario recomputations and preset switches (e.g., *"Loaded Strait of Hormuz preset at 60% severity, 90 days. 31 of 48 nodes exposed; peak downstream exposure reaches 74.2 at Week 13."*).
   - Time-series charts include a visually hidden (`sr-only`) structured summary table listing key inflection weeks (Week 0, Week 4, Week 8, Peak Week, Week 26) for screen-reader users.

---

## 6. Milestone 4 Visual Stage Implementation Notes

- **Visual Stage Mode Bar (`Split View | Dependency Graph | Geographic Map`):** Allows users to inspect the Geographic Corridor Map and Directed Dependency Graph together in lockstep (`Split View`) or focus exclusively on either canvas.
- **Coordinate Honesty & Non-Geographic Node Banner:** Only the 12 nodes with verified physical coordinates (`3 Chokepoints` + `9 Regional Hubs`) render as map markers. Selecting any of the 36 abstract `commodity`, `industry`, or `consumer_category` nodes displays a prominent banner in `WorldMap.tsx` explaining that the node has no single-point physical marker and providing one-click links to its connected upstream physical chokepoints and regional hubs.
- **Explicit Visual Legends & Model-Derived Framing:** Both `DependencyNetwork.tsx` and `WorldMap.tsx` include persistent footer legends distinguishing structural baseline attributes (`Node Category`, `Edge Dependency Share w_uv`, `Criticality c_uv`) from `Simulated Output — Model-Derived` weekly exposure (`REI`, `CPI`, `SeverityBand`, and `Reroute Bypass`).

