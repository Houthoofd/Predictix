import { dbRun } from './src/db/database.js';

async function main() {
  try {
    const newConditions = {
      scope: 'h2h',
      limit: 5,
      operator: '>=',
      threshold: 10,
      aggregation: 'avg'
    };
    
    await dbRun(`
      UPDATE custom_strategies 
      SET name = ?, conditions_json = ? 
      WHERE id = 1
    `, [
      "Fautes commises : au moins 10 (Moyenne H2H)",
      JSON.stringify(newConditions)
    ]);
    
    console.log('✓ Successfully updated custom strategy in SQLite! Threshold lowered to 10 fouls.');
  } catch (e) {
    console.error(e);
  }
}

main();
