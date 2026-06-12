import React, { useState, useEffect } from 'react';
import ScraperConsoleCard from './ScraperConsoleCard';
import ScraperLiveMatchesGrid from './ScraperLiveMatchesGrid';
import ScraperLogsConsole from './ScraperLogsConsole';

export default function ScraperTab({
  scraping,
  scrapeLimit,
  setScrapeLimit,
  matchesRemaining,
  scrapeProgress,
  scrapePhase,
  scrapeTimeRemaining,
  currentPrimary,
  totalPrimary,
  currentDeep,
  totalDeep,
  scraperLogs,
  handleStopScraping,
  handleResetScraper,
  handleTriggerScraping,
  handleStartDetailedScraping,
  handleOneClickScraping,
  consoleEndRef,
  selectedScraperStrategyId,
  setSelectedScraperStrategyId,
  scraperTargetDate,
  setScraperTargetDate,
  liveScrapedMatches,
  selectedScraperSource,
  setSelectedScraperSource,
  selectedScraperSport,
  setSelectedScraperSport
}) {
  const [strategies, setStrategies] = useState([]);
  const [expandedMatches, setExpandedMatches] = useState({});

  useEffect(() => {
    const fetchActiveStrategies = async () => {
      try {
        const res = await fetch('/api/strategies/magic');
        const json = await res.json();
        if (json.success) {
          setStrategies(json.data.filter(s => s.status === 'ACTIVE') || []);
        }
      } catch (err) {
        console.error("Failed to load active strategies in Scraper:", err);
      }
    };
    fetchActiveStrategies();
  }, []);

  const toggleMatchExpand = (id) => {
    setExpandedMatches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 5px rgba(0, 130, 255, 0.4), 0 0 10px rgba(0, 130, 255, 0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 15px rgba(0, 130, 255, 0.8), 0 0 25px rgba(0, 130, 255, 0.4);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 5px rgba(0, 130, 255, 0.4), 0 0 10px rgba(0, 130, 255, 0.2);
            transform: scale(1);
          }
        }
        .step-active {
          animation: pulseGlow 2s infinite ease-in-out;
          border-color: #0082ff !important;
          background: rgba(0, 130, 255, 0.15) !important;
          color: #0082ff !important;
        }
        .step-completed {
          border-color: #34c759 !important;
          background: rgba(52, 199, 89, 0.15) !important;
          color: #34c759 !important;
        }
        .step-pending {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: rgba(255, 255, 255, 0.02) !important;
          color: var(--text-muted) !important;
        }
        .connector-completed {
          background: #34c759 !important;
        }
        .connector-active {
          background: linear-gradient(90deg, #34c759, #0082ff) !important;
        }
        .connector-pending {
          background: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>

      <ScraperConsoleCard
        selectedScraperSource={selectedScraperSource}
        setSelectedScraperSource={setSelectedScraperSource}
        selectedScraperSport={selectedScraperSport}
        setSelectedScraperSport={setSelectedScraperSport}
        scraperTargetDate={scraperTargetDate}
        setScraperTargetDate={setScraperTargetDate}
        selectedScraperStrategyId={selectedScraperStrategyId}
        setSelectedScraperStrategyId={setSelectedScraperStrategyId}
        strategies={strategies}
        scrapePhase={scrapePhase}
        scrapeLimit={scrapeLimit}
        setScrapeLimit={setScrapeLimit}
        scraping={scraping}
        totalPrimary={totalPrimary}
        handleTriggerScraping={handleTriggerScraping}
        handleStartDetailedScraping={handleStartDetailedScraping}
        handleStopScraping={handleStopScraping}
        handleResetScraper={handleResetScraper}
        scrapeTimeRemaining={scrapeTimeRemaining}
        scrapeProgress={scrapeProgress}
        matchesRemaining={matchesRemaining}
        currentPrimary={currentPrimary}
        totalDeep={totalDeep}
        currentDeep={currentDeep}
      />

      {liveScrapedMatches && liveScrapedMatches.length > 0 && (
        <ScraperLiveMatchesGrid
          liveScrapedMatches={liveScrapedMatches}
          expandedMatches={expandedMatches}
          toggleMatchExpand={toggleMatchExpand}
          scrapePhase={scrapePhase}
        />
      )}

      {scraperLogs.length > 0 && (
        <ScraperLogsConsole
          scraperLogs={scraperLogs}
          consoleEndRef={consoleEndRef}
        />
      )}

    </div>
  );
}
