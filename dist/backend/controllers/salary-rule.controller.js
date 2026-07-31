import { prisma } from '../lib/prisma.js';
export const getActiveRule = async (req, res) => {
    try {
        let rule = await prisma.salaryRule.findFirst({
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        if (!rule) {
            // Create a default one if none exists
            rule = await prisma.salaryRule.create({
                data: {
                    absentDeduction: 0,
                    lateDeductionPerMinute: 0,
                    underworkDeductionPerHour: 0,
                    overtimeBonusPerHour: 0,
                    isActive: true
                }
            });
        }
        res.json(rule);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getHistory = async (req, res) => {
    try {
        const rules = await prisma.salaryRule.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        res.json(rules);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateRule = async (req, res) => {
    try {
        const { absentDeduction, lateDeductionPerMinute, underworkDeductionPerHour, overtimeBonusPerHour } = req.body;
        // Deactivate current active rules
        await prisma.salaryRule.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });
        // Create new rule
        const newRule = await prisma.salaryRule.create({
            data: {
                absentDeduction: Number(absentDeduction),
                lateDeductionPerMinute: Number(lateDeductionPerMinute),
                underworkDeductionPerHour: Number(underworkDeductionPerHour),
                overtimeBonusPerHour: Number(overtimeBonusPerHour || 0),
                isActive: true
            }
        });
        res.json(newRule);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
