import React from 'react';

export default function ManualStatsParserInput({
  pasteText,
  setPasteText,
  handleParseText,
  parseError
}) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
      <label style={{ fontSize: '10.5px', color: '#bf5af2', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Copier-coller de Match en Direct
      </label>
      <textarea 
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="Collez ici les statistiques de match-en-direct.fr..."
        style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', padding: '10px', marginTop: '6px', outline: 'none', resize: 'none' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Lit possession, corners 1MT & FT, fautes, tirs, cartons, etc.
        </span>
        <button 
          type="button"
          className="btn btn-secondary" 
          style={{ fontSize: '11px', height: '28px', padding: '0 12px' }} 
          onClick={handleParseText}
        >
          Parser le texte
        </button>
      </div>
      {parseError && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>{parseError}</div>}
    </div>
  );
}
