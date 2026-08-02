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
                workSchedules: {
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
                    },
                    include: { shift: true }
                },
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
                leaves: {
                    where: {
                        status: 'APPROVED',
                        deletedAt: null,
                        ...(startDate && endDate ? {
                            startDate: {
                                gte: new Date(String(startDate)),
                                lt: new Date(new Date(String(endDate)).getTime() + 24 * 60 * 60 * 1000)
                            }
                        } : month && year ? {
                            startDate: {
                                gte: new Date(Number(year), Number(month) - 1, 1),
                                lt: new Date(Number(year), Number(month), 1)
                            }
                        } : {})
                    }
                },
                permissions: {
                    where: {
                        status: 'APPROVED',
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
                },
                submittedRequests: {
                    where: {
                        type: 'OVERTIME',
                        status: 'Approved',
                        deletedAt: null,
                        ...(startDate && endDate ? {
                            startDate: {
                                gte: new Date(String(startDate)),
                                lt: new Date(new Date(String(endDate)).getTime() + 24 * 60 * 60 * 1000)
                            }
                        } : month && year ? {
                            startDate: {
                                gte: new Date(Number(year), Number(month) - 1, 1),
                                lt: new Date(Number(year), Number(month), 1)
                            }
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
                const attDateStr = new Date(att.date).toISOString().slice(0, 10);
                const daySchedule = emp.workSchedules?.find((ws) => new Date(ws.date).toISOString().slice(0, 10) === attDateStr);
                const activeShift = daySchedule?.shift || emp.shift;
                const expectedMins = activeShift ? getShiftMins(activeShift) : 8 * 60;
                if (activeShift) {
                    const [sH, sM] = activeShift.startTime.split(':').map(Number);
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
            // Calculate total approved overtime hours in the period
            let totalOvertimeHours = 0;
            if (Array.isArray(emp.submittedRequests)) {
                for (const req of emp.submittedRequests) {
                    if (req.endDate) {
                        const start = new Date(req.startDate);
                        const end = new Date(req.endDate);
                        const diffMs = end.getTime() - start.getTime();
                        totalOvertimeHours += diffMs / 3600000;
                    }
                }
            }
            // Offset underwork hours with overtime hours
            underworkHours = Math.max(0, underworkHours - totalOvertimeHours);
            let approvedLeaveDays = 0;
            if (Array.isArray(emp.leaves)) {
                for (const leave of emp.leaves) {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate || leave.startDate);
                    const diffMs = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
                    approvedLeaveDays += diffDays;
                }
            }
            if (Array.isArray(emp.permissions)) {
                approvedLeaveDays += emp.permissions.length;
            }
            const totalValidDays = totalPresent + approvedLeaveDays;
            let absentDays = 0;
            if (month && year) {
                const totalDaysInMonth = new Date(Number(year), Number(month), 0).getDate();
                absentDays = Math.max(0, totalDaysInMonth - totalValidDays);
            }
            else {
                // Fallback for custom date range
                let totalDays = 30;
                if (startDate && endDate) {
                    const start = new Date(String(startDate));
                    const end = new Date(String(endDate));
                    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    totalDays = diffDays;
                }
                absentDays = Math.max(0, totalDays - totalValidDays);
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
                const overtimeBonus = totalOvertimeHours * (rule.overtimeBonusPerHour || 0);
                totalDeduction = lateDeduction + underworkDeduction + absentDeduction;
                totalSalary = emp.baseSalary + overtimeBonus - totalDeduction;
            }
            return {
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
                shift: emp.shift?.name || '-',
                totalPresent,
                lateMins,
                underworkHours: underworkHours.toFixed(2),
                overtimeHours: totalOvertimeHours.toFixed(2),
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
