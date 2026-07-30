import path from 'path';
import fs from 'fs';
export const backupDatabase = (req, res) => {
    try {
        const dbPath = path.resolve(process.cwd(), 'database/dev.db');
        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.download(dbPath, `backup_kopi_selon_${timestamp}.db`);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to backup database' });
    }
};
export const restoreDatabase = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const uploadedPath = req.file.path;
        const dbPath = path.resolve(process.cwd(), 'database/dev.db');
        // Backup current first
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(dbPath, path.resolve(process.cwd(), `database/dev_backup_before_restore_${timestamp}.db`));
        // Restore
        fs.copyFileSync(uploadedPath, dbPath);
        fs.unlinkSync(uploadedPath); // remove temp file
        res.json({ message: 'Database restored successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to restore database' });
    }
};
