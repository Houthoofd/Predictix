import { runNightlyBackup } from '../src/services/cronService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log("Starting test-db-backup.js...");
  const backupsDir = path.resolve(__dirname, '../../backups');
  
  // Clean backups dir first for clean test
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir);
    for (const f of files) {
      fs.unlinkSync(path.join(backupsDir, f));
    }
    console.log("Cleared existing files in backups/ directory.");
  }
  
  // Trigger backup
  await runNightlyBackup();
  
  // Check if file is created
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('predictix_backup_') && f.endsWith('.db'));
    console.log("Created backup files:", files);
    if (files.length > 0) {
      console.log("✓ Success! Backup file created successfully.");
      
      // Test retention: create a dummy old file
      const oldFile = path.join(backupsDir, 'predictix_backup_2020-01-01T00-00-00-000Z.db');
      fs.writeFileSync(oldFile, 'dummy content');
      
      // Update mtime to 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600000);
      fs.utimesSync(oldFile, tenDaysAgo, tenDaysAgo);
      console.log("Created a dummy old backup file to test retention.");
      
      // Run backup again
      await runNightlyBackup();
      
      // Check if old file is deleted
      if (!fs.existsSync(oldFile)) {
        console.log("✓ Success! Stale backup file was deleted by retention policy.");
      } else {
        console.error("✗ Failure! Stale backup file was NOT deleted.");
      }
    } else {
      console.error("✗ Failure! Backup file not found.");
    }
  } else {
    console.error("✗ Failure! Backups directory does not exist.");
  }
  
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
