import { describe, it, expect } from 'vitest';
import { validateBet, validateBetsBatch } from './validation.js';

describe('Validation Helpers', () => {
  describe('validateBet', () => {
    it('should pass on a fully valid bet object and normalize fields', () => {
      const validBet = {
        date: '2026-06-11',
        time: '14:30',
        league: 'Ligue 1',
        home_team: 'PSG',
        away_team: 'Marseille',
        best_tip: 'Over',
        odds: '1.95',
        stake: '10.0',
        card_line: '4.5',
        probability: '65',
        bookmaker: ' Winamax ',
        status: 'pending',
        match_id: 'abc123xyz'
      };

      const result = validateBet(validBet);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const data = result.normalizedData;
      expect(data.date).toBe('2026-06-11');
      expect(data.time).toBe('14:30');
      expect(data.league).toBe('Ligue 1');
      expect(data.home_team).toBe('PSG');
      expect(data.away_team).toBe('Marseille');
      expect(data.best_tip).toBe('Over');
      expect(data.odds).toBe(1.95);
      expect(data.stake).toBe(10);
      expect(data.card_line).toBe(4.5);
      expect(data.probability).toBe(65);
      expect(data.bookmaker).toBe('Winamax');
      expect(data.status).toBe('PENDING');
      expect(data.match_id).toBe('abc123xyz');
    });

    it('should fail if required fields are missing', () => {
      const invalidBet = {
        date: '2026-06-11',
        league: 'Ligue 1',
        home_team: 'PSG',
        away_team: 'Marseille',
        odds: '1.95',
        stake: '10.0',
        card_line: '4.5'
      };

      const result = validateBet(invalidBet);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Le champ 'time' est obligatoire.");
      expect(result.errors).toContain("Le champ 'best_tip' est obligatoire.");
    });

    it('should fail on invalid date or time format', () => {
      const badFormats = {
        date: '11-06-2026',
        time: '25:00',
        league: 'Ligue 1',
        home_team: 'PSG',
        away_team: 'Marseille',
        best_tip: 'Over',
        odds: 1.95,
        stake: 10.0,
        card_line: 4.5
      };

      const result = validateBet(badFormats);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Le format de la date doit être YYYY-MM-DD.");
      expect(result.errors).toContain("Le format de l'heure doit être HH:MM.");
    });

    it('should fail on invalid odds, stakes or card_line values', () => {
      const badNumbers = {
        date: '2026-06-11',
        time: '14:30',
        league: 'Ligue 1',
        home_team: 'PSG',
        away_team: 'Marseille',
        best_tip: 'Over',
        odds: '0.95',
        stake: '-5.0',
        card_line: 'abc'
      };

      const result = validateBet(badNumbers);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La cote ('odds') doit être un nombre supérieur ou égal à 1.0.");
      expect(result.errors).toContain("La mise ('stake') doit être un nombre strictement supérieur à 0.");
      expect(result.errors).toContain("La ligne de pari ('card_line') doit être un nombre valide.");
    });
  });

  describe('validateBetsBatch', () => {
    it('should validate an array of bets and return normalized array', () => {
      const batch = [
        {
          date: '2026-06-11',
          time: '14:30',
          league: 'Ligue 1',
          home_team: 'PSG',
          away_team: 'Marseille',
          best_tip: 'Over',
          odds: '1.95',
          stake: '10.0',
          card_line: '4.5'
        },
        {
          date: '2026-06-11',
          time: '18:00',
          league: 'Ligue 1',
          home_team: 'Lyon',
          away_team: 'Monaco',
          best_tip: 'Under',
          odds: '1.80',
          stake: '15.0',
          card_line: '3.5'
        }
      ];

      const result = validateBetsBatch(batch);
      expect(result.isValid).toBe(true);
      expect(result.normalizedBets).toHaveLength(2);
      expect(result.normalizedBets[0].home_team).toBe('PSG');
      expect(result.normalizedBets[1].home_team).toBe('Lyon');
    });

    it('should collect errors from all failing bets in the batch', () => {
      const batch = [
        {
          date: '2026-06-11',
          time: '14:30',
          league: 'Ligue 1',
          home_team: 'PSG',
          away_team: 'Marseille',
          best_tip: 'Over',
          odds: '0.5',
          stake: '10.0',
          card_line: '4.5'
        },
        {
          date: '2026-06-11',
          time: '18:00',
          league: 'Ligue 1',
          home_team: 'Lyon',
          away_team: 'Monaco',
          best_tip: 'Under',
          odds: '1.80',
          stake: '-5.0',
          card_line: '3.5'
        }
      ];

      const result = validateBetsBatch(batch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('PSG vs Marseille');
      expect(result.errors[0]).toContain('La cote');
      expect(result.errors[1]).toContain('Lyon vs Monaco');
      expect(result.errors[1]).toContain('La mise');
    });
  });
});
