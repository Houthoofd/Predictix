import React from 'react';
import {
  Trophy,
  RefreshCw,
  Percent,
  Layers,
  Radio,
  Flame,
  Search,
  Calendar,
  Eye,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export function ConfrontationsMarketsView({
  confrontationsQuery,
  disciplinesQuery,
  disciplinesSubTab,
  setDisciplinesSubTab,
  selectedSportFilterId,
  setSelectedSportFilterId,
  disciplineSearch,
  setDisciplineSearch,
  handleOpenConfrontationMarkets,
  handleSelectMarketBet,
  disciplineFilterCategory,
  setDisciplineFilterCategory,
  filteredDisciplines,
  handleOpenPlaceBet,
}) {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-zinc-800" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Confrontations & Marchés de Paris
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {confrontationsQuery.data?.total || 1994}+ matchs réels
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal">
            Cliquez sur une confrontation pour consulter tous les marchés disponibles (1X2, Totaux, Double chance, BTTS...) et placez vos paris directement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              confrontationsQuery.refetch();
              disciplinesQuery.refetch();
            }}
            className="h-8 text-xs gap-1.5 border-zinc-200 text-zinc-700 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${confrontationsQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Confrontations Actives</span>
            <Trophy className="w-4 h-4 text-[#1D7CEA]" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900">
            {(confrontationsQuery.data?.total || 1994).toLocaleString('fr-FR')}
          </div>
          <div className="text-[11px] text-zinc-400">Matchs et affiches en direct & pre-match</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Cotes Capturées</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900">8 346</div>
          <div className="text-[11px] text-emerald-600 font-medium">1X2, Over/Under, BTTS, Handicap...</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Disciplines Ouvertes</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">35 Sports</div>
          <div className="text-[11px] text-zinc-400">Football, Tennis, Basket, US, eSoccer...</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Fournisseur Officiel</span>
            <Radio className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">Bwin Belgique</div>
          <div className="text-[11px] text-zinc-400">Flux temps réel predictix-api</div>
        </div>
      </div>

      {/* Sub-Tabs: Confrontations vs Catalogue 35 Disciplines */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          type="button"
          onClick={() => setDisciplinesSubTab('confrontations')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            disciplinesSubTab === 'confrontations'
              ? 'bg-zinc-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Confrontations & Marchés ({confrontationsQuery.data?.count || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setDisciplinesSubTab('disciplines')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            disciplinesSubTab === 'disciplines'
              ? 'bg-zinc-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Catalogue des 35 Disciplines</span>
        </button>
      </div>

      {disciplinesSubTab === 'confrontations' ? (
        /* SECTION 1 : VUE CONFRONTATIONS & MARCHÉS DÉTAILLÉS */
        <div className="space-y-4">
          {/* Quick Sports Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Tous les sports' },
              { id: '4', label: 'Football (99)' },
              { id: '5', label: 'Tennis (86)' },
              { id: '7', label: 'Basket-ball (84)' },
              { id: '12', label: 'Hockey sur glace (77)' },
              { id: '16', label: 'Handball (64)' },
              { id: '11', label: 'Football US (62)' },
              { id: '18', label: 'Volley-ball (62)' },
              { id: '108', label: 'eSoccer (52)' },
              { id: '56', label: 'Tennis de table' },
              { id: '6', label: 'Formule 1' },
            ].map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSelectedSportFilterId(sp.id)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                  selectedSportFilterId === sp.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Filtrer par équipe, joueur, match ou compétition (ex: Real Madrid, Monaco, Sinner, Ligue 1, NFL...)"
              value={disciplineSearch}
              onChange={(e) => setDisciplineSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Confrontations Table */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">
                Confrontations en direct & programmées ({confrontationsQuery.data?.count || 0})
              </span>
              <span className="text-zinc-500 font-mono text-[11px]">
                Cliquez sur une ligne pour ouvrir tous ses marchés
              </span>
            </div>

            {confrontationsQuery.isLoading ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <RefreshCw className="w-5 h-5 text-[#1D7CEA] animate-spin mx-auto" />
                <p>Chargement des confrontations depuis predictix-api...</p>
              </div>
            ) : (confrontationsQuery.data?.confrontations || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Aucune confrontation trouvée pour ces critères de recherche.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-500 text-[11px] font-medium">
                    <tr>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Confrontation / Rencontre</th>
                      <th className="py-3 px-4">Compétition</th>
                      <th className="py-3 px-4 text-center">Marchés & Cotes</th>
                      <th className="py-3 px-4 text-center">Aperçu Cotes 1X2</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {confrontationsQuery.data.confrontations.map((conf) => (
                      <tr
                        key={conf.id}
                        onClick={() => handleOpenConfrontationMarkets(conf)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {conf.phase === 'live' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              En direct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              Prematch
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {conf.sportName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>{conf.homeTeam}</span>
                            <span className="text-zinc-400 font-normal text-[11px]">vs</span>
                            <span>{conf.awayTeam}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-600 max-w-[180px] truncate">
                          {conf.competition}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            <Layers className="w-3 h-3 text-emerald-600" />
                            {conf.quoteCount > 0 ? `${conf.quoteCount} cotes` : 'Marchés ouverts'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 font-mono">
                            {(conf.defaultOdds || [1.85, 3.20]).map((odd, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const sel = idx === 0 ? conf.homeTeam : idx === 1 ? 'Nul' : conf.awayTeam;
                                  handleSelectMarketBet(conf, 'Résultat du match', { selection: sel, odds: odd });
                                }}
                                className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-blue-600 hover:text-white border border-zinc-200 font-semibold text-[11px] transition-colors"
                                title={`Miser sur ${idx === 0 ? conf.homeTeam : idx === 1 ? 'Nul' : conf.awayTeam} à ${odd.toFixed(2)}`}
                              >
                                {odd.toFixed(2)}
                              </button>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfrontationMarkets(conf);
                            }}
                            className="h-7 text-xs bg-[#1D7CEA] hover:bg-blue-600 text-white font-medium gap-1 shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Voir les marchés</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SECTION 2 : CATALOGUE COMPLET DES 35 DISCIPLINES */
        <div className="space-y-4">
          {/* Category filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Toutes (35)' },
              { id: 'Sports Collectifs', label: 'Sports Collectifs (13)' },
              { id: 'Sports Individuels & Précision', label: 'Individuels & Précision (8)' },
              { id: 'Sports Mécaniques', label: 'Sports Mécaniques (3)' },
              { id: 'Sports de Combat', label: 'Sports de Combat (2)' },
              { id: 'Esport & Gaming', label: 'Esport & Gaming (4)' },
              { id: 'Courses Hippiques', label: 'Courses Hippiques (1)' },
              { id: "Sports d'Hiver", label: "Sports d'Hiver (4)" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setDisciplineFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                  disciplineFilterCategory === cat.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Table of 35 Disciplines */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-500 text-[11px] font-medium">
                  <tr>
                    <th className="py-3 px-4">Discipline</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Compétition Référente</th>
                    <th className="py-3 px-4">Affiche Récente / Événement</th>
                    <th className="py-3 px-4 text-center">Cotes Disponibles</th>
                    <th className="py-3 px-4 text-center">Cotes Indicatives</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {filteredDisciplines.map((disc) => (
                    <tr key={disc.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-[11px] text-zinc-700 font-mono">
                            {disc.id}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 block">{disc.name}</span>
                            {disc.isEsport && (
                              <span className="text-[10px] text-purple-600 font-medium">Esport Officiel</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {disc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 max-w-[200px] truncate font-medium">
                        {disc.competition}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-900 max-w-[240px] truncate">
                        {disc.sampleMatch}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {disc.quotesCount.toLocaleString('fr-FR')} cotes
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono">
                          {(disc.defaultOdds || [1.85, 3.20]).map((odd, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenPlaceBet(disc, odd)}
                              className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-zinc-200 text-zinc-800 font-semibold text-[11px] transition-colors"
                              title={`Parier à cote ${odd.toFixed(2)}`}
                            >
                              {odd.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSportFilterId(String(disc.id));
                            setDisciplinesSubTab('confrontations');
                          }}
                          className="h-7 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium gap-1 shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Voir les matchs</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
