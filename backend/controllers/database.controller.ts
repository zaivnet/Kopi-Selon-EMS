import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const SQLITE_MAGIC_HEADER = Buffer.from('SQLite format 3\0');

export const backupDatabase = (req: Request, res: Response) => {
  try {
    const dbPath = path.resolve(process.cwd(), 'database/dev.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.download(dbPath, `backup_kopi_selon_${timestamp}.db`);
  } catch (error) {
    console.error('Backup Error:', error);
    res.status(500).json({ error: 'Failed to backup database' });
  }
};

export const restoreDatabase = (req: Request, res: Response) => {
  let uploadedPath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No database file uploaded' });
    }
    uploadedPath = req.file.path;

    // 1. Validate file size (max 100MB)
    if (req.file.size > 100 * 1024 * 1024) {
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({ error: 'Ukuran file database melebihi batas 100MB.' });
    }

    // 2. Validate SQLite Magic Bytes Header ("SQLite format 3\0")
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(uploadedPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (!buffer.equals(SQLITE_MAGIC_HEADER)) {
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({ error: 'Berkas yang diunggah bukan merupakan file database SQLite yang valid.' });
    }

    const dbPath = path.resolve(process.cwd(), 'database/dev.db');
    
    // 3. Backup current database before replacing
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.resolve(process.cwd(), 'database');
      fs.copyFileSync(dbPath, path.join(backupDir, `dev_backup_before_restore_${timestamp}.db`));
    }

    // 4. Safely overwrite current database file
    fs.copyFileSync(uploadedPath, dbPath);
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Restore Error:', error);
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
    res.status(500).json({ error: 'Failed to restore database' });
  }
};
