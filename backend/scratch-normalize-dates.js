import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('predictix.db');

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export function parseFrenchDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim().toLowerCase();
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmRef) {
    const day = dmRef[1].padStart(2, '0');
    const month = dmRef[2].padStart(2, '0');
    const year = dmRef[3];
    return `${year}-${month}-${day}`;
  }
  
  const frenchMonths = {
    'janvier': '01', 'janv.': '01', 'janv': '01',
    'février': '02', 'févr.': '02', 'févr': '02', 'fevrier': '02',
    'mars': '03',
    'avril': '04', 'avr.': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07', 'juil.': '07', 'juil': '07',
    'août': '08', 'aout': '08',
    'septembre': '09', 'sept.': '09', 'sept': '09',
    'octobre': '10', 'oct.': '10', 'oct': '10',
    'novembre': '11', 'nov.': '11', 'nov': '11',
    'décembre': '12', 'déc.': '12', 'déc': '12', 'decembre': '12'
  };
  
  dateStr = dateStr.replace(/^1er\b/, '1');
  dateStr = dateStr.replace(/^le\s+/, ''); // clean "le " prefix if any
  
  const textMatch = dateStr.match(/^(\d{1,2})\s+([a-zéûûöäêèéàç\.]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthName = textMatch[2];
    const year = textMatch[3];
    const month = frenchMonths[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

async function run() {
  try {
    const rows = await dbQuery("SELECT match_id, date FROM scraped_predictions");
    console.log(`Analyzing ${rows.length} rows...`);
    
    await dbRun("BEGIN TRANSACTION");
    let updatedCount = 0;
    for (const row of rows) {
      const parsed = parseFrenchDate(row.date);
      if (parsed && parsed !== row.date) {
        await dbRun("UPDATE scraped_predictions SET date = ? WHERE match_id = ?", [parsed, row.match_id]);
        updatedCount++;
      }
    }
    await dbRun("COMMIT");
    
    console.log(`✓ Date normalization complete. Updated ${updatedCount} rows to YYYY-MM-DD.`);
    
    // Verify results
    const checkRows = await dbQuery("SELECT date, COUNT(*) as count FROM scraped_predictions GROUP BY date ORDER BY date DESC LIMIT 20");
    console.log('\nUpdated date counts in database:');
    console.log(checkRows);
    
  } catch (err) {
    console.error("Error during transaction update:", err);
    try {
      await dbRun("ROLLBACK");
    } catch(e) {}
  } finally {
    db.close();
  }
}

run();
