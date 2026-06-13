import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';

// Custom Hooks
import useNavigationState from './hooks/useNavigationState';
import useNotificationManager from './hooks/useNotificationManager';
import useBetsManager from './hooks/useBetsManager';
import usePredictionsManager from './hooks/usePredictionsManager';
import useScraperManager from './hooks/useScraperManager';
import useModalManager from './hooks/useModalManager';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import ScraperTab from './components/ScraperTab';
import TrackerTab from './components/TrackerTab';
import MagicPredictionsTab from './components/MagicPredictionsTab';
import StrategiesTab from './components/StrategiesTab';
import BasketTab from './components/BasketTab';
import IntegrityTab from './components/IntegrityTab';
import CronsTab from './components/CronsTab';
import AppModals from './components/AppModals';
import AppToasts from './components/AppToasts';
import PageHeaderTitle from './components/PageHeaderTitle';
import SettingsTab from './components/SettingsTab';
import ModelsTab from './components/ModelsTab';

export default function App() {
  const [settings, setSettings] = useState(null);
  const navigation = useNavigationState();
  const notify = useNotificationManager(settings);
  
  const predictions = usePredictionsManager({
    showToast: notify.showToast
  });

  const bets = useBetsManager({
    showToast: notify.showToast,
    showConfirm: notify.showConfirm,
    onSettledBets: (settledBetsList) => {
      scraper.setScrapeResultStats({ count: 0, settledBets: settledBetsList });
      scraper.setShowScrapeResultModal(true);
    }
  });

  const refreshAllData = async () => {
    try {
      await Promise.all([
        bets.refreshAllDataSilent(),
        predictions.fetchPredictions()
      ]);
    } catch (error) {
      console.error("Error refreshing all data:", error);
    }
  };

  const scraper = useScraperManager({
    showToast: notify.showToast,
    refreshAllDataSilent: refreshAllData
  });

  const modals = useModalManager({
    showToast: notify.showToast,
    showConfirm: notify.showConfirm,
    predictions: predictions.predictions,
    basketBets: bets.basketBets,
    setBasketBets: bets.setBasketBets,
    globalSettings: settings
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const consoleEndRef = useRef(null);

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      try {
        const resSettings = await fetch('/api/settings');
        const jsonSettings = await resSettings.json();
        if (jsonSettings.success) {
          setSettings(jsonSettings.data);
        }
      } catch (e) {
        console.error("Error fetching settings on mount:", e);
      }

      try {
        await Promise.all([
          bets.fetchBankroll(),
          bets.fetchBets(),
          predictions.fetchPredictions(),
          bets.fetchStats(),
          predictions.fetchCustomLogos()
        ]);
      } catch (error) {
        console.error("Error fetching data on mount:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  // Fetch magic predictions whenever minCoverage or predictions change
  useEffect(() => {
    predictions.fetchMagicSignals(predictions.minCoverage);
  }, [predictions.minCoverage, predictions.predictions]);

  // Scroll console to bottom when logs update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scraper.scraperLogs]);

  // Compute sport match counts dynamically from magic signals
  const sportCounts = useMemo(() => {
    const counts = {};
    if (predictions.magicSignals && Array.isArray(predictions.magicSignals)) {
      predictions.magicSignals.forEach(s => {
        const sportKey = s.sport || 'football';
        counts[sportKey] = (counts[sportKey] || 0) + 1;
      });
    }
    return counts;
  }, [predictions.magicSignals]);

  const activeTab = navigation.activeTab;

  return (
    <div className="app-container">
      <Sidebar 
        sidebarCollapsed={navigation.sidebarCollapsed} 
        activeTab={activeTab} 
        setActiveTab={navigation.setActiveTab} 
        setShowResetBankrollModal={modals.setShowResetBankrollModal} 
        basketCount={bets.basketBets.length}
        selectedMagicSport={navigation.selectedMagicSport}
        setSelectedMagicSport={navigation.setSelectedMagicSport}
        sportCounts={sportCounts}
      />

      <main className={`main-content ${navigation.sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header 
          sidebarCollapsed={navigation.sidebarCollapsed}
          setSidebarCollapsed={navigation.setSidebarCollapsed}
          activeTab={activeTab}
          theme={navigation.theme}
          setTheme={navigation.setTheme}
          bankroll={bets.bankroll}
          notifications={notify.notifications}
          setNotifications={notify.setNotifications}
          handleClearNotifications={notify.handleClearNotifications}
        />

        <div className="page-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <PageHeaderTitle activeTab={activeTab} />
            <div className="header-actions">
              {activeTab === 'tracker' && (
                <button className="btn btn-primary" onClick={() => { predictions.setPrefilledBet(null); modals.setShowAddBetModal(true); }}>
                  <Plus size={16} />
                  <span>Nouveau Pari</span>
                </button>
              )}
            </div>
          </div>

          {initialLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
              <RefreshCcw size={40} className="console-line system animate-spin" />
              <p style={{ fontFamily: 'Outfit', fontWeight: 600 }}>Chargement de Predictix...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  stats={bets.stats} 
                  bets={bets.bets} 
                  setActiveTab={navigation.setActiveTab} 
                  setTrackerSubTab={navigation.setTrackerSubTab}
                />
              )}

              {activeTab === 'scraper' && (
                <ScraperTab 
                  scraping={scraper.scraping}
                  scrapeLimit={scraper.scrapeLimit}
                  setScrapeLimit={scraper.setScrapeLimit}
                  matchesRemaining={scraper.matchesRemaining}
                  scrapeProgress={scraper.scrapeProgress}
                  scrapePhase={scraper.scrapePhase}
                  scrapeTimeRemaining={scraper.scrapeTimeRemaining}
                  currentPrimary={scraper.currentPrimary}
                  totalPrimary={scraper.totalPrimary}
                  currentDeep={scraper.currentDeep}
                  totalDeep={scraper.totalDeep}
                  scraperLogs={scraper.scraperLogs}
                  handleStopScraping={scraper.handleStopScraping}
                  handleResetScraper={scraper.handleResetScraper}
                  handleTriggerScraping={scraper.handleTriggerScraping}
                  handleStartDetailedScraping={scraper.handleStartDetailedScraping}
                  handleOneClickScraping={scraper.handleOneClickScraping}
                  consoleEndRef={consoleEndRef}
                  selectedScraperStrategyId={scraper.selectedScraperStrategyId}
                  setSelectedScraperStrategyId={scraper.setSelectedScraperStrategyId}
                  scraperTargetDate={scraper.scraperTargetDate}
                  setScraperTargetDate={scraper.setScraperTargetDate}
                  liveScrapedMatches={scraper.liveScrapedMatches}
                  selectedScraperSource={scraper.selectedScraperSource}
                  setSelectedScraperSource={scraper.setSelectedScraperSource}
                  selectedScraperSport={scraper.selectedScraperSport}
                  setSelectedScraperSport={scraper.setSelectedScraperSport}
                />
              )}

              {activeTab === 'magic-predictions' && (
                <MagicPredictionsTab 
                  predictions={predictions.predictions}
                  handleQuickPlaceBet={(pred) => modals.handleQuickPlaceBet(pred, bets.bankroll.balance)}
                  setSelectedMatchDetails={predictions.setSelectedMatchDetails}
                  handleAddToBasket={(pred) => modals.handleAddToBasket(pred, bets.bankroll.balance)}
                  handleInstantPlaceBet={(pred) => modals.handleInstantPlaceBet(pred, bets.bankroll.balance, bets.refreshAllDataSilent)}
                  selectedPredIds={predictions.selectedPredIds}
                  setSelectedPredIds={predictions.setSelectedPredIds}
                  selectedMagicSport={navigation.selectedMagicSport}
                  setSelectedMagicSport={navigation.setSelectedMagicSport}
                  magicSignals={predictions.magicSignals}
                  magicLoading={predictions.magicLoading}
                  magicError={predictions.magicError}
                  fetchMagicSignals={predictions.fetchMagicSignals}
                  minCoverage={predictions.minCoverage}
                  setMinCoverage={predictions.setMinCoverage}
                />
              )}

              {activeTab === 'tracker' && (
                <TrackerTab 
                  bets={bets.bets} 
                  stats={bets.stats} 
                  handleSettleBet={bets.handleSettleBet} 
                  handleDeleteBet={bets.handleDeleteBet} 
                  handleDeleteMultipleBets={bets.handleDeleteMultipleBets}
                  handleRefreshBet={bets.handleRefreshBet}
                  handleRefreshAllBets={bets.handleRefreshAllBets}
                  betRefreshLoading={bets.betRefreshLoading}
                  globalRefreshLoading={bets.globalRefreshLoading}
                  subTab={navigation.trackerSubTab}
                  setSubTab={navigation.setTrackerSubTab}
                  onOpenEditBetModal={modals.handleOpenEditBetModal}
                />
              )}

              {activeTab === 'strategies' && (
                <StrategiesTab />
              )}

              {activeTab === 'basket' && (
                <BasketTab 
                  basketBets={bets.basketBets}
                  setBasketBets={bets.setBasketBets}
                  bankroll={bets.bankroll}
                  fetchAllData={bets.refreshAllDataSilent}
                  showNotification={notify.showNotification}
                  showToast={notify.showToast}
                />
              )}

              {activeTab === 'integrity' && (
                <IntegrityTab 
                  predictions={predictions.predictions}
                  customLogos={predictions.customLogos}
                  onSaveCustomLogo={predictions.handleSaveCustomLogo}
                  onDeleteCustomLogo={predictions.handleDeleteCustomLogo}
                  onSaveCustomHistoricalMatch={predictions.handleSaveCustomHistoricalMatch}
                  onCrawlMatchHistory={predictions.handleCrawlHistory}
                  onRefreshPredictions={predictions.fetchPredictions}
                  showToast={notify.showToast}
                />
              )}

              {activeTab === 'crons' && (
                <CronsTab showNotification={notify.showNotification} />
              )}

              {activeTab === 'models' && (
                <ModelsTab />
              )}

              {activeTab === 'settings' && (
                <SettingsTab 
                  showToast={notify.showToast} 
                  setShowResetBankrollModal={modals.setShowResetBankrollModal}
                  onSettingsChanged={setSettings}
                />
              )}
            </>
          )}
        </div>

        <AppModals 
          modals={modals}
          predictions={predictions}
          bets={bets}
          scraper={scraper}
          notify={notify}
          navigation={navigation}
        />

        <AppToasts toasts={notify.toasts} />
      </main>
    </div>
  );
}
