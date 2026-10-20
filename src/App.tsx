import React from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { ScenarioSelectorBar } from './components/layout/ScenarioSelectorBar';
import { WorkspaceShell } from './components/layout/WorkspaceShell';
import { MethodologyModal } from './components/methodology/MethodologyModal';
import { ScenarioStoreProvider } from './state/useScenarioStore';

export const App: React.FC = () => {
  return (
    <ScenarioStoreProvider>
      <div className="min-h-screen bg-canvas text-text-primary">
        <AppHeader />
        <ScenarioSelectorBar />
        <WorkspaceShell />
        <MethodologyModal />
      </div>
    </ScenarioStoreProvider>
  );
};

export default App;
