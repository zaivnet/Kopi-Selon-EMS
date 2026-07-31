import fs from 'fs';
import path from 'path';
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const DB_PATH = path.resolve(process.cwd(), 'database/dev.db');
export function initAutoBackup() {
    const intervalHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS) || 24;
    const maxBackups = Number(process.env.AUTO_BACKUP_MAX_KEEP) || 10;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(`[Auto Backup] Initialized. Running every ${intervalHours} hours. Keeping max ${maxBackups} backups.`);
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    // Run initial backup on server startup
    runBackup(maxBackups);
    // Set periodic backup interval
    setInterval(() => {
        runBackup(maxBackups);
    }, intervalMs);
}
function runBackup(maxBackups) {
    try {
        if (!fs.existsSync(DB_PATH)) {
            console.warn('[Auto Backup] database/dev.db not found, skipping backup.');
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `auto_backup_kopi_selon_${timestamp}.db`;
        const backupFilePath = path.join(BACKUP_DIR, backupFileName);
        fs.copyFileSync(DB_PATH, backupFilePath);
        console.log(`[Auto Backup] Successfully created: ${backupFileName}`);
        cleanOldBackups(maxBackups);
    }
    catch (error) {
        console.error('[Auto Backup] Failed to create database backup:', error);
    }
}
function cleanOldBackups(maxBackups) {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backupFiles = files
            .filter((file) => file.startsWith('auto_backup_kopi_selon_') && file.endsWith('.db'))
            .map((file) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stat = fs.statSync(filePath);
            return { file, filePath, mtime: stat.mtimeMs };
        })
            .sort((a, b) => a.mtime - b.mtime); // oldest first
        if (backupFiles.length > maxBackups) {
            const filesToDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
            filesToDelete.forEach((f) => {
                fs.unlinkSync(f.filePath);
                console.log(`[Auto Backup] Deleted old backup file: ${f.file}`);
            });
        }
    }
    catch (error) {
        console.error('[Auto Backup] Failed to clean old backups:', error);
    }
}
