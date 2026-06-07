import { useState } from 'react';

export default function useModalManager({ showToast, showConfirm, predictions, basketBets, setBasketBets }) {
  const [showAddBetModal, setShowAddBetModal] = useState(false);
  const [showEditBetModal, setShowEditBetModal] = useState(false);
  const [betPlacedSuccess, setBetPlacedSuccess] = useState(false);
  const [showResetBankrollModal, setShowResetBankrollModal] = useState(false);
  const [showBatchBetModal, setShowBatchBetModal] = useState(false);

  const [editBetForm, setEditBetForm] = useState({
    id: '', match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
    best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
    bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
  });

  const [newBetForm, setNewBetForm] = useState({
    match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
    best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
    bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
  });

  const [batchBetsForm, setBatchBetsForm] = useState([]);
  const [batchGlobalStake, setBatchGlobalStake] = useState('');
  const [batchGlobalBookmaker, setBatchGlobalBookmaker] = useState('Unibet');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [resetAmount, setResetAmount] = useState('1000');

  const handleAddBet = async (e, fetchAllData) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBetForm)
      });
      const json = await res.json();
      if (json.success) {
        setBetPlacedSuccess(true);
        await fetchAllData();
        setTimeout(() => {
          setShowAddBetModal(false);
          setBetPlacedSuccess(false);
          setNewBetForm({
            match_id: '', date: '', time: '', league: '', home_team: '', away_team: '',
            best_tip: 'Over', card_line: 4.5, odds: 1.85, stake: 50, probability: '',
            bookmaker: 'Unibet', status: 'PENDING', notes: '', match_url: '', sport: 'football'
          });
        }, 1500);
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Erreur lors de l'ajout du pari: " + err.message, "error");
    }
  };

  const handleEditBet = async (e, fetchAllData) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/bets/${editBetForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editBetForm.date,
          time: editBetForm.time,
          league: editBetForm.league,
          home_team: editBetForm.home_team,
          away_team: editBetForm.away_team,
          best_tip: editBetForm.best_tip,
          card_line: parseFloat(editBetForm.card_line),
          odds: parseFloat(editBetForm.odds),
          stake: parseFloat(editBetForm.stake),
          probability: editBetForm.probability ? parseInt(editBetForm.probability) : null,
          bookmaker: editBetForm.bookmaker,
          status: editBetForm.status,
          notes: editBetForm.notes,
          sport: editBetForm.sport
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowEditBetModal(false);
        await fetchAllData();
        showToast("Pari mis à jour avec succès !", "success");
      } else {
        showToast("Erreur: " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Erreur lors de la modification du pari: " + err.message, "error");
    }
  };

  const handleQuickPlaceBet = (pred, balance) => {
    const rawProb = pred.probability ? String(pred.probability) : '';
    const probNum = parseInt(rawProb.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);

    const now = new Date();
    setNewBetForm({
      match_id: pred.match_id,
      date: pred.date || now.toISOString().substring(0, 10),
      time: pred.time || '20:00',
      league: pred.tournament || 'Football',
      home_team: pred.home_team,
      away_team: pred.away_team,
      best_tip: pred.best_tip || 'Over',
      card_line: isNaN(lineNum) ? 4.5 : lineNum,
      odds: isNaN(oddsNum) ? 1.85 : oddsNum,
      stake: Math.round(balance * 0.05),
      probability: isNaN(probNum) ? '' : probNum,
      bookmaker: 'Unibet',
      status: 'PENDING',
      notes: pred.notes || `Placé depuis la prédiction Predictix (Probabilité: ${pred.probability})`,
      match_url: pred.match_url || '',
      sport: pred.sport || 'football'
    });
    setShowAddBetModal(true);
  };

  const handleAddToBasket = (pred, balance) => {
    if (basketBets.some(b => b.match_id === pred.match_id && b.best_tip === pred.best_tip && b.card_line === pred.card_line)) {
      showToast("Cette sélection est déjà dans votre panier.", "warning");
      return;
    }

    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
    const now = new Date();

    const newBasketBet = {
      id: `${pred.match_id}_${pred.best_tip}_${pred.card_line}`,
      match_id: pred.match_id,
      date: pred.date || now.toISOString().substring(0, 10),
      time: pred.time || '20:00',
      league: pred.tournament || 'Football',
      home_team: pred.home_team,
      away_team: pred.away_team,
      best_tip: pred.best_tip || 'Over',
      card_line: isNaN(lineNum) ? 4.5 : lineNum,
      odds: isNaN(oddsNum) ? 1.85 : oddsNum,
      stake: Math.round(balance * 0.05),
      probability: isNaN(probNum) ? '' : probNum,
      bookmaker: 'Unibet',
      status: 'PENDING',
      notes: pred.notes || `Ajouté depuis les Pronostics Magiques.`,
      match_url: pred.match_url || '',
      sport: pred.sport || 'football'
    };

    setBasketBets(prev => [...prev, newBasketBet]);
    showToast(`✓ Sélection ajoutée au panier avec succès !`, "success");
  };

  const handleInstantPlaceBet = async (pred, balance, fetchAllData) => {
    const probNum = parseInt(pred.probability.replace('%', ''));
    const lineNum = parseFloat(pred.card_line);
    const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
    const now = new Date();

    const instantBet = {
      match_id: pred.match_id,
      date: pred.date || now.toISOString().substring(0, 10),
      time: pred.time || '20:00',
      league: pred.tournament || 'Football',
      home_team: pred.home_team,
      away_team: pred.away_team,
      best_tip: pred.best_tip || 'Over',
      card_line: isNaN(lineNum) ? 4.5 : lineNum,
      odds: isNaN(oddsNum) ? 1.85 : oddsNum,
      stake: Math.round(balance * 0.05),
      probability: isNaN(probNum) ? '' : probNum,
      bookmaker: 'Unibet',
      status: 'PENDING',
      notes: pred.notes || `Placement direct depuis les Pronostics Magiques.`,
      match_url: pred.match_url || '',
      sport: pred.sport || 'football'
    };

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instantBet)
      });
      const json = await res.json();
      if (json.success) {
        await fetchAllData();
        showToast("Pari direct enregistré avec succès !", "success");
      } else {
        showToast("Impossible de placer le pari : " + json.error.message, "error");
      }
    } catch (err) {
      showToast("Une erreur réseau est survenue : " + err.message, "error");
    }
  };

  const handleOpenBatchPlacement = (selectedPredIds, balance) => {
    if (selectedPredIds.length === 0) return;
    const selectedPreds = predictions.filter(pred => selectedPredIds.includes(pred.match_id));
    
    const defaultBets = selectedPreds.map(pred => {
      const probNum = parseInt(pred.probability.replace('%', ''));
      const lineNum = parseFloat(pred.card_line);
      const oddsNum = pred.best_tip.toLowerCase() === 'over' ? parseFloat(pred.over_odds) : parseFloat(pred.under_odds);
      const now = new Date();
      
      return {
        match_id: pred.match_id,
        date: pred.date || now.toISOString().substring(0, 10),
        time: pred.time || '20:00',
        league: pred.tournament || 'Football',
        home_team: pred.home_team,
        away_team: pred.away_team,
        best_tip: pred.best_tip || 'Over',
        card_line: isNaN(lineNum) ? 4.5 : lineNum,
        odds: isNaN(oddsNum) ? 1.85 : oddsNum,
        stake: Math.round(balance * 0.05) || 50,
        probability: isNaN(probNum) ? '' : probNum,
        bookmaker: 'Unibet',
        status: 'PENDING',
        notes: `Placé en lot depuis Predictix (Probabilité: ${pred.probability})`,
        match_url: pred.match_url || '',
        sport: pred.sport || 'football'
      };
    });
    
    setBatchBetsForm(defaultBets);
    setBatchGlobalStake(Math.round(balance * 0.05) || 50);
    setBatchGlobalBookmaker('Unibet');
    setShowBatchBetModal(true);
  };

  const handleConfirmBatchBets = async (e, fetchAllData, clearSelectedPredIds) => {
    e.preventDefault();
    if (batchBetsForm.length === 0) return;
    
    setBatchLoading(true);
    setBatchProgress(0);
    
    try {
      let count = 0;
      for (const bet of batchBetsForm) {
        const res = await fetch('/api/bets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bet)
        });
        const json = await res.json();
        if (json.success) {
          count++;
          setBatchProgress(count);
        }
      }
      
      if (clearSelectedPredIds) clearSelectedPredIds();
      setShowBatchBetModal(false);
      await fetchAllData();
      showToast(`${count} paris ont été enregistrés avec succès !`, "success");
    } catch (err) {
      showToast("Erreur lors de l'enregistrement du lot: " + err.message, "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleApplyGlobalStake = () => {
    const amount = parseFloat(batchGlobalStake);
    if (isNaN(amount) || amount <= 0) {
      showToast("Veuillez saisir un montant de mise valide.", "warning");
      return;
    }
    setBatchBetsForm(prev => prev.map(b => ({ ...b, stake: amount })));
  };

  const handleApplyGlobalBookmaker = () => {
    if (!batchGlobalBookmaker.trim()) {
      showToast("Veuillez saisir un nom de bookmaker.", "warning");
      return;
    }
    setBatchBetsForm(prev => prev.map(b => ({ ...b, bookmaker: batchGlobalBookmaker })));
  };

  return {
    showAddBetModal,
    setShowAddBetModal,
    showEditBetModal,
    setShowEditBetModal,
    betPlacedSuccess,
    showResetBankrollModal,
    setShowResetBankrollModal,
    showBatchBetModal,
    setShowBatchBetModal,
    editBetForm,
    setEditBetForm,
    newBetForm,
    setNewBetForm,
    batchBetsForm,
    setBatchBetsForm,
    batchGlobalStake,
    setBatchGlobalStake,
    batchGlobalBookmaker,
    setBatchGlobalBookmaker,
    batchLoading,
    batchProgress,
    resetAmount,
    setResetAmount,
    handleAddBet,
    handleEditBet,
    handleQuickPlaceBet,
    handleAddToBasket,
    handleInstantPlaceBet,
    handleOpenBatchPlacement,
    handleConfirmBatchBets,
    handleApplyGlobalStake,
    handleApplyGlobalBookmaker
  };
}
