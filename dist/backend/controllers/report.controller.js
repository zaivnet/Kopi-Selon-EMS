import { prisma } from '../lib/prisma.js';
export const getReportData = async (req, res) => {
    try {
        const { month, year, startDate, endDate, employeeId, shiftId } = req.query;
        // filters: Exclude Owner & Administrator from reports
        const employeeFilter = {
            deletedAt: null,
            user: {
                deletedAt: null,
                role: {
                    name: { in: ['Karyawan', 'Staff'] }
                }
            }
        };
        if (employeeId)
            employeeFilter.id = String(employeeId);
        if (shiftId)
            employeeFilter.shiftId = String(shiftId);
        const employees = await prisma.employee.findMany({
            where: employeeFilter,
            include: {
                shift: true,
                attendances: {
                    where: {
                        deletedAt: null,
                        ...(startDate && endDate ? {
                            date: {
                                gte: new Date(String(startDate)),
                                lt: new Date(new Date(String(endDate)).getTime() + 24 * 60 * 60 * 1000)
                            }
                        } : month && year ? {
                            date: {
                                gte: new Date(Number(year), Number(month) - 1, 1),
                                lt: new Date(Number(year), Number(month), 1)
                            }
                        } : {})
                    }
                },
                salaryHistories: {
                    where: {
                        deletedAt: null,
                        ...(month && year ? {
                            periodMonth: Number(month),
                            periodYear: Number(year)
                        } : {})
                    }
                }
            }
        });
        const rule = await prisma.salaryRule.findFirst({
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        const getShiftMins = (shift) => {
            const [sH, sM] = shift.startTime.split(':').map(Number);
            const [eH, eM] = shift.endTime.split(':').map(Number);
            let start = sH * 60 + sM;
            let end = eH * 60 + eM;
            if (end <= start)
                end += 24 * 60;
            return end - start;
        };
        const report = employees.map(emp => {
            let lateMins = 0;
            let underworkHours = 0;
            let totalPresent = 0;
            for (const att of emp.attendances) {
                if (!att.clockIn || !att.clockOut)
                    continue;
                totalPresent++;
                const expectedMins = emp.shift ? getShiftMins(emp.shift) : 8 * 60;
                if (emp.shift) {
                    const [sH, sM] = emp.shift.startTime.split(':').map(Number);
                    const shiftStart = new Date(att.date);
                    shiftStart.setHours(sH, sM, 0, 0);
                    const clockInTime = new Date(att.clockIn);
                    if (clockInTime > shiftStart) {
                        const diffMs = clockInTime.getTime() - shiftStart.getTime();
                        lateMins += Math.floor(diffMs / 60000);
                    }
                }
                const clockIn = new Date(att.clockIn);
                const clockOut = new Date(att.clockOut);
                const workMins = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);
                if (workMins < expectedMins) {
                    const shortageMins = expectedMins - workMins;
                    underworkHours += (shortageMins / 60);
                }
            }
            let absentDays = 0;
            if (month && year) {
                absentDays = Math.max(0, 26 - totalPresent);
            }
            else {
                // Fallback for custom date range
                let totalDays = 26;
                if (startDate && endDate) {
                    const start = new Date(String(startDate));
                    const end = new Date(String(endDate));
                    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    totalDays = Math.floor(diffDays * (26 / 30));
                }
                absentDays = Math.max(0, totalDays - totalPresent);
            }
            let totalDeduction = 0;
            let totalSalary = 0;
            if (month && year && emp.salaryHistories.length > 0) {
                const hist = emp.salaryHistories[0];
                totalDeduction = hist.totalDeduction;
                totalSalary = hist.netSalary;
            }
            else if (rule && emp.baseSalary) {
                const lateDeduction = lateMins * rule.lateDeductionPerMinute;
                const underworkDeduction = underworkHours * rule.underworkDeductionPerHour;
                const absentDeduction = absentDays * rule.absentDeduction;
                totalDeduction = lateDeduction + underworkDeduction + absentDeduction;
                totalSalary = emp.baseSalary - totalDeduction;
            }
            return {
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
                shift: emp.shift?.name || '-',
                totalPresent,
                lateMins,
                underworkHours: underworkHours.toFixed(2),
                absentDays,
                totalDeduction,
                totalSalary,
                baseSalary: emp.baseSalary || 0
            };
        });
        res.json(report);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
