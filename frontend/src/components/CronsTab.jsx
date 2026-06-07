import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Play, Trash2, RefreshCw, AlertCircle, Search, Calendar, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { sportIcons } from './SidebarIcons';
import { sportLabels } from '../utils/labels';

export default function CronsTab({ showNotification }) {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(Date.now());
  
  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Logs console states
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState([]);
  const logEndRef = React.useRef(null);

  const fetchCrons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/scraper/crons');
      const json = await res.json();
      if (json.success) {
        setCrons(json.data || []);
      } else {
        setError(json.error?.message || 'Erreur lors de la récupération des planifications.');
      }
    } catch (err) {
      setError('Erreur de connexion avec le serveur.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/scraper/crons/logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des logs de cron:', err);
    }
  };

  useEffect(() => {
    fetchCrons();
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [showLogs]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Reset to first page when search or sport filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSport]);

  const handleRunCron = async (matchId) => {
    if (actionLoading) return;
    setActionLoading({ matchId, action: 'run' });
    try {
      const res = await fetch(`http://localhost:5000/api/scraper/crons/${encodeURIComponent(matchId)}/run`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        if (showNotification) {
          showNotification(
            'Scraping terminé !',
            'Le match a été mis à jour et les paris associés ont été soldés avec succès.',
            'success'
          );
        } else {
          alert('Scraping terminé ! Match et paris mis à jour.');
        }
        fetchCrons();
      } else {
        alert('Erreur : ' + (json.error?.message || 'Inconnue'));
      }
    } catch (err) {
      alert('Erreur réseau lors de la commande.');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelCron = async (matchId) => {
    if (!window.confirm('Voulez-vous vraiment annuler le re-scraping pour ce match ?')) {
      return;
    }
    if (actionLoading) return;
    setActionLoading({ matchId, action: 'cancel' });
    try {
      const res = await fetch(`http://localhost:5000/api/scraper/crons/${encodeURIComponent(matchId)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchCrons();
      } else {
        alert('Erreur : ' + (json.error?.message || 'Inconnue'));
      }
    } catch (err) {
      alert('Erreur réseau lors de la suppression.');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCountdown = (expectedEndTimeStr) => {
    if (!expectedEndTimeStr) return 'N/A';
    const diff = new Date(expectedEndTimeStr).getTime() - time;
    if (diff <= 0) {
      const absDiff = Math.abs(diff);
      if (absDiff < 25 * 60 * 1000) {
        return 'Re-scraping...';
      }
      const minsPassed = Math.round(absDiff / 1000 / 60);
      return `Vérifié (+${minsPassed}m)`;
    }
    
    const totalSecs = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    return [
      String(hrs).padStart(2, '0'),
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].join(':');
  };

  // Get list of sports that currently have active crons
  const activeSportsList = useMemo(() => {
    const sports = new Set(crons.map(c => c.sport).filter(Boolean));
    return ['all', ...Array.from(sports)];
  }, [crons]);

  // Filter and search logic
  const filteredCrons = useMemo(() => {
    return crons.filter(c => {
      const matchesSport = selectedSport === 'all' || c.sport === selectedSport;
      const matchesSearch = searchTerm.trim() === '' ||
        c.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.away_team.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSport && matchesSearch;
    });
  }, [crons, selectedSport, searchTerm]);

  // Paginated crons
  const totalPages = Math.ceil(filteredCrons.length / itemsPerPage);
  
  const paginatedCrons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCrons.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCrons, currentPage, itemsPerPage]);

  // Count active stats
  const statsSummary = useMemo(() => {
    let retryingCount = 0;
    let pendingCount = 0;
    crons.forEach(c => {
      if (c.retries > 0) retryingCount++;
      else pendingCount++;
    });
    return { total: crons.length, pending: pendingCount, retrying: retryingCount };
  }, [crons]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Dynamic Header & KPI Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        
        {/* KPI: Total Crons */}
        <div className="glass-card" style={{ flex: '1 1 200px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(10, 132, 255, 0.1)', color: '#0a84ff' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit' }}>{statsSummary.total}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tâches Planifiées</div>
          </div>
        </div>

        {/* KPI: Pending */}
        <div className="glass-card" style={{ flex: '1 1 200px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit' }}>{statsSummary.pending}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>En Attente</div>
          </div>
        </div>

        {/* KPI: Retrying */}
        <div className="glass-card" style={{ flex: '1 1 200px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255, 159, 10, 0.1)', color: '#ff9f0a' }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit' }}>{statsSummary.retrying}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Relances actives</div>
          </div>
        </div>

        {/* Refresh button card */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchCrons}
            style={{ height: '48px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        
        {/* Horizontal Sport Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {activeSportsList.map(sport => {
            const label = sport === 'all' ? 'Tous' : (sportLabels[sport] || sport);
            const isActive = selectedSport === sport;
            const SportIcon = sport === 'all' ? Clock : (sportIcons[sport] || Clock);
            const count = sport === 'all' ? crons.length : crons.filter(c => c.sport === sport).length;
            
            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isActive ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#0a84ff' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(10, 132, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <SportIcon size={12} />
                <span>{label}</span>
                <span style={{ 
                  fontSize: '10px', 
                  opacity: 0.8, 
                  background: isActive ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '1px 5px',
                  borderRadius: '6px',
                  marginLeft: '2px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Rechercher une équipe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#fff',
              fontSize: '12.5px',
              fontFamily: 'Outfit',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(10, 132, 255, 0.4)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid #ff3b30', background: 'rgba(255, 59, 48, 0.05)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
          <AlertCircle size={20} style={{ color: '#ff3b30', flexShrink: 0 }} />
          <span style={{ color: '#ff3b30', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Main compact list table */}
      <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
        {loading && paginatedCrons.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
            <RefreshCw size={24} className="animate-spin text-secondary" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Chargement des planifications...</p>
          </div>
        ) : paginatedCrons.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
            <Clock size={32} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: 600 }}>Aucune planification correspondante.</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', maxWidth: '350px' }}>
              Modifiez vos filtres ou lancez un scraping de découverte pour planifier des tâches de re-scraping.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>MATCH</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>HORAIRE</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>COMPTE A REBOURS</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>STATUT</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCrons.map((cron) => {
                  const SportIcon = sportIcons[cron.sport] || Clock;
                  const sportLabel = sportLabels[cron.sport] || cron.sport;
                  const isPast = new Date(cron.expected_end_time).getTime() <= time;
                  
                  // Extract hours and minutes for start time
                  const startHourStr = cron.start_time ? cron.start_time.substring(11, 16) : 'N/A';
                  const endHourStr = cron.expected_end_time ? new Date(cron.expected_end_time).toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                  
                  return (
                    <tr 
                      key={cron.match_id} 
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.2s ease'
                      }}
                      className="hover-row"
                    >
                      {/* Column 1: Match with Sport Label */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '8px', 
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <SportIcon size={14} style={{ color: 'var(--color-accent-solid)' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Outfit' }}>
                              {cron.home_team} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs</span> {cron.away_team}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>
                              {sportLabel}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Combined Times */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          {startHourStr} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>→</span> {endHourStr}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {cron.start_time ? cron.start_time.substring(8, 10) + '/' + cron.start_time.substring(5, 7) : ''}
                        </div>
                      </td>

                      {/* Column 3: Countdown timer */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ 
                          fontSize: '12.5px', 
                          fontWeight: 700, 
                          fontFamily: 'Courier, monospace',
                          color: isPast ? '#34c759' : '#0a84ff' 
                        }}>
                          {formatCountdown(cron.expected_end_time)}
                        </span>
                      </td>

                      {/* Column 4: Status and Retries */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 800,
                            background: cron.retries > 0 ? 'rgba(255, 159, 10, 0.12)' : (isPast ? 'rgba(52, 199, 89, 0.12)' : 'rgba(10, 132, 255, 0.12)'),
                            color: cron.retries > 0 ? '#ff9f0a' : (isPast ? '#34c759' : '#0a84ff'),
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                          }}>
                            {cron.retries > 0 ? 'Relance' : (isPast ? 'En Cours' : 'Planifié')}
                          </span>
                          {cron.retries > 0 && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              Tentative {cron.retries}/5
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleRunCron(cron.match_id)}
                            title="Lancer maintenant"
                            style={{ 
                              width: '28px',
                              height: '28px',
                              padding: '0', 
                              borderRadius: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: 'rgba(52, 199, 89, 0.08)',
                              borderColor: 'rgba(52, 199, 89, 0.15)',
                              color: '#34c759'
                            }}
                            disabled={actionLoading && actionLoading.matchId === cron.match_id}
                          >
                            <Play size={12} fill="currentColor" className={(actionLoading && actionLoading.matchId === cron.match_id && actionLoading.action === 'run') ? 'animate-spin' : ''} />
                          </button>
                          
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleCancelCron(cron.match_id)}
                            title="Annuler planification"
                            style={{ 
                              width: '28px',
                              height: '28px',
                              padding: '0', 
                              borderRadius: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: 'rgba(255, 59, 48, 0.08)',
                              borderColor: 'rgba(255, 59, 48, 0.15)',
                              color: '#ff3b30'
                            }}
                            disabled={actionLoading && actionLoading.matchId === cron.match_id}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '8px'
        }}>
          {/* Rows per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Afficher</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'Outfit',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={5} style={{ background: '#0f172a' }}>5</option>
              <option value={10} style={{ background: '#0f172a' }}>10</option>
              <option value={25} style={{ background: '#0f172a' }}>25</option>
              <option value={50} style={{ background: '#0f172a' }}>50</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>par page</span>
          </div>

          {/* Navigation and Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              Précédent
            </button>
            
            <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Outfit', color: 'var(--text-secondary)' }}>
              Page {currentPage} sur {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
      {/* Logs Console Panel */}
      <div className="glass-card" style={{ padding: '0px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '10px' }}>
        {/* Header */}
        <div 
          onClick={() => setShowLogs(!showLogs)}
          style={{ 
            padding: '12px 20px', 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderBottom: showLogs ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={15} style={{ color: '#0a84ff' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'Outfit' }}>
              Console de Logs du Planificateur d'Arrière-plan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showLogs && (
              <span style={{ fontSize: '10px', color: '#0a84ff', background: 'rgba(10, 132, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Temps Réel Actif
              </span>
            )}
            {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {/* Content */}
        {showLogs && (
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.35)', 
            padding: '14px 20px', 
            height: '160px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px', fontFamily: 'Courier, monospace', fontStyle: 'italic', padding: '10px 0' }}>
                Aucun log enregistré pour le moment. Le scheduler va inscrire des événements dès qu'un re-scraping se déclenchera.
              </div>
            ) : (
              logs.map((line, idx) => {
                let color = '#34d399'; // Default info/green
                if (line.includes('[WARN]')) color = '#fbbf24'; // Warn/amber
                if (line.includes('[ERROR]')) color = '#f87171'; // Error/red
                return (
                  <div key={idx} style={{ 
                    fontFamily: 'Courier, monospace', 
                    fontSize: '11.5px', 
                    lineHeight: '1.5', 
                    color, 
                    whiteSpace: 'pre-wrap',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.01)',
                    padding: '1px 0'
                  }}>
                    {line}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

    </div>
  );
}
