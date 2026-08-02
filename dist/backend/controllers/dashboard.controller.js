import { prisma } from '../lib/prisma.js';
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const jakartaParts = (date) => {
    const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes()
    };
};
const jakartaDayStart = (date) => {
    const { year, month, day } = jakartaParts(date);
    return new Date(Date.UTC(year, month, day) - JAKARTA_OFFSET_MS);
};
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const dayKey = (date) => {
    const { year, month, day } = jakartaParts(date);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const shiftBounds = (reference, shift) => {
    const parts = jakartaParts(reference);
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);
    const overnight = endHour * 60 + endMinute <= startHour * 60 + startMinute;
    let dayStart = jakartaDayStart(reference);
    // A clock-in after midnight and before an overnight shift ends belongs to
    // the shift that started on the previous local-calendar day.
    if (overnight && parts.hour * 60 + parts.minute <= endHour * 60 + endMinute) {
        dayStart = addDays(dayStart, -1);
    }
    const start = new Date(dayStart.getTime() + (startHour * 60 + startMinute) * 60 * 1000);
    let end = new Date(dayStart.getTime() + (endHour * 60 + endMinute) * 60 * 1000);
    if (overnight)
        end = addDays(end, 1);
    return { start, end };
};
const fullName = (employee) => `${employee.firstName} ${employee.lastName || ''}`.trim();
export const getDashboardSummary = async (_req, res) => {
    try {
        const now = new Date();
        const todayStart = jakartaDayStart(now);
        const tomorrowStart = addDays(todayStart, 1);
        const weekStart = addDays(todayStart, -6);
        const employees = await prisma.employee.findMany({
            where: {
                deletedAt: null,
                status: 'ACTIVE',
                user: { deletedAt: null, role: { name: { in: ['Karyawan', 'Staff'] } } }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                shift: { select: { id: true, name: true, startTime: true, endTime: true } },
                outlet: { select: { id: true, code: true, name: true } },
                workSchedules: {
                    where: { deletedAt: null, date: { gte: todayStart, lt: tomorrowStart } },
                    select: {
                        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
                        outlet: { select: { id: true, code: true, name: true } }
                    },
                    take: 1
                }
            }
        });
        const employeeIds = employees.map((employee) => employee.id);
        const attendances = employeeIds.length
            ? await prisma.attendance.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    deletedAt: null,
                    OR: [
                        { date: { gte: weekStart, lt: tomorrowStart } },
                        { clockOut: null }
                    ]
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            photoUrl: true,
                            shift: { select: { id: true, name: true, startTime: true, endTime: true } }
                        }
                    },
                    photos: {
                        where: { deletedAt: null },
                        select: { id: true, photoUrl: true, type: true, createdAt: true },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { date: 'desc' }
            })
            : [];
        const employeeShift = new Map(employees.map((employee) => [
            employee.id,
            employee.workSchedules[0]?.shift ?? employee.shift
        ]));
        const todayAttendances = attendances.filter((attendance) => attendance.date >= todayStart && attendance.date < tomorrowStart);
        const todayByEmployee = new Set(todayAttendances.map((attendance) => attendance.employeeId));
        const isLate = (attendance) => {
            if (!attendance.clockIn)
                return false;
            const shift = employeeShift.get(attendance.employeeId) ?? attendance.employee.shift;
            return attendance.status === 'LATE' || (!!shift && attendance.clockIn > shiftBounds(attendance.clockIn, shift).start);
        };
        const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
            const start = addDays(weekStart, index);
            const end = addDays(start, 1);
            const rows = attendances.filter((attendance) => attendance.date >= start && attendance.date < end);
            const presentIds = new Set(rows.map((attendance) => attendance.employeeId));
            const lateIds = new Set(rows.filter(isLate).map((attendance) => attendance.employeeId));
            return {
                date: dayKey(start),
                present: presentIds.size,
                late: lateIds.size
            };
        });
        const activeAttendances = attendances.filter((attendance) => !attendance.clockOut && attendance.clockIn);
        const workingNow = activeAttendances.map((attendance) => {
            const shift = employeeShift.get(attendance.employeeId) ?? attendance.employee.shift;
            const selfie = attendance.photos.find((photo) => photo.type === 'CLOCK_IN');
            return {
                attendanceId: attendance.id,
                employeeId: attendance.employeeId,
                employeeName: fullName(attendance.employee),
                employeePhotoUrl: attendance.employee.photoUrl,
                shift: shift
                    ? { name: shift.name, startTime: shift.startTime, endTime: shift.endTime }
                    : null,
                clockIn: attendance.clockIn.toISOString(),
                elapsedMinutes: Math.max(0, Math.floor((now.getTime() - attendance.clockIn.getTime()) / 60000)),
                selfieUrl: selfie?.photoUrl ?? null
            };
        });
        const eventRows = attendances.flatMap((attendance) => {
            const clockInPhoto = attendance.photos.find((photo) => photo.type === 'CLOCK_IN');
            const clockOutPhoto = attendance.photos.find((photo) => photo.type === 'CLOCK_OUT');
            const common = {
                employeeId: attendance.employeeId,
                employeeName: fullName(attendance.employee),
            };
            const events = [];
            if (attendance.clockIn) {
                events.push({
                    id: `${attendance.id}-in`,
                    ...common,
                    action: 'CHECK_IN',
                    timestamp: attendance.clockIn.toISOString(),
                    status: isLate(attendance) ? 'LATE' : 'ON_TIME',
                    photoUrl: clockInPhoto?.photoUrl ?? null
                });
            }
            if (attendance.clockOut) {
                events.push({
                    id: `${attendance.id}-out`,
                    ...common,
                    action: 'CHECK_OUT',
                    timestamp: attendance.clockOut.toISOString(),
                    status: 'COMPLETED',
                    photoUrl: clockOutPhoto?.photoUrl ?? null
                });
            }
            return events;
        });
        const todayEvents = eventRows.filter((event) => {
            const timestamp = new Date(event.timestamp);
            return timestamp >= todayStart && timestamp < tomorrowStart;
        });
        const recentActivity = (todayEvents.length ? todayEvents : eventRows)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 8);
        const activeAttendanceByEmployee = new Map(activeAttendances.map((attendance) => [attendance.employeeId, attendance]));
        const completedByEmployee = new Map(todayAttendances
            .filter((attendance) => attendance.clockOut)
            .map((attendance) => [attendance.employeeId, attendance]));
        const todayShifts = employees
            .map((employee) => {
            const shift = employeeShift.get(employee.id);
            if (!shift)
                return null;
            const active = activeAttendanceByEmployee.get(employee.id);
            const completed = completedByEmployee.get(employee.id);
            const bounds = shiftBounds(now, shift);
            let status = 'PENDING';
            if (active)
                status = 'WORKING';
            else if (completed)
                status = 'COMPLETED';
            else if (now > bounds.end)
                status = 'ABSENT';
            const activeOutlet = employee.workSchedules[0]?.outlet || employee.outlet;
            return {
                employeeId: employee.id,
                employeeName: fullName(employee),
                employeePhotoUrl: employee.photoUrl,
                outletCode: activeOutlet?.code || 'SELON-1',
                outletName: activeOutlet?.name || 'Selon 1',
                shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
                status
            };
        })
            .filter((item) => item !== null)
            .sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime));
        const expectedTodayIds = new Set(todayShifts.map((item) => item.employeeId));
        const absentToday = [...expectedTodayIds].filter((id) => !todayByEmployee.has(id)).length;
        const presentToday = new Set(todayAttendances.map((attendance) => attendance.employeeId)).size;
        const lateToday = new Set(todayAttendances.filter(isLate).map((attendance) => attendance.employeeId)).size;
        return res.json({
            generatedAt: now.toISOString(),
            timezone: 'Asia/Jakarta',
            stats: {
                totalEmployees: employees.length,
                presentToday,
                currentlyWorking: workingNow.length,
                lateToday,
                absentToday,
                absentDefinition: 'Karyawan aktif yang memiliki shift hari ini tetapi belum memiliki catatan absensi hari ini.'
            },
            weeklyTrend,
            recentActivity,
            workingNow,
            todayShifts
        });
    }
    catch (error) {
        console.error('Gagal memuat ringkasan dashboard:', error);
        return res.status(500).json({ message: 'Gagal memuat ringkasan dashboard.' });
    }
};
