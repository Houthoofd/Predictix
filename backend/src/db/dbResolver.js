import { dbRun, dbQuery, dbGet } from './database.js';

/**
 * Resolves the query execution methods depending on the provided db context.
 * Enables dependency injection and mockability in tests.
 * @param {object|function|null} db
 * @returns {{run: function, query: function, get: function}}
 */
export function resolveDb(db) {
  if (!db) {
    return { run: dbRun, query: dbQuery, get: dbGet };
  }
  return {
    run: (sql, params = []) => {
      if (typeof db.dbRun === 'function') return db.dbRun(sql, params);
      if (typeof db.run === 'function') {
        return new Promise((resolve, reject) => {
          db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ id: this ? this.lastID : undefined, changes: this ? this.changes : undefined });
          });
        });
      }
      if (typeof db === 'function') return db(sql, params);
      return dbRun(sql, params);
    },
    query: (sql, params = []) => {
      if (typeof db.dbQuery === 'function') return db.dbQuery(sql, params);
      if (typeof db.all === 'function') {
        return new Promise((resolve, reject) => {
          db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
          });
        });
      }
      if (typeof db === 'function') return db(sql, params);
      return dbQuery(sql, params);
    },
    get: (sql, params = []) => {
      if (typeof db.dbGet === 'function') return db.dbGet(sql, params);
      if (typeof db.get === 'function') {
        return new Promise((resolve, reject) => {
          db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
          });
        });
      }
      return dbGet(sql, params);
    }
  };
}
