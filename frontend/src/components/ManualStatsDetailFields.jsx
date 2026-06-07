import React from 'react';

export default function ManualStatsDetailFields({ statsForm, setStatsForm }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Possession % (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              max="100" 
              placeholder="Dom" 
              value={statsForm.possession_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, possession_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              max="100" 
              placeholder="Ext" 
              value={statsForm.possession_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, possession_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fautes Commises (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.fouls_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, fouls_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.fouls_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, fouls_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cartons Jaunes (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.yellow_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, yellow_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.yellow_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, yellow_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cartons Rouges (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.red_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, red_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.red_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, red_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tirs Cadrés (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.shots_on_target_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, shots_on_target_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.shots_on_target_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, shots_on_target_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tirs Totaux (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.shots_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, shots_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.shots_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, shots_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hors-Jeu Signalés (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.offsides_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, offsides_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.offsides_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, offsides_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
