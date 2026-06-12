import './utils/logger.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Disable caching for all API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Routes
import betsRoutes from './routes/bets.js';
import scraperRoutes from './routes/scraper.js';
import strategiesRoutes from './routes/strategies.js';
import settingsRoutes from './routes/settings.js';
import modelsRoutes from './routes/models.js';

app.use('/api', betsRoutes);
app.use('/api', scraperRoutes);
app.use('/api', strategiesRoutes);
app.use('/api', settingsRoutes);
app.use('/api', modelsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Predictix API Server', timestamp: new Date() });
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`========================================================================`);
  console.log(` PREDICTIX BACKEND SERVER RUNNING`);
  console.log(`========================================================================`);
  console.log(` Port:    http://localhost:${PORT}`);
  console.log(` DB:      SQLite (predictix.db)`);
  console.log(` Scraper: ${process.env.SCRAPER_PATH || 'E:\\Developpement\\scrapper-v3'}`);
  console.log(`========================================================================`);
  
  // Initialize background match re-scraper cron service
  import('./services/cronService.js')
    .then(({ initReScraper }) => {
      initReScraper();
    })
    .catch(err => console.error('[Predictix Server] Failed to initialize re-scraper service:', err));

  // Auto-train GBDT models on startup
  import('./utils/gbdtTrainer.js')
    .then(({ trainGBDTModels }) => {
      import('./db/database.js').then(({ dbQuery }) => {
        console.log('[Predictix Server] Initial GBDT model training triggered...');
        trainGBDTModels(dbQuery).catch(err => console.error('[Predictix Server] GBDT training failed on startup:', err));
      });
    })
    .catch(err => console.error('[Predictix Server] Failed to import GBDT trainer:', err));
});

// Completely disable all server-level request, connection, and header timeouts for long scraper operations
server.timeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;
server.keepAliveTimeout = 0;
