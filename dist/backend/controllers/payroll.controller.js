import { prisma } from '../lib/prisma.js';
export const generatePayroll = async (req, res) => {
    try {
        const { periodMonth, periodYear } = req.body; // e.g. 7, 2026
        // Get active salary rule
        const rule = await prisma.salaryRule.findFirst({
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        if (!rule) {
            return res.status(400).json({ message: 'Tidak ada aturan gaji aktif.' });
        }
        // Helper for shift duration in minutes (handles overnight shifts)
        const getShiftMins = (shift) => {
            const [sH, sM] = shift.startTime.split(':').map(Number);
            const [eH, eM] = shift.endTime.split(':').map(Number);
            let start = sH * 60 + sM;
            let end = eH * 60 + eM;
            if (end <= start)
                end += 24 * 60; // overnight shift
            return end - start;
        };
        // Fetch holidays in the period
        const periodStart = new Date(periodYear, periodMonth - 1, 1);
        const periodEnd = new Date(periodYear, periodMonth, 1);
        const holidays = await prisma.holiday.findMany({
            where: {
                date: { gte: periodStart, lt: periodEnd },
                deletedAt: null,
            },
        });
        const holidayCount = holidays.length;
        const employees = await prisma.employee.findMany({
            where: {
                deletedAt: null,
                user: {
                    deletedAt: null,
                    role: {
                        name: { in: ['Karyawan', 'Staff'] }
                    }
                }
            },
            include: {
                shift: true,
                attendances: {
                    where: {
                        date: {
                            gte: periodStart,
                            lt: periodEnd
                        },
                        deletedAt: null
                    }
                },
                leaves: {
                    where: {
                        status: 'APPROVED',
                        deletedAt: null,
                        startDate: {
                            gte: periodStart,
                            lt: periodEnd
                        }
                    }
                },
                permissions: {
                    where: {
                        status: 'APPROVED',
                        deletedAt: null,
                        date: {
                            gte: periodStart,
                            lt: periodEnd
                        }
                    }
                }
            }
        });
        const results = [];
        // Calculate per employee
        for (const emp of employees) {
            if (!emp.baseSalary)
                continue;
            let totalDeduction = 0;
            let lateMins = 0;
            let underworkHours = 0;
            let absentDays = 0;
            const deductions = [];
            for (const att of emp.attendances) {
                if (!att.clockIn || !att.clockOut) {
                    continue;
                }
                const expectedMins = emp.shift ? getShiftMins(emp.shift) : 8 * 60;
                if (emp.shift) {
                    // Late calc
                    const [sH, sM] = emp.shift.startTime.split(':').map(Number);
                    const shiftStart = new Date(att.date);
                    shiftStart.setHours(sH, sM, 0, 0);
                    const clockInTime = new Date(att.clockIn);
                    if (clockInTime > shiftStart) {
                        const diffMs = clockInTime.getTime() - shiftStart.getTime();
                        const mins = Math.floor(diffMs / 60000);
                        lateMins += mins;
                    }
                }
                // Underwork calc across overnight bounds
                const clockIn = new Date(att.clockIn);
                const clockOut = new Date(att.clockOut);
                const workMins = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);
                if (workMins < expectedMins) {
                    const shortageMins = expectedMins - workMins;
                    underworkHours += (shortageMins / 60);
                }
            }
            const lateDeduction = lateMins * rule.lateDeductionPerMinute;
            const underworkDeduction = underworkHours * rule.underworkDeductionPerHour;
            // Calculate unique attended days
            const uniqueAttendedDates = new Set(emp.attendances
                .filter(att => att.clockIn && att.clockOut)
                .map(att => new Date(att.date).toISOString().slice(0, 10)));
            const attendedDays = uniqueAttendedDates.size;
            // Calculate total leave duration in days
            let approvedLeaveDays = 0;
            for (const leave of emp.leaves) {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate || leave.startDate);
                const diffMs = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
                approvedLeaveDays += diffDays;
            }
            approvedLeaveDays += emp.permissions.length;
            const totalValidDays = attendedDays + approvedLeaveDays + holidayCount;
            absentDays = Math.max(0, 26 - totalValidDays);
            const absentDeduction = absentDays * rule.absentDeduction;
            if (lateDeduction > 0)
                deductions.push({ name: 'Terlambat', amount: lateDeduction });
            if (underworkDeduction > 0)
                deductions.push({ name: 'Kurang Jam', amount: underworkDeduction });
            if (absentDeduction > 0)
                deductions.push({ name: 'Tidak Masuk', amount: absentDeduction });
            totalDeduction = lateDeduction + underworkDeduction + absentDeduction;
            const netSalary = emp.baseSalary - totalDeduction;
            // Check if history already exists
            const existing = await prisma.salaryHistory.findFirst({
                where: { employeeId: emp.id, periodMonth, periodYear, deletedAt: null }
            });
            if (!existing) {
                const history = await prisma.salaryHistory.create({
                    data: {
                        employeeId: emp.id,
                        periodMonth,
                        periodYear,
                        baseSalary: emp.baseSalary,
                        totalAllowance: 0,
                        totalDeduction,
                        netSalary,
                        status: 'PENDING',
                        deductions: {
                            create: deductions
                        }
                    }
                });
                results.push(history);
            }
        }
        res.json({ message: 'Payroll generated', count: results.length });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getPayrollHistory = async (req, res) => {
    try {
        const histories = await prisma.salaryHistory.findMany({
            where: {
                deletedAt: null,
                employee: {
                    deletedAt: null,
                    user: {
                        deletedAt: null,
                        role: {
                            name: { in: ['Karyawan', 'Staff'] }
                        }
                    }
                }
            },
            include: {
                employee: { select: { firstName: true, lastName: true } },
                deductions: true
            },
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' }
            ]
        });
        res.json(histories);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
