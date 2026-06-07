import React from 'react';

export default function PageHeaderTitle({ activeTab }) {
  return (
    <div className="header-title-section">
      <h2 className="page-title">
        {activeTab === 'dashboard' && 'Tableau de Bord'}
        {activeTab === 'magic-predictions' && 'Sports'}
        {activeTab === 'basket' && 'Panier de Paris'}
        {activeTab === 'scraper' && 'Collecteur de Données'}
        {activeTab === 'tracker' && 'Tracker de Paris'}
        {activeTab === 'strategies' && 'Stratégies Personnalisées'}
        {activeTab === 'integrity' && 'Qualité des Données'}
      </h2>
      <p className="header-subtitle">
        {activeTab === 'dashboard' && 'Statistiques de bankroll en temps réel et performances.'}
        {activeTab === 'magic-predictions' && 'Signaux de value-bets basés sur vos stratégies personnalisées sur-mesure.'}
        {activeTab === 'basket' && 'Gérez, ajustez et enregistrez vos sélections de paris en masse.'}
        {activeTab === 'scraper' && 'Gérez et exécutez le scraper de match-en-direct.fr en temps réel.'}
        {activeTab === 'tracker' && 'Journalisez vos paris sportifs pour optimiser votre capital.'}
        {activeTab === 'strategies' && 'Analyse et configuration de vos cibles de paris à forte espérance mathématique.'}
        {activeTab === 'integrity' && 'Analysez les données manquantes, forcer le crawl et gérez les logos personnalisés.'}
      </p>
    </div>
  );
}
