import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';

// Mock child_process and torSessionManager
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn()
}));

vi.mock('./torSessionManager.js', () => ({
  isTorActive: vi.fn(),
  renewTorSession: vi.fn()
}));

import { spawn } from 'child_process';
import { isTorActive } from './torSessionManager.js';
import { scrapeSingleMatch, crawlH2HLinksBatch, scrapeHistoricalMatches } from './scraperRunner.js';

describe('ScraperRunner - Network Policy Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should abort immediately without direct fallback when networkMode is tor-required and Tor is inactive', async () => {
    isTorActive.mockResolvedValue(false);

    const result = await scrapeSingleMatch(
      'mockPath',
      'https://example.com/match1',
      false,
      null,
      9050,
      'matchendirect',
      'football',
      'tor-required'
    );

    expect(result).toBeNull();
    expect(isTorActive).toHaveBeenCalledWith(9050);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should forward -network-mode and proxy port arguments to Go crawler when Tor is active in tor-required mode', async () => {
    isTorActive.mockResolvedValue(true);

    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.pid = 12345;

    spawn.mockImplementation((exePath, args) => {
      const outIdx = args.indexOf('-output');
      if (outIdx !== -1 && args[outIdx + 1]) {
        try {
          fs.writeFileSync(args[outIdx + 1], JSON.stringify({ all_matches: [{ home_team: 'Arsenal', away_team: 'Chelsea' }] }), 'utf-8');
        } catch (e) {}
      }
      setTimeout(() => {
        mockChild.emit('close', 0);
      }, 5);
      return mockChild;
    });

    // Run scrapeSingleMatch
    const result = await scrapeSingleMatch(
      'mockPath',
      'https://example.com/match2',
      false,
      null,
      9052,
      'matchendirect',
      'football',
      'tor-required'
    );

    expect(result).not.toBeNull();
    expect(spawn).toHaveBeenCalled();
    const spawnCall = spawn.mock.calls[0];
    const args = spawnCall[1];

    expect(args).toContain('-network-mode');
    expect(args[args.indexOf('-network-mode') + 1]).toBe('tor-required');

    expect(args).toContain('-socks-port');
    expect(args[args.indexOf('-socks-port') + 1]).toBe('9052');

    expect(args).toContain('-tor-port');
    expect(args[args.indexOf('-tor-port') + 1]).toBe('9052');
  });

  it('should forward -network-mode direct and port 0 when mode is direct', async () => {
    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.pid = 12346;

    spawn.mockImplementation((exePath, args) => {
      const outIdx = args.indexOf('-output');
      if (outIdx !== -1 && args[outIdx + 1]) {
        try {
          fs.writeFileSync(args[outIdx + 1], JSON.stringify({ all_matches: [{ home_team: 'Arsenal', away_team: 'Chelsea' }] }), 'utf-8');
        } catch (e) {}
      }
      setTimeout(() => {
        mockChild.emit('close', 0);
      }, 5);
      return mockChild;
    });

    const result = await scrapeSingleMatch(
      'mockPath',
      'https://example.com/match3',
      false,
      null,
      9050,
      'matchendirect',
      'football',
      'direct'
    );

    expect(result).not.toBeNull();
    // In direct mode, Tor is not checked
    expect(isTorActive).not.toHaveBeenCalled();

    expect(spawn).toHaveBeenCalled();
    const spawnCall = spawn.mock.calls[0];
    const args = spawnCall[1];

    expect(args).toContain('-network-mode');
    expect(args[args.indexOf('-network-mode') + 1]).toBe('direct');

    expect(args).toContain('-socks-port');
    expect(args[args.indexOf('-socks-port') + 1]).toBe('0');

    expect(args).toContain('-tor-port');
    expect(args[args.indexOf('-tor-port') + 1]).toBe('0');
  });

  it('should pass networkMode through crawlH2HLinksBatch and scrapeHistoricalMatches alias', async () => {
    isTorActive.mockResolvedValue(true);

    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.pid = 12347;

    spawn.mockImplementation((exePath, args) => {
      const outIdx = args.indexOf('-output');
      if (outIdx !== -1 && args[outIdx + 1]) {
        try {
          fs.writeFileSync(args[outIdx + 1], JSON.stringify({ all_matches: [{ home_team: 'Arsenal', away_team: 'Chelsea' }] }), 'utf-8');
        } catch (e) {}
      }
      setTimeout(() => {
        mockChild.emit('close', 0);
      }, 5);
      return mockChild;
    });

    await scrapeHistoricalMatches(['https://example.com/h2h-1'], 'mockPath', {
      activePorts: [9054],
      networkMode: 'tor-required',
      scraper: 'matchendirect',
      sport: 'football'
    });

    expect(spawn).toHaveBeenCalled();
    const args = spawn.mock.calls[0][1];
    expect(args).toContain('-network-mode');
    expect(args[args.indexOf('-network-mode') + 1]).toBe('tor-required');
    expect(args).toContain('-socks-port');
    expect(args[args.indexOf('-socks-port') + 1]).toBe('9054');
  });

  it('should verify runDiscoveryProcess spawns Go crawler with correct arguments and parses output', async () => {
    const { runDiscoveryProcess } = await import('./scraperRunner.js');
    const { runDiscoveryProcess: directDiscovery } = await import('./discoveryRunner.js');
    expect(runDiscoveryProcess).toBe(directDiscovery);

    const mockChild = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.pid = 12348;

    spawn.mockImplementation((exePath, args) => {
      const outIdx = args.indexOf('-output');
      if (outIdx !== -1 && args[outIdx + 1]) {
        try {
          fs.writeFileSync(args[outIdx + 1], JSON.stringify({ all_matches: [{ home_team: 'PSG', away_team: 'OM' }] }), 'utf-8');
        } catch (e) {}
      }
      setTimeout(() => {
        mockChild.emit('close', 0);
      }, 5);
      return mockChild;
    });

    const matches = await runDiscoveryProcess('mockPath', 'unused', ['mockPath/data'], '2026-10-05', null, 'matchendirect', 'football', 'direct', 0);
    expect(matches).toHaveLength(1);
    expect(matches[0].home_team).toBe('PSG');
    expect(spawn).toHaveBeenCalled();

    const args = spawn.mock.calls[0][1];
    expect(args).toContain('-action');
    expect(args[args.indexOf('-action') + 1]).toBe('discover');
    expect(args).toContain('-date');
    expect(args[args.indexOf('-date') + 1]).toBe('2026-10-05');
  });
});

