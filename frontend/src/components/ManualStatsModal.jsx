import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { parseMatchEnDirectText } from '../utils/statsParser';
import ManualStatsParserInput from './ManualStatsParserInput';
import ManualStatsMatchDetailsFields from './ManualStatsMatchDetailsFields';
import ManualStatsCornersFields from './ManualStatsCornersFields';
import ManualStatsDetailFields from './ManualStatsDetailFields';

export default function ManualStatsModal({
  show,
  onClose,
  onSave,
  selectedMatch,
  targetLink
}) {
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [statsForm, setStatsForm] = useState({
    match_id: '', date: '', time: 'Finished', tournament: '', home_team: '', away_team: '', score: '',
    first_half_corners_home: '', first_half_corners_away: '', possession_home: '50', possession_away: '50',
    corners_ft_home: '', corners_ft_away: '', fouls_home: '', fouls_away: '',
    yellow_home: '', yellow_away: '', red_home: '', red_away: '',
    shots_on_target_home: '', shots_on_target_away: '', shots_home: '', shots_away: '',
    offsides_home: '', offsides_away: ''
  });

  useEffect(() => {
    if (!show || !selectedMatch) return;

    // Check if there is already a cached match in recent history to prefill
    const cachedMatch = selectedMatch.recent_h2h_matches?.find(m => m.match_url === targetLink) ||
                        selectedMatch.recent_home_matches?.find(m => m.match_url === targetLink) ||
                        selectedMatch.recent_away_matches?.find(m => m.match_url === targetLink);

    let defaultStats = {
      possession: { home: '50', away: '50' },
      corners: { home: '', away: '' },
      fouls: { home: '', away: '' },
      yellow_cards: { home: '', away: '' },
      red_cards: { home: '', away: '' },
      shots_on_target: { home: '', away: '' },
      shots: { home: '', away: '' },
      offsides: { home: '', away: '' }
    };

    if (cachedMatch && cachedMatch.statistics_json) {
      try {
        const stats = typeof cachedMatch.statistics_json === 'string' 
          ? JSON.parse(cachedMatch.statistics_json) 
          : cachedMatch.statistics_json;
        if (stats) {
          Object.keys(defaultStats).forEach(key => {
            if (stats[key]) {
              defaultStats[key] = {
                home: String(stats[key].home || '').replace('%', ''),
                away: String(stats[key].away || '').replace('%', '')
              };
            }
          });
        }
      } catch (e) {}
    }

    setPasteText('');
    setParseError('');
    setValidationError('');
    setStatsForm({
      match_id: targetLink,
      date: cachedMatch?.date || '',
      time: cachedMatch?.time || 'Finished',
      tournament: selectedMatch.tournament || 'Football',
      home_team: cachedMatch?.home_team || selectedMatch.home_team,
      away_team: cachedMatch?.away_team || selectedMatch.away_team,
      score: cachedMatch?.score || '',
      first_half_corners_home: cachedMatch?.first_half_corners_home !== undefined && cachedMatch?.first_half_corners_home !== null ? String(cachedMatch.first_half_corners_home) : '',
      first_half_corners_away: cachedMatch?.first_half_corners_away !== undefined && cachedMatch?.first_half_corners_away !== null ? String(cachedMatch.first_half_corners_away) : '',
      possession_home: defaultStats.possession.home,
      possession_away: defaultStats.possession.away,
      corners_ft_home: defaultStats.corners.home,
      corners_ft_away: defaultStats.corners.away,
      fouls_home: defaultStats.fouls.home,
      fouls_away: defaultStats.fouls.away,
      yellow_home: defaultStats.yellow_cards.home,
      yellow_away: defaultStats.yellow_cards.away,
      red_home: defaultStats.red_cards.home,
      red_away: defaultStats.red_cards.away,
      shots_on_target_home: defaultStats.shots_on_target.home,
      shots_on_target_away: defaultStats.shots_on_target.away,
      shots_home: defaultStats.shots.home,
      shots_away: defaultStats.shots.away,
      offsides_home: defaultStats.offsides.home,
      offsides_away: defaultStats.offsides.away
    });
  }, [show, selectedMatch, targetLink]);

  const handleParseText = () => {
    try {
      setParseError('');
      const parsed = parseMatchEnDirectText(pasteText);
      setStatsForm(prev => ({
        ...prev,
        date: parsed.date || prev.date,
        score: parsed.score || prev.score,
        first_half_corners_home: parsed.corners1MT.home !== null ? String(parsed.corners1MT.home) : prev.first_half_corners_home,
        first_half_corners_away: parsed.corners1MT.away !== null ? String(parsed.corners1MT.away) : prev.first_half_corners_away,
        possession_home: parsed.possession.home !== null ? String(parsed.possession.home) : '50',
        possession_away: parsed.possession.away !== null ? String(parsed.possession.away) : '50',
        corners_ft_home: parsed.corners.home !== null ? String(parsed.corners.home) : prev.corners_ft_home,
        corners_ft_away: parsed.corners.away !== null ? String(parsed.corners.away) : prev.corners_ft_away,
        fouls_home: parsed.fouls.home !== null ? String(parsed.fouls.home) : prev.fouls_home,
        fouls_away: parsed.fouls.away !== null ? String(parsed.fouls.away) : prev.fouls_away,
        yellow_home: parsed.yellow_cards.home !== null ? String(parsed.yellow_cards.home) : prev.yellow_home,
        yellow_away: parsed.yellow_cards.away !== null ? String(parsed.yellow_cards.away) : prev.yellow_away,
        red_home: parsed.red_cards.home !== null ? String(parsed.red_cards.home) : prev.red_home,
        red_away: parsed.red_cards.away !== null ? String(parsed.red_cards.away) : prev.red_away,
        shots_on_target_home: parsed.shots_on_target.home !== null ? String(parsed.shots_on_target.home) : prev.shots_on_target_home,
        shots_on_target_away: parsed.shots_on_target.away !== null ? String(parsed.shots_on_target.away) : prev.shots_on_target_away,
        shots_home: parsed.shots.home !== null ? String(parsed.shots.home) : prev.shots_home,
        shots_away: parsed.shots.away !== null ? String(parsed.shots.away) : prev.shots_away,
        offsides_home: parsed.offsides.home !== null ? String(parsed.offsides.home) : prev.offsides_home,
        offsides_away: parsed.offsides.away !== null ? String(parsed.offsides.away) : prev.offsides_away
      }));
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleSaveStats = async () => {
    setValidationError('');
    
    if (!statsForm.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setValidationError("La date doit être au format AAAA-MM-JJ.");
      return;
    }
    if (!statsForm.score.match(/^\d+-\d+$/)) {
      setValidationError("Le score final doit être au format ButsDom-ButsExt (ex: 2-1).");
      return;
    }

    const statistics = {
      possession: { home: `${statsForm.possession_home}%`, away: `${statsForm.possession_away}%` },
      corners: { home: statsForm.corners_ft_home || '0', away: statsForm.corners_ft_away || '0' },
      fouls: { home: statsForm.fouls_home || '0', away: statsForm.fouls_away || '0' },
      yellow_cards: { home: statsForm.yellow_home || '0', away: statsForm.yellow_away || '0' },
      red_cards: { home: statsForm.red_home || '0', away: statsForm.red_away || '0' },
      shots_on_target: { home: statsForm.shots_on_target_home || '0', away: statsForm.shots_on_target_away || '0' },
      shots: { home: statsForm.shots_home || '0', away: statsForm.shots_away || '0' },
      offsides: { home: statsForm.offsides_home || '0', away: statsForm.offsides_away || '0' }
    };

    const payload = {
      match_id: statsForm.match_id,
      date: statsForm.date,
      time: statsForm.time,
      tournament: statsForm.tournament,
      home_team: statsForm.home_team,
      away_team: statsForm.away_team,
      score: statsForm.score,
      first_half_corners_home: statsForm.first_half_corners_home !== '' ? parseInt(statsForm.first_half_corners_home, 10) : null,
      first_half_corners_away: statsForm.first_half_corners_away !== '' ? parseInt(statsForm.first_half_corners_away, 10) : null,
      statistics
    };

    onSave(payload);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, overflowY: 'auto'
    }}>
      <div className="glass-card" style={{ width: '680px', padding: '24px', position: 'relative', margin: '40px 0', maxHeight: '90vh', overflowY: 'auto' }}>
        <button 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '6px' }}>
          Saisir les Statistiques du Match H2H
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Collez le bloc textuel de Match en Direct ou saisissez les informations manuellement.
        </p>

        <ManualStatsParserInput
          pasteText={pasteText}
          setPasteText={setPasteText}
          handleParseText={handleParseText}
          parseError={parseError}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ManualStatsMatchDetailsFields
            statsForm={statsForm}
            setStatsForm={setStatsForm}
          />

          <ManualStatsCornersFields
            statsForm={statsForm}
            setStatsForm={setStatsForm}
          />

          <ManualStatsDetailFields
            statsForm={statsForm}
            setStatsForm={setStatsForm}
          />

          {validationError && (
            <div style={{ color: 'var(--color-danger)', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(231, 76, 60, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(231, 76, 60, 0.15)' }}>
              <AlertTriangle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none' }} onClick={handleSaveStats}>
              Enregistrer Confrontation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
