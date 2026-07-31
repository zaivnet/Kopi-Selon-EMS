import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import roleRoutes from './routes/role.routes.js';
import shiftRoutes from "./routes/shift.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import companyRoutes from "./routes/company.routes.js";
import settingRoutes from "./routes/setting.routes.js";
import logRoutes from "./routes/log.routes.js";
import databaseRoutes from "./routes/database.routes.js";
import salaryRuleRoutes from "./routes/salary-rule.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import reportRoutes from "./routes/report.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import requestRoutes from "./routes/request.routes.js";
import { seedDatabase } from './lib/seed.js';
import { initAutoBackup } from './lib/auto-backup.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure necessary directories exist
['uploads', 'database'].forEach(dir => {
    const dirPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set("io", io);
app.use(cors());
// Selfie attendance is sent as a data URL. The controller still enforces a
// stricter 5 MB decoded-image limit and validates the actual image signature.
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/database', databaseRoutes);
app.use("/api/salary-rules", salaryRuleRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/requests", requestRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
async function startServer() {
    try {
        await seedDatabase();
        initAutoBackup();
    }
    catch (err) {
        console.error('Seed execution warning:', err);
    }
    if (!isProduction) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
            root: path.resolve(process.cwd(), 'frontend'),
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.resolve(process.cwd(), 'dist/frontend');
        app.use(express.static(distPath));
        app.get('/{*splat}', (req, res) => {
            res.sendFile(path.resolve(distPath, 'index.html'));
        });
    }
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
startServer();
