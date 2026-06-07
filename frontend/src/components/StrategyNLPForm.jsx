import React from 'react';
import { Sparkles, Send, Info, CheckCircle } from 'lucide-react';

export default function StrategyNLPForm({
  prompt,
  setPrompt,
  creating,
  handleCreateStrategy,
  error,
  successMsg,
  creationStep,
  creationSteps
}) {
  return (
    <div className="glass-card" style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, rgba(127, 0, 255, 0.01) 100%)',
      border: creating ? '1px solid #bf5af2' : '1px solid var(--border-color)',
      boxShadow: creating ? '0 0 20px rgba(191, 90, 242, 0.08)' : 'none',
      transition: 'all 0.3s ease'
    }}>
      <h4 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} style={{ color: '#bf5af2' }} />
        Nouvelle stratégie en langage naturel
      </h4>
      
      <form onSubmit={handleCreateStrategy} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Exemple : "Je veux une stratégie sur les fautes avec au moins 24.5 fautes sur les 5 confrontations H2H"'
            disabled={creating}
            style={{
              width: '100%',
              height: '110px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'Inter',
              fontSize: '13.5px',
              lineHeight: '1.5',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(127, 0, 255, 0.4)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--color-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ color: 'var(--color-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {creating && (
          <div style={{ 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px dashed var(--border-color)', 
            borderRadius: '8px', 
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#bf5af2', textTransform: 'uppercase' }}>
              <span>Conception Magique en cours</span>
              <Sparkles size={12} className="spin-animation" style={{ color: '#bf5af2' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {creationSteps.map((step, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  opacity: creationStep > idx ? 0.4 : (creationStep === idx ? 1 : 0.2),
                  fontWeight: creationStep === idx ? 600 : 400,
                  color: creationStep === idx ? 'var(--text-primary)' : undefined,
                  transition: 'all 0.3s ease'
                }}>
                  <span>{creationStep > idx ? '✓' : (creationStep === idx ? '●' : '○')}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating || !prompt.trim()}
          style={{
            width: '100%',
            height: '40px',
            background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <span>Générer ma Stratégie</span>
          <Send size={16} />
        </button>
      </form>

      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          Exemples d'invites à copier :
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div 
            onClick={() => !creating && setPrompt("Je veux parier sur les fautes avec plus de 24 fautes sur les 5 confrontations H2H")}
            style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
          >
            "Plus de 24 fautes sur 5 confrontations H2H"
          </div>
          <div 
            onClick={() => !creating && setPrompt("j'aimerais parier sur les cartons jaunes avec au moins 3.5 cartons jaunes sur les 5 derniers match")}
            style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
          >
            "Au moins 3.5 cartons jaunes sur 5 matchs"
          </div>
        </div>
      </div>
    </div>
  );
}
