import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const SQLITE_MAGIC_HEADER = Buffer.from('SQLite format 3\0');
const DB_PATH = path.resolve(process.cwd(), 'database/dev.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function ensureDirectory(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function cleanupFile(filePath?: string) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function validateSqliteFile(filePath: string) {
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  if (!buffer.equals(SQLITE_MAGIC_HEADER)) {
    throw new Error('Berkas yang diunggah bukan merupakan file database SQLite yang valid.');
  }
}

function createRollbackBackup(targetPath: string) {
  ensureDirectory(BACKUP_DIR);
  const rollbackPath = path.join(BACKUP_DIR, `restore_rollback_${getTimestamp()}.db`);

  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, rollbackPath);
  }

  return rollbackPath;
}

export const backupDatabase = (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    const timestamp = getTimestamp();
    res.download(DB_PATH, `backup_kopi_selon_${timestamp}.db`);
  } catch (error) {
    console.error('Backup Error:', error);
    res.status(500).json({ error: 'Failed to backup database' });
  }
};

export const restoreDatabase = (req: Request, res: Response) => {
  let uploadedPath = '';
  let rollbackPath = '';
  let tempRestorePath = '';
  let rollbackApplied = false;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No database file uploaded' });
    }

    uploadedPath = req.file.path;

    if (req.file.size > 100 * 1024 * 1024) {
      cleanupFile(uploadedPath);
      return res.status(400).json({ error: 'Ukuran file database melebihi batas 100MB.' });
    }

    validateSqliteFile(uploadedPath);

    rollbackPath = createRollbackBackup(DB_PATH);
    tempRestorePath = path.join(BACKUP_DIR, `restore_staging_${getTimestamp()}.db`);

    fs.copyFileSync(uploadedPath, tempRestorePath);
    validateSqliteFile(tempRestorePath);

    fs.copyFileSync(tempRestorePath, DB_PATH);

    cleanupFile(uploadedPath);
    cleanupFile(tempRestorePath);

    return res.json({
      message: 'Database restored successfully',
      rollbackBackupCreated: rollbackPath ? path.basename(rollbackPath) : null,
    });
  } catch (error) {
    console.error('Restore Error:', error);

    if (rollbackPath && fs.existsSync(rollbackPath)) {
      try {
        fs.copyFileSync(rollbackPath, DB_PATH);
        rollbackApplied = true;
        console.log('Restore rollback completed successfully.');
      } catch (rollbackError) {
        console.error('Restore rollback failed:', rollbackError);
      }
    }

    cleanupFile(uploadedPath);
    cleanupFile(tempRestorePath);

    return res.status(500).json({
      error: 'Failed to restore database',
      rollbackApplied,
      rollbackBackup: rollbackPath ? path.basename(rollbackPath) : null,
    });
  }
};
