import React from 'react';
import DashboardKPIs from './DashboardKPIs';
import DashboardEvolutionChart from './DashboardEvolutionChart';
import DashboardPerformanceGrid from './DashboardPerformanceGrid';
import DashboardRecentBetsTable from './DashboardRecentBetsTable';

export default function DashboardTab({ stats, bets, setActiveTab, setTrackerSubTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Metrics Cards */}
      <DashboardKPIs stats={stats} />

      {/* Bankroll Evolution SVG Line Chart */}
      <DashboardEvolutionChart 
        stats={stats} 
        setActiveTab={setActiveTab} 
        setTrackerSubTab={setTrackerSubTab} 
      />

      {/* Sub-sections grid: Leagues & Bookmakers performances */}
      <DashboardPerformanceGrid stats={stats} />

      {/* Recent Bets Summary */}
      <DashboardRecentBetsTable 
        bets={bets} 
        currency={stats.bankroll?.currency} 
        setActiveTab={setActiveTab} 
      />
    </div>
  );
}

