import React from 'react';
import AddBetModal from './AddBetModal';
import EditBetModal from './EditBetModal';
import ResetBankrollModal from './ResetBankrollModal';
import MatchDetailsModal from './MatchDetailsModal';
import BatchBetsModal from './BatchBetsModal';
import ScrapeResultModal from './ScrapeResultModal';
import ConfirmModal from './ConfirmModal';
import NotificationModal from './NotificationModal';

export default function AppModals({
  modals,
  predictions,
  bets,
  scraper,
  notify,
  navigation
}) {
  return (
    <>
      <AddBetModal 
        showAddBetModal={modals.showAddBetModal}
        setShowAddBetModal={modals.setShowAddBetModal}
        prefilledBet={predictions.prefilledBet}
        setPrefilledBet={predictions.setPrefilledBet}
        newBetForm={modals.newBetForm}
        setNewBetForm={modals.setNewBetForm}
        handleAddBet={(e) => modals.handleAddBet(e, bets.refreshAllDataSilent)}
        bankroll={bets.bankroll}
        betPlacedSuccess={modals.betPlacedSuccess}
      />

      <EditBetModal 
        showEditBetModal={modals.showEditBetModal}
        setShowEditBetModal={modals.setShowEditBetModal}
        editBetForm={modals.editBetForm}
        setEditBetForm={modals.setEditBetForm}
        handleEditBet={(e) => modals.handleEditBet(e, bets.refreshAllDataSilent)}
        bankroll={bets.bankroll}
      />

      <ResetBankrollModal 
        showResetBankrollModal={modals.showResetBankrollModal}
        setShowResetBankrollModal={modals.setShowResetBankrollModal}
        resetAmount={modals.resetAmount}
        setResetAmount={modals.setResetAmount}
        handleResetBankroll={(e) => bets.handleResetBankroll(modals.resetAmount).then(success => success && modals.setShowResetBankrollModal(false))}
        bankroll={bets.bankroll}
      />

      <MatchDetailsModal 
        selectedMatchDetails={predictions.selectedMatchDetails}
        setSelectedMatchDetails={predictions.setSelectedMatchDetails}
        crawlLoading={predictions.crawlLoading}
        handleCrawlHistory={predictions.handleCrawlHistory}
        handleQuickPlaceBet={(pred) => modals.handleQuickPlaceBet(pred, bets.bankroll.balance)}
      />

      <BatchBetsModal 
        selectedPredIds={predictions.selectedPredIds}
        setSelectedPredIds={predictions.setSelectedPredIds}
        showBatchBetModal={modals.showBatchBetModal}
        setShowBatchBetModal={modals.setShowBatchBetModal}
        batchBetsForm={modals.batchBetsForm}
        setBatchBetsForm={modals.setBatchBetsForm}
        batchGlobalStake={modals.batchGlobalStake}
        setBatchGlobalStake={modals.setBatchGlobalStake}
        batchGlobalBookmaker={modals.batchGlobalBookmaker}
        setBatchGlobalBookmaker={modals.setBatchGlobalBookmaker}
        batchLoading={modals.batchLoading}
        batchProgress={modals.batchProgress}
        bankroll={bets.bankroll}
        handleOpenBatchPlacement={(ids) => modals.handleOpenBatchPlacement(ids, bets.bankroll.balance)}
        handleConfirmBatchBets={(e) => modals.handleConfirmBatchBets(e, bets.refreshAllDataSilent, () => predictions.setSelectedPredIds([]))}
        handleApplyGlobalStake={modals.handleApplyGlobalStake}
        handleApplyGlobalBookmaker={modals.handleApplyGlobalBookmaker}
      />

      <ScrapeResultModal 
        show={scraper.showScrapeResultModal}
        onClose={() => scraper.setShowScrapeResultModal(false)}
        stats={scraper.scrapeResultStats}
        onNavigateToMagicPredictions={() => {
          navigation.setActiveTab('magic-predictions');
          scraper.setShowScrapeResultModal(false);
        }}
      />

      <ConfirmModal 
        show={notify.confirmDialog.show}
        title={notify.confirmDialog.title}
        message={notify.confirmDialog.message}
        confirmText={notify.confirmDialog.confirmText}
        cancelText={notify.confirmDialog.cancelText}
        isDanger={notify.confirmDialog.isDanger}
        onConfirm={notify.confirmDialog.onConfirm}
        onCancel={notify.confirmDialog.onCancel}
      />

      <NotificationModal 
        show={notify.notification.show}
        type={notify.notification.type}
        title={notify.notification.title}
        message={notify.notification.message}
        onClose={() => notify.setNotification(prev => ({ ...prev, show: false }))}
      />
    </>
  );
}
