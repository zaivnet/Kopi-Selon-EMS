import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// Helper to format sequence number REQ-YYYYMMDD-XXXX
async function generateRequestNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `REQ-${dateStr}-`;

  const countToday = await prisma.employeeRequest.count({
    where: {
      requestNumber: {
        startsWith: prefix,
      },
    },
  });

  const seq = String(countToday + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role?.name === 'Administrator';
    const canApproveRequests = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('request_center.approve'));
    const userEmployeeId = req.user?.employee?.id;
    const { type, status, search } = req.query;

    const whereClause: any = {
      deletedAt: null,
    };

    // Non-approvers should only see their own requests or swap requests targeting them.
    if (!canApproveRequests) {
      if (!userEmployeeId) {
        return res.json([]);
      }
      whereClause.OR = [
        { employeeId: userEmployeeId },
        { targetEmployeeId: userEmployeeId },
      ];
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      whereClause.type = type;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const query = search.trim();
      whereClause.AND = [
        {
          OR: [
            { requestNumber: { contains: query } },
            { reason: { contains: query } },
            { employee: { firstName: { contains: query } } },
            { employee: { lastName: { contains: query } } },
          ],
        },
      ];
    }

    const requests = await prisma.employeeRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            shift: true,
            user: { select: { username: true } },
          },
        },
        targetEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            shift: true,
          },
        },
        targetShift: true,
        reviewerUser: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
        timelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    console.error('getRequests error:', error);
    res.status(500).json({ message: 'Gagal mengambil data permintaan.' });
  }
};

export const getRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.employeeRequest.findUnique({
      where: { id: id as string },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            shift: true,
            user: { select: { username: true } },
          },
        },
        targetEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            shift: true,
          },
        },
        targetShift: true,
        reviewerUser: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
        timelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request || request.deletedAt) {
      return res.status(404).json({ message: 'Permintaan tidak ditemukan.' });
    }

    // Get audit logs for this request
    const auditLogs = await prisma.activityLog.findMany({
      where: {
        entity: 'EmployeeRequest',
        entityId: request.id,
      },
      include: {
        user: { select: { username: true, role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ...request, auditLogs });
  } catch (error) {
    console.error('getRequestById error:', error);
    res.status(500).json({ message: 'Gagal mengambil detail permintaan.' });
  }
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const requesterEmployee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      include: { shift: true },
    });

    if (!requesterEmployee) {
      return res.status(400).json({ message: 'Profil karyawan tidak ditemukan untuk akun ini.' });
    }

    const {
      type,
      permissionType,
      startDate,
      endDate,
      targetShiftId,
      targetEmployeeId,
      reason,
      attachmentUrl,
      isDraft,
    } = req.body;

    if (!type || !reason || !startDate) {
      return res.status(400).json({ message: 'Jenis permintaan, tanggal, dan alasan wajib diisi.' });
    }

    const requestNumber = await generateRequestNumber();
    const startDateTime = new Date(startDate);
    const endDateTime = endDate ? new Date(endDate) : startDateTime;

    let initialStatus = 'Submitted';
    let peerStatus: string | null = null;

    if (isDraft) {
      initialStatus = 'Draft';
    } else if (type === 'SWAP_SHIFT') {
      if (!targetEmployeeId) {
        return res.status(400).json({ message: 'Rekan kerja wajib dipilih untuk Tukar Shift.' });
      }
      if (targetEmployeeId === requesterEmployee.id) {
        return res.status(400).json({ message: 'Tidak dapat menukar shift dengan diri sendiri.' });
      }
      initialStatus = 'Waiting Employee Approval';
      peerStatus = 'PENDING';
    } else {
      initialStatus = 'Waiting Staff Approval';
    }

    const newRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.employeeRequest.create({
        data: {
          requestNumber,
          employeeId: requesterEmployee.id,
          type,
          permissionType: type === 'PERMISSION' ? permissionType || 'ABSENT' : null,
          startDate: startDateTime,
          endDate: endDateTime,
          currentShiftId: requesterEmployee.shiftId,
          targetShiftId: type === 'CHANGE_SHIFT' ? targetShiftId : null,
          targetEmployeeId: type === 'SWAP_SHIFT' ? targetEmployeeId : null,
          peerStatus,
          reason,
          attachmentUrl: attachmentUrl || null,
          status: initialStatus,
        },
        include: {
          employee: true,
          targetEmployee: true,
          targetShift: true,
        },
      });

      // Construct Initial Approval Timelines
      const actorName = `${requesterEmployee.firstName} ${requesterEmployee.lastName || ''}`.trim();

      await tx.requestTimeline.create({
        data: {
          requestId: created.id,
          stepName: 'Pengajuan Dibuat',
          status: 'COMPLETED',
          actorName,
          actorRole: req.user?.role?.name || 'Karyawan',
          comment: `Mengajukan permintaan ${type} (${requestNumber})`,
        },
      });

      if (type === 'SWAP_SHIFT' && !isDraft) {
        const peer = await tx.employee.findUnique({ where: { id: targetEmployeeId } });
        const peerName = peer ? `${peer.firstName} ${peer.lastName || ''}`.trim() : 'Rekan Kerja';
        
        await tx.requestTimeline.create({
          data: {
            requestId: created.id,
            stepName: 'Persetujuan Rekan Kerja',
            status: 'PENDING',
            actorName: peerName,
            actorRole: 'Rekan Kerja',
            comment: 'Menunggu konfirmasi tukar shift dari rekan kerja',
          },
        });

        await tx.requestTimeline.create({
          data: {
            requestId: created.id,
            stepName: 'Persetujuan Staff / Admin',
            status: 'PENDING',
            actorName: 'Staff / Administrator',
            actorRole: 'Staff',
            comment: 'Menunggu persetujuan akhir dari manajemen',
          },
        });
      } else if (!isDraft) {
        await tx.requestTimeline.create({
          data: {
            requestId: created.id,
            stepName: 'Persetujuan Staff / Admin',
            status: 'PENDING',
            actorName: 'Staff / Administrator',
            actorRole: 'Staff',
            comment: 'Menunggu persetujuan dari Staff atau Administrator',
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId,
          action: 'CREATE_REQUEST',
          entity: 'EmployeeRequest',
          entityId: created.id,
          details: `Membuat permintaan ${type} (${requestNumber}) status ${initialStatus}`,
        },
      });

      return created;
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('createRequest error:', error);
    res.status(500).json({ message: 'Gagal membuat permintaan.' });
  }
};

export const respondPeerSwap = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action: 'ACCEPT' or 'REJECT'
    const userId = req.user?.id;
    const currentEmployee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
    });

    if (!currentEmployee) {
      return res.status(403).json({ message: 'Akses ditolak: Profil karyawan tidak ditemukan.' });
    }

    const request = await prisma.employeeRequest.findUnique({
      where: { id: id as string },
      include: { employee: true, targetEmployee: true },
    });

    if (!request || request.deletedAt) {
      return res.status(404).json({ message: 'Permintaan tidak ditemukan.' });
    }

    if (request.type !== 'SWAP_SHIFT') {
      return res.status(400).json({ message: 'Hanya permintaan Tukar Shift yang memerlukan respon rekan kerja.' });
    }

    if (request.targetEmployeeId !== currentEmployee.id) {
      return res.status(403).json({ message: 'Anda bukan rekan kerja yang dituju dalam permintaan tukar shift ini.' });
    }

    if (request.status !== 'Waiting Employee Approval') {
      return res.status(400).json({ message: `Permintaan tidak dalam status menunggu persetujuan rekan (Status saat ini: ${request.status}).` });
    }

    const isAccept = action === 'ACCEPT';
    const newPeerStatus = isAccept ? 'ACCEPTED' : 'REJECTED';
    const newStatus = isAccept ? 'Waiting Staff Approval' : 'Rejected';
    const actorName = `${currentEmployee.firstName} ${currentEmployee.lastName || ''}`.trim();

    await prisma.$transaction(async (tx) => {
      await tx.employeeRequest.update({
        where: { id: request.id },
        data: {
          peerStatus: newPeerStatus,
          peerRespondedAt: new Date(),
          peerNote: note || null,
          status: newStatus,
        },
      });

      // Update peer timeline step
      const peerTimeline = await tx.requestTimeline.findFirst({
        where: { requestId: request.id, stepName: 'Persetujuan Rekan Kerja' },
      });

      if (peerTimeline) {
        await tx.requestTimeline.update({
          where: { id: peerTimeline.id },
          data: {
            status: isAccept ? 'COMPLETED' : 'REJECTED',
            actorName,
            comment: note || (isAccept ? 'Menyetujui permintaan tukar shift' : 'Menolak permintaan tukar shift'),
            actionAt: new Date(),
          },
        });
      }

      if (!isAccept) {
        // Mark remaining steps as SKIPPED
        await tx.requestTimeline.updateMany({
          where: { requestId: request.id, status: 'PENDING' },
          data: { status: 'SKIPPED' },
        });
      }

      await tx.activityLog.create({
        data: {
          userId,
          action: isAccept ? 'PEER_ACCEPT_SWAP' : 'PEER_REJECT_SWAP',
          entity: 'EmployeeRequest',
          entityId: request.id,
          details: `Rekan kerja ${actorName} ${isAccept ? 'menyetujui' : 'menolak'} tukar shift (${request.requestNumber})`,
        },
      });
    });

    res.json({ message: `Permintaan tukar shift berhasil ${isAccept ? 'disetujui' : 'ditolak'}.` });
  } catch (error) {
    console.error('respondPeerSwap error:', error);
    res.status(500).json({ message: 'Gagal memproses respon tukar shift.' });
  }
};

export const approveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewerNote } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role?.name;

    const isAdmin = req.user?.role?.name === 'Administrator';
    const canApprove = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('request_center.approve'));
    if (!canApprove) {
      return res.status(403).json({ message: 'Hanya pengguna dengan izin persetujuan yang dapat memberikan persetujuan.' });
    }

    const request = await prisma.employeeRequest.findUnique({
      where: { id: id as string },
      include: {
        employee: { include: { shift: true } },
        targetEmployee: { include: { shift: true } },
        targetShift: true,
      },
    });

    if (!request || request.deletedAt) {
      return res.status(404).json({ message: 'Permintaan tidak ditemukan.' });
    }

    if (request.status === 'Approved') {
      return res.status(400).json({ message: 'Permintaan ini sudah disetujui sebelumnya.' });
    }

    if (request.status !== 'Waiting Staff Approval') {
      return res.status(400).json({ message: `Permintaan belum siap untuk disetujui (Status: ${request.status}).` });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Request status to Approved
      await tx.employeeRequest.update({
        where: { id: request.id },
        data: {
          status: 'Approved',
          reviewerId: userId,
          reviewerNote: reviewerNote || null,
          reviewedAt: new Date(),
        },
      });

      // 2. Update Timeline
      const staffTimeline = await tx.requestTimeline.findFirst({
        where: { requestId: request.id, stepName: 'Persetujuan Staff / Admin' },
      });

      if (staffTimeline) {
        await tx.requestTimeline.update({
          where: { id: staffTimeline.id },
          data: {
            status: 'COMPLETED',
            actorName: req.user?.username || 'Staff',
            actorRole: userRole,
            comment: reviewerNote || 'Disetujui oleh manajemen',
            actionAt: new Date(),
          },
        });
      }

      await tx.requestTimeline.create({
        data: {
          requestId: request.id,
          stepName: 'Selesai & Diperbarui',
          status: 'COMPLETED',
          actorName: 'Sistem',
          actorRole: 'SYSTEM',
          comment: 'Jadwal dan status sistem berhasil diperbarui secara otomatis.',
        },
      });

      // 3. AUTOMATED INTEGRATION WITH SHIFT ASSIGNMENT / LEAVE / PERMISSION
      const targetDate = new Date(request.startDate);
      // Normalize target date to midnight UTC/Local
      const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

      if (request.type === 'CHANGE_SHIFT' && request.targetShiftId) {
        // Upsert WorkSchedule for employee on this date
        const existingSchedule = await tx.workSchedule.findFirst({
          where: {
            employeeId: request.employeeId,
            date: dateOnly,
            deletedAt: null,
          },
        });

        if (existingSchedule) {
          await tx.workSchedule.update({
            where: { id: existingSchedule.id },
            data: { shiftId: request.targetShiftId },
          });
        } else {
          await tx.workSchedule.create({
            data: {
              employeeId: request.employeeId,
              shiftId: request.targetShiftId,
              date: dateOnly,
            },
          });
        }
      } else if (request.type === 'SWAP_SHIFT' && request.targetEmployeeId) {
        // Swap shift assignment for requester and target employee on target date
        const reqSchedule = await tx.workSchedule.findFirst({
          where: { employeeId: request.employeeId, date: dateOnly, deletedAt: null },
        });

        const targetSchedule = await tx.workSchedule.findFirst({
          where: { employeeId: request.targetEmployeeId, date: dateOnly, deletedAt: null },
        });

        const reqShiftId = reqSchedule?.shiftId || request.employee.shiftId;
        const targetShiftId = targetSchedule?.shiftId || request.targetEmployee?.shiftId;

        if (targetShiftId) {
          if (reqSchedule) {
            await tx.workSchedule.update({
              where: { id: reqSchedule.id },
              data: { shiftId: targetShiftId },
            });
          } else {
            await tx.workSchedule.create({
              data: {
                employeeId: request.employeeId,
                shiftId: targetShiftId,
                date: dateOnly,
              },
            });
          }
        }

        if (reqShiftId) {
          if (targetSchedule) {
            await tx.workSchedule.update({
              where: { id: targetSchedule.id },
              data: { shiftId: reqShiftId },
            });
          } else {
            await tx.workSchedule.create({
              data: {
                employeeId: request.targetEmployeeId,
                shiftId: reqShiftId,
                date: dateOnly,
              },
            });
          }
        }
      } else if (request.type === 'LEAVE' || request.type === 'SICK_LEAVE') {
        await tx.leave.create({
          data: {
            employeeId: request.employeeId,
            type: request.type === 'SICK_LEAVE' ? 'SICK' : 'ANNUAL',
            startDate: request.startDate,
            endDate: request.endDate || request.startDate,
            reason: request.reason,
            status: 'APPROVED',
          },
        });
      } else if (request.type === 'PERMISSION') {
        await tx.permission.create({
          data: {
            employeeId: request.employeeId,
            date: request.startDate,
            reason: `${request.permissionType || 'PERMIT'}: ${request.reason}`,
            status: 'APPROVED',
          },
        });
      }

      // 4. Log Audit
      await tx.activityLog.create({
        data: {
          userId,
          action: 'APPROVE_REQUEST',
          entity: 'EmployeeRequest',
          entityId: request.id,
          details: `Staff/Admin menyetujui permintaan ${request.type} (${request.requestNumber}) dan memperbarui jadwal kerja otomatis.`,
        },
      });
    });

    res.json({ message: 'Permintaan berhasil disetujui dan jadwal telah diperbarui otomatis.' });
  } catch (error) {
    console.error('approveRequest error:', error);
    res.status(500).json({ message: 'Gagal menyetujui permintaan.' });
  }
};

export const rejectRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewerNote } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role?.name;

    const isAdmin = req.user?.role?.name === 'Administrator';
    const canApprove = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('request_center.approve'));
    if (!canApprove) {
      return res.status(403).json({ message: 'Hanya pengguna dengan izin persetujuan yang dapat menolak permintaan.' });
    }

    const request = await prisma.employeeRequest.findUnique({
      where: { id: id as string },
    });

    if (!request || request.deletedAt) {
      return res.status(404).json({ message: 'Permintaan tidak ditemukan.' });
    }

    if (['Approved', 'Rejected', 'Cancelled'].includes(request.status)) {
      return res.status(400).json({ message: `Permintaan sudah diproses (Status: ${request.status}).` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employeeRequest.update({
        where: { id: request.id },
        data: {
          status: 'Rejected',
          reviewerId: userId,
          reviewerNote: reviewerNote || null,
          reviewedAt: new Date(),
        },
      });

      const staffTimeline = await tx.requestTimeline.findFirst({
        where: { requestId: request.id, stepName: 'Persetujuan Staff / Admin' },
      });

      if (staffTimeline) {
        await tx.requestTimeline.update({
          where: { id: staffTimeline.id },
          data: {
            status: 'REJECTED',
            actorName: req.user?.username || 'Staff',
            actorRole: userRole,
            comment: reviewerNote || 'Ditolak oleh manajemen',
            actionAt: new Date(),
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId,
          action: 'REJECT_REQUEST',
          entity: 'EmployeeRequest',
          entityId: request.id,
          details: `Staff/Admin menolak permintaan ${request.type} (${request.requestNumber})`,
        },
      });
    });

    res.json({ message: 'Permintaan berhasil ditolak.' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ message: 'Gagal menolak permintaan.' });
  }
};

export const cancelRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userEmployeeId = req.user?.employee?.id;

    const request = await prisma.employeeRequest.findUnique({
      where: { id: id as string },
    });

    if (!request || request.deletedAt) {
      return res.status(404).json({ message: 'Permintaan tidak ditemukan.' });
    }

    const isAdmin = req.user?.role?.name === 'Administrator';
    const canManageAllRequests = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('request_center.approve'));
  if (request.employeeId !== userEmployeeId && !canManageAllRequests) {
      return res.status(403).json({ message: 'Anda hanya dapat membatalkan permintaan yang Anda buat sendiri.' });
    }

    if (['Approved', 'Rejected', 'Cancelled'].includes(request.status)) {
      return res.status(400).json({ message: `Permintaan tidak dapat dibatalkan (Status: ${request.status}).` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employeeRequest.update({
        where: { id: request.id },
        data: { status: 'Cancelled' },
      });

      await tx.requestTimeline.updateMany({
        where: { requestId: request.id, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      });

      await tx.requestTimeline.create({
        data: {
          requestId: request.id,
          stepName: 'Dibatalkan',
          status: 'COMPLETED',
          actorName: req.user?.username || 'Karyawan',
          actorRole: req.user?.role?.name || 'Karyawan',
          comment: 'Permintaan dibatalkan oleh pemohon.',
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: 'CANCEL_REQUEST',
          entity: 'EmployeeRequest',
          entityId: request.id,
          details: `Pemohon membatalkan permintaan (${request.requestNumber})`,
        },
      });
    });

    res.json({ message: 'Permintaan berhasil dibatalkan.' });
  } catch (error) {
    console.error('cancelRequest error:', error);
    res.status(500).json({ message: 'Gagal membatalkan permintaan.' });
  }
};

export const getPendingCount = async (req: AuthRequest, res: Response) => {
  try {
    const userEmployeeId = req.user?.employee?.id;
    const isAdmin = req.user?.role?.name === 'Administrator';
    const canApproveRequests = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('request_center.approve'));

    let peerPendingCount = 0;
    let staffPendingCount = 0;

    if (userEmployeeId) {
      peerPendingCount = await prisma.employeeRequest.count({
        where: {
          targetEmployeeId: userEmployeeId,
          status: 'Waiting Employee Approval',
          deletedAt: null,
        },
      });
    }

    if (canApproveRequests) {
      staffPendingCount = await prisma.employeeRequest.count({
        where: {
          status: 'Waiting Staff Approval',
          deletedAt: null,
        },
      });
    }

    const totalBadgeCount = peerPendingCount + staffPendingCount;

    res.json({
      totalBadgeCount,
      peerPendingCount,
      staffPendingCount,
    });
  } catch (error) {
    console.error('getPendingCount error:', error);
    res.status(500).json({ message: 'Gagal mengambil jumlah notifikasi pending.' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        entity: 'EmployeeRequest',
      },
      include: {
        user: { select: { username: true, role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ message: 'Gagal mengambil audit log.' });
  }
};

export const getEligibleSwapPeers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const currentEmployee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      include: { shift: true },
    });

    if (!currentEmployee) {
      return res.status(400).json({ message: 'Profil karyawan tidak ditemukan.' });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const dateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Fetch active employees except current user
    const activeEmployees = await prisma.employee.findMany({
      where: {
        id: { not: currentEmployee.id },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        shift: true,
        workSchedules: {
          where: {
            date: { gte: dateStart, lte: dateEnd },
            deletedAt: null,
          },
          include: { shift: true },
        },
      },
    });

    // 2. Fetch approved leaves covering target date
    const leavesOnDate = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: dateEnd },
        endDate: { gte: dateStart },
        deletedAt: null,
      },
    });
    const leaveEmployeeIds = new Set(leavesOnDate.map((l) => l.employeeId));

    // 3. Fetch approved permissions on target date
    const permissionsOnDate = await prisma.permission.findMany({
      where: {
        status: 'APPROVED',
        date: { gte: dateStart, lte: dateEnd },
        deletedAt: null,
      },
    });
    const permissionEmployeeIds = new Set(permissionsOnDate.map((p) => p.employeeId));

    // 4. Fetch attendances already checked in on target date
    const attendancesOnDate = await prisma.attendance.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
        clockIn: { not: null },
        deletedAt: null,
      },
    });
    const checkedInEmployeeIds = new Set(attendancesOnDate.map((a) => a.employeeId));

    // 5. Fetch active swap requests on target date
    const activeSwapRequests = await prisma.employeeRequest.findMany({
      where: {
        type: 'SWAP_SHIFT',
        status: { in: ['Submitted', 'Waiting Employee Approval', 'Waiting Staff Approval'] },
        startDate: { gte: dateStart, lte: dateEnd },
        deletedAt: null,
      },
    });
    const activeSwapEmployeeIds = new Set<string>();
    activeSwapRequests.forEach((r) => {
      activeSwapEmployeeIds.add(r.employeeId);
      if (r.targetEmployeeId) activeSwapEmployeeIds.add(r.targetEmployeeId);
    });

    // Filter eligible peers based on criteria
    const eligiblePeers = activeEmployees
      .filter((emp) => {
        const effectiveShift = emp.workSchedules[0]?.shift || emp.shift;
        // Criteria 1: Must have a shift schedule on that date
        if (!effectiveShift) return false;

        // Criteria 4 & 6: Not on leave / sick leave
        if (leaveEmployeeIds.has(emp.id)) return false;

        // Criteria 5: Not on permission
        if (permissionEmployeeIds.has(emp.id)) return false;

        // Criteria 7: Has not checked in yet
        if (checkedInEmployeeIds.has(emp.id)) return false;

        // Criteria 8: Does not have active request swap on that date
        if (activeSwapEmployeeIds.has(emp.id)) return false;

        return true;
      })
      .map((emp) => {
        const effectiveShift = emp.workSchedules[0]?.shift || emp.shift;
        return {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          photoUrl: emp.photoUrl,
          shift: effectiveShift,
        };
      });

    res.json(eligiblePeers);
  } catch (error) {
    console.error('getEligibleSwapPeers error:', error);
    res.status(500).json({ message: 'Gagal mengambil daftar rekan kerja.' });
  }
};
