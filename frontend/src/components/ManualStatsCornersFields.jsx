import React from 'react';

export default function ManualStatsCornersFields({ statsForm, setStatsForm }) {
  return (
    <div style={{ padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        CORNERS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Corners 1ère Mi-Temps (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.first_half_corners_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, first_half_corners_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.first_half_corners_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, first_half_corners_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Corners Match Complet (Dom / Ext)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="number" 
              min="0" 
              placeholder="Dom" 
              value={statsForm.corners_ft_home} 
              onChange={(e) => setStatsForm(p => ({ ...p, corners_ft_home: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} 
            />
            <input 
              type="number" 
              min="0" 
              placeholder="Ext" 
              value={statsForm.corners_ft_away} 
              onChange={(e) => setStatsForm(p => ({ ...p, corners_ft_away: e.target.value }))} 
              style={{ width: '50%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: '12.5px' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
