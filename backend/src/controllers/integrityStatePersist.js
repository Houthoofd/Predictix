import { dbRun, dbGet } from '../db/database.js';

/**
 * Saves the current integrity batch state to the SQLite database.
 * @param {Object} batch The activeIntegrityBatch state object
 */
export async function saveIntegrityState(batch) {
  try {
    const queueStr = JSON.stringify(batch.queue || []);
    // Limit logs serialized to keep DB queries performant (e.g. last 200 logs)
    const logsToSave = (batch.logs || []).slice(-200);
    const logsStr = JSON.stringify(logsToSave);

    await dbRun(`
      INSERT OR REPLACE INTO integrity_batch_state (
        id, status, queue, current_index, processed_count, success_count, error_count, logs, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      batch.status || 'idle',
      queueStr,
      batch.currentIndex || 0,
      batch.processedCount || 0,
      batch.successCount || 0,
      batch.errorCount || 0,
      logsStr
    ]);
  } catch (err) {
    console.error('[Predictix State Persist] Error saving integrity state:', err.message);
  }
}

/**
 * Loads the saved integrity batch state from the SQLite database.
 * @returns {Promise<Object|null>} The loaded state or null if not found
 */
export async function loadIntegrityState() {
  try {
    const row = await dbGet('SELECT * FROM integrity_batch_state WHERE id = 1');
    if (!row) return null;

    return {
      status: row.status,
      queue: JSON.parse(row.queue || '[]'),
      currentIndex: row.current_index || 0,
      processedCount: row.processed_count || 0,
      successCount: row.success_count || 0,
      errorCount: row.error_count || 0,
      logs: JSON.parse(row.logs || '[]')
    };
  } catch (err) {
    console.error('[Predictix State Persist] Error loading integrity state:', err.message);
    return null;
  }
}

/**
 * Clears or resets the saved integrity batch state.
 */
export async function clearIntegrityState() {
  try {
    await dbRun('DELETE FROM integrity_batch_state WHERE id = 1');
  } catch (err) {
    console.error('[Predictix State Persist] Error clearing integrity state:', err.message);
  }
}
