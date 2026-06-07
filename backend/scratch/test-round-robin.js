import { orderMatchesRoundRobin } from '../src/utils/matchOrderer.js';

const testMatches = [
  { id: 1, sport: 'football' },
  { id: 2, sport: 'football' },
  { id: 3, sport: 'football' },
  { id: 4, sport: 'basketball' },
  { id: 5, sport: 'tennis' },
  { id: 6, sport: 'tennis' },
];

console.log("Input matches:", testMatches.map(m => `${m.sport}-${m.id}`).join(', '));
const reordered = orderMatchesRoundRobin(testMatches);
console.log("Ordered matches:", reordered.map(m => `${m.sport}-${m.id}`).join(', '));

// Expected: football-1, basketball-4, tennis-5, football-2, tennis-6, football-3
const orderString = reordered.map(m => `${m.sport}-${m.id}`).join(', ');
const expected = "football-1, basketball-4, tennis-5, football-2, tennis-6, football-3";

if (orderString === expected) {
  console.log("✓ TEST PASSED SUCCESSFULY!");
} else {
  console.error("✗ TEST FAILED!");
  process.exit(1);
}
