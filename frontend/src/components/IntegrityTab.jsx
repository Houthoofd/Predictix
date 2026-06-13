import React, { useState } from 'react';
import IntegrityDiagnostics from './IntegrityDiagnostics';
import IntegrityBatcherControls from './IntegrityBatcherControls';
import IntegrityBatcherQueue from './IntegrityBatcherQueue';
import MatchDiagnosticsList from './MatchDiagnosticsList';
import MatchDiagnosticsDetails from './MatchDiagnosticsDetails';
import CustomLogosManager from './CustomLogosManager';
import LogoMappingModal from './LogoMappingModal';
import ManualStatsModal from './ManualStatsModal';
import useIntegrityBatcher from './useIntegrityBatcher';

export default function IntegrityTab({
  predictions,
  customLogos,
  onSaveCustomLogo,
  onDeleteCustomLogo,
  onSaveCustomHistoricalMatch,
  onCrawlMatchHistory,
  onRefreshPredictions
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const selectedMatch = predictions?.find(p => p.match_id === selectedMatchId) || null;

  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [targetLink, setTargetLink] = useState('');
  const [logoForm, setLogoForm] = useState({ team: '', url: '' });
  const [activeKebabMatchId, setActiveKebabMatchId] = useState(null);

  const {
    batcherStatus,
    batcherQueueLength,
    batcherCurrentIndex,
    batcherProcessed,
    batcherSuccess,
    batcherErrors,
    batcherLogs,
    batcherLoading,
    batcherQueue,
    injectedUrl,
    setInjectedUrl,
    injecting,
    prioritizingId,
    cleaning,
    handleStartBatcher,
    handlePauseBatcher,
    handleStopBatcher,
    handlePrioritizeMatch,
    handleInjectUrl,
    handleInjectAndPrioritize,
    handleCleanupDatabase
  } = useIntegrityBatcher(onRefreshPredictions);

  const handleOpenLogoModal = (teamName) => {
    const existing = customLogos.find(l => l.team_name.toLowerCase() === teamName.toLowerCase());
    setLogoForm({ team: teamName, url: existing ? existing.logo_url : '' });
    setShowLogoModal(true);
  };

  const handleSaveLogo = () => {
    if (!logoForm.url.trim()) return;
    onSaveCustomLogo(logoForm.team, logoForm.url.trim());
    setShowLogoModal(false);
  };

  const handleOpenStatsModal = (link) => {
    setTargetLink(link);
    setShowStatsModal(true);
  };

  const handleSaveStats = async (payload) => {
    const success = await onSaveCustomHistoricalMatch(payload);
    if (success) {
      setShowStatsModal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <IntegrityDiagnostics predictions={predictions} />

      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginTop: '5px' }}>
          <IntegrityBatcherControls
            batcherStatus={batcherStatus}
            batcherLoading={batcherLoading}
            cleaning={cleaning}
            injecting={injecting}
            injectedUrl={injectedUrl}
            setInjectedUrl={setInjectedUrl}
            handleStartBatcher={handleStartBatcher}
            handlePauseBatcher={handlePauseBatcher}
            handleStopBatcher={handleStopBatcher}
            handleCleanupDatabase={handleCleanupDatabase}
            handleInjectUrl={handleInjectUrl}
          />
          <IntegrityBatcherQueue
            batcherStatus={batcherStatus}
            batcherQueueLength={batcherQueueLength}
            batcherCurrentIndex={batcherCurrentIndex}
            batcherSuccess={batcherSuccess}
            batcherErrors={batcherErrors}
            batcherLogs={batcherLogs}
            batcherQueue={batcherQueue}
            prioritizingId={prioritizingId}
            handlePrioritizeMatch={handlePrioritizeMatch}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', alignItems: 'flex-start' }}>
        <MatchDiagnosticsList
          predictions={predictions}
          selectedMatchId={selectedMatchId}
          setSelectedMatchId={setSelectedMatchId}
          activeKebabMatchId={activeKebabMatchId}
          setActiveKebabMatchId={setActiveKebabMatchId}
          handleInjectAndPrioritize={handleInjectAndPrioritize}
        />
        <MatchDiagnosticsDetails
          selectedMatch={selectedMatch}
          handleOpenLogoModal={handleOpenLogoModal}
          onCrawlMatchHistory={onCrawlMatchHistory}
          handleOpenStatsModal={handleOpenStatsModal}
        />
      </div>

      <CustomLogosManager
        customLogos={customLogos}
        onDeleteCustomLogo={onDeleteCustomLogo}
      />

      <LogoMappingModal
        show={showLogoModal}
        logoForm={logoForm}
        setLogoForm={setLogoForm}
        onClose={() => setShowLogoModal(false)}
        onSave={handleSaveLogo}
      />

      <ManualStatsModal
        show={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        onSave={handleSaveStats}
        selectedMatch={selectedMatch}
        targetLink={targetLink}
      />
    </div>
  );
}
