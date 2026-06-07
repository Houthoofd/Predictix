import React from 'react';
import { MoreVertical, ShoppingCart, Zap } from 'lucide-react';

export default function MatchCardKebabMenu({
  mappedPred,
  handleAddToBasket,
  handleInstantPlaceBet
}) {
  const [showKebab, setShowKebab] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!showKebab) return;
    const handleClose = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowKebab(false);
      }
    };
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [showKebab]);

  return (
    <div style={{ position: 'relative' }} ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button 
        className="btn btn-secondary"
        style={{ padding: '0 8px', height: '36px', display: 'flex', alignItems: 'center', justifyItems: 'center', borderColor: showKebab ? '#bf5af2' : undefined, background: showKebab ? 'rgba(191, 90, 242, 0.15)' : undefined }}
        title="Plus d'actions"
        onClick={() => setShowKebab(prev => !prev)}
      >
        <MoreVertical size={16} />
      </button>

      {showKebab && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px',
          background: 'rgba(20, 20, 22, 0.97)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(191, 90, 242, 0.35)', borderRadius: '10px',
          padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px',
          width: '180px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          zIndex: 1000,
        }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              background: 'transparent', border: 'none', color: 'var(--text-primary)',
              textAlign: 'left', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600,
              cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#bf5af2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onClick={() => { handleAddToBasket(mappedPred); setShowKebab(false); }}
          >
            <ShoppingCart size={14} />
            Ajouter au Panier
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              background: 'transparent', border: 'none', color: 'var(--text-primary)',
              textAlign: 'left', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600,
              cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#bf5af2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onClick={() => { handleInstantPlaceBet(mappedPred); setShowKebab(false); }}
          >
            <Zap size={14} style={{ color: '#ffb300' }} />
            Placement Direct
          </button>
        </div>
      )}
    </div>
  );
}
