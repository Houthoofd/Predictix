import React from 'react';

export default function PageHeaderTitle({ activeTab }) {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tableau de Bord';
      case 'magic-predictions': return 'Sports';
      case 'basket': return 'Panier de Paris';
      case 'scraper': return 'Collecteur de Données';
      case 'tracker': return 'Tracker de Paris';
      case 'strategies': return 'Stratégies Personnalisées';
      case 'integrity': return 'Qualité des Données';
      case 'crons': return 'Tâches Planifiées';
      case 'models': return 'Centre d\'Entraînement & Diagnostics GBDT';
      default: return '';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Statistiques de bankroll en temps réel et performances.';
      case 'magic-predictions': return 'Consultez les signaux de value-bets et l’analyse statistique par sport.';
      case 'basket': return 'Gérez, ajustez et enregistrez vos sélections de paris en masse.';
      case 'scraper': return 'Gérez et exécutez le collecteur de données de match-en-direct.fr en temps réel.';
      case 'tracker': return 'Journalisez vos paris sportifs pour optimiser votre capital.';
      case 'strategies': return 'Analyse et configuration de vos cibles de paris à forte espérance mathématique.';
      case 'integrity': return 'Analysez les données manquantes, forcer le crawl et gérez les logos personnalisés.';
      case 'crons': return 'Gérez et suivez le statut des crons de re-scraping pour la résolution de vos paris.';
      case 'models': return 'Pilotez l\'apprentissage de vos modèles en Go pur, analysez leur précision et activez-les globalement.';
      default: return '';
    }
  };

  return (
    <div className="header-title-section">
      <h2 className="page-title">{getTitle()}</h2>
      <p className="header-subtitle">{getSubtitle()}</p>
    </div>
  );
}
