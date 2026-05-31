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

// Routes
import betsRoutes from './routes/bets.js';
import scraperRoutes from './routes/scraper.js';
import strategiesRoutes from './routes/strategies.js';

app.use('/api', betsRoutes);
app.use('/api', scraperRoutes);
app.use('/api', strategiesRoutes);

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
});

// Completely disable all server-level request, connection, and header timeouts for long scraper operations
server.timeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;
server.keepAliveTimeout = 0;
