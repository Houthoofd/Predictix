import React from 'react';

export default function ManualStatsMatchDetailsFields({ statsForm, setStatsForm }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>ÉQUIPE DOMICILE</label>
          <input 
            type="text" 
            value={statsForm.home_team} 
            onChange={(e) => setStatsForm(p => ({ ...p, home_team: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>ÉQUIPE EXTÉRIEUR</label>
          <input 
            type="text" 
            value={statsForm.away_team} 
            onChange={(e) => setStatsForm(p => ({ ...p, away_team: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOURNOI / LIGUE</label>
          <input 
            type="text" 
            value={statsForm.tournament} 
            onChange={(e) => setStatsForm(p => ({ ...p, tournament: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>DATE (AAAA-MM-JJ)</label>
          <input 
            type="text" 
            placeholder="2026-05-25" 
            value={statsForm.date} 
            onChange={(e) => setStatsForm(p => ({ ...p, date: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>SCORE FINAL (DOM-EXT)</label>
          <input 
            type="text" 
            placeholder="2-1" 
            value={statsForm.score} 
            onChange={(e) => setStatsForm(p => ({ ...p, score: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
        <div>
          <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>PÉRIODE (HEURE/FIN)</label>
          <input 
            type="text" 
            value={statsForm.time} 
            onChange={(e) => setStatsForm(p => ({ ...p, time: e.target.value }))} 
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', marginTop: '4px', fontSize: '12.5px' }} 
          />
        </div>
      </div>
    </>
  );
}
