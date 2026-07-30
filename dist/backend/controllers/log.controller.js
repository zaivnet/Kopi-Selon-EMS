import { prisma } from '../lib/prisma.js';
export const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: {
                    select: { username: true }
                }
            }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};
