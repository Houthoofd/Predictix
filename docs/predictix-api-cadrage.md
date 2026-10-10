# Cadrage de predictix-api

Proposition initiale du 7 octobre 2026, fondée sur les contrats locaux des trois projets. Ce document décrit un projet à créer ; aucune API ni base nouvelle n'est encore exécutée.

## Responsabilités

`scrapper-v3` collecte les observations. `predictix-api` importe, conserve, valide et expose ces observations. `Predictix` présente les données et gère les paris. `predictix-edge` prépare les historiques et calcule les modèles et prédictions.

Le backend métier Predictix reste responsable des bankrolls, paris, stratégies et notifications. La base de predictix-api appartient au service ; les consommateurs utilisent ses routes ou ses exports.

## Contrats existants à préserver

- Le crawler produit un document `schema_version: "1.0.0"`, `metadata` et des tableaux `all_matches` / `matches`. L'import doit traiter leur éventuel recouvrement sans dupliquer les observations.
- La provenance vient de `metadata.source_url`, l'instant de collecte de `metadata.scraped_at`. La date du match ne doit jamais être inventée à partir de cet instant.
- Une identité est composée de la source, du sport et du `match_id`. Les identités de sources différentes restent distinctes tant qu'un rapprochement explicite n'a pas été validé.
- Les valeurs absentes restent absentes et les zéros observés restent des zéros. Conserver les champs supplémentaires, les avertissements et les statistiques originales.
- Edge lit actuellement des fichiers JSON, pas une API HTTP. La première intégration passera par un téléchargement de dataset dans un dossier puis l'exécution du CLI existant.
- Un export Edge respecte le contrat dans `predictix-edge/docs/donnees-attendues.md`. Le statut `complete` ne suffit pas à prouver l'admissibilité ; la validation Edge doit être exécutée avant publication d'un dataset destiné à l'entraînement.

## Modèle de stockage proposé

| Entité | Contenu |
| --- | --- |
| sources | Identifiant de provenance et domaines reconnus explicitement |
| ingestion_runs | Version du contrat, instant de collecte, instant d'import, empreinte du contenu, bilan et erreurs |
| raw_documents | Document original conservé pour audit et réimport |
| matches | Identité source/sport/id et état consultable issu d'observations validées |
| match_observations | Instantanés immuables, champs indexés, JSON original et lien vers l'import |
| validation_issues | Erreurs, contradictions et décisions de quarantaine liées aux observations |
| dataset_exports | Paramètres, observations retenues, empreintes et résultat de validation Edge |

Un import répété à l'identique est idempotent. Les insertions d'un document sont transactionnelles. Un document invalide ne produit aucune mise à jour partielle. Les contradictions historiques restent consultables et empêchent une admission silencieuse dans les exports d'entraînement.

La sélection de l'état consultable utilise l'instant de collecte, pas l'ordre d'arrivée des fichiers. Une collecte ancienne ne doit pas écraser une collecte récente. Les corrections de résultats terminés exigent une règle explicite et une trace.

## Première API proposée

| Route | Usage |
| --- | --- |
| GET /health | État du service |
| POST /v1/ingestions | Import d'un document crawler ; accès authentifié |
| GET /v1/ingestions/:id | Bilan, rejets et doublons |
| GET /v1/matches | Recherche paginée par source, sport, dates, statut et équipe |
| GET /v1/matches/:id | Détail via un identifiant API unique |
| GET /v1/matches/:id/observations | Historique des collectes |
| POST /v1/datasets | Construction d'un export reproductible ; accès authentifié |
| GET /v1/datasets/:id | État, paramètres et validation de l'export |
| GET /v1/datasets/:id/download | Téléchargement de l'export compatible Edge |

Définir limites de taille, pagination, codes d'erreur et schémas dans OpenAPI. Distinguer les droits de lecture et d'ingestion. L'import initial utilise les fichiers existants ; un envoi HTTP depuis le crawler peut être ajouté ensuite.

## Choix à arrêter avant implémentation

Le langage, la base et le déploiement dépendent de l'hébergement et du volume attendu. Node.js/TypeScript s'intègre au backend Predictix ; Go s'intègre à l'écosystème du collecteur. SQLite et PostgreSQL sont deux options à évaluer selon le nombre de processus, les écritures simultanées et le stockage disponible.

Le projet autonome est destiné à `E:\Developpement\predictix-api`. Ce dossier est extérieur aux racines actuellement autorisées en écriture : sa création nécessite une extension d'accès ou une opération explicitement autorisée par le mécanisme d'approbation.

## Livraison initiale et vérification

1. Créer le service, sa configuration, les migrations et la documentation de démarrage.
2. Implémenter l'import CLI et HTTP avec conservation du JSON et validation du contrat.
3. Ajouter les routes de recherche et d'historique.
4. Produire un export par source avec traçabilité et validation par le CLI Edge.
5. Ajouter un client de lecture côté Predictix après vérification du service indépendant.

Les tests doivent couvrir : import répété, recouvrement des deux tableaux, collision d'identifiants entre sources, collecte arrivée en retard, valeurs absentes et zéro, document invalide, transaction annulée, contradictions de résultats, pagination et refus d'écriture sans authentification. La compatibilité d'un dataset doit être vérifiée avec le véritable binaire Edge, sans présumer qu'un schéma JSON garantit l'admission.
