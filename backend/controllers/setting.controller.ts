import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getLocationSettings = async (req: Request, res: Response) => {
  try {
    let loc = await prisma.locationSetting.findFirst();
    if (!loc) {
      loc = await prisma.locationSetting.create({
        data: {
          name: 'KOPI SELON',
          latitude: -7.1643,
          longitude: 113.4800,
          radius: 50
        }
      });
    }
    res.json(loc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location settings' });
  }
};

export const updateLocationSettings = async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    let loc = await prisma.locationSetting.findFirst();
    if (loc) {
      loc = await prisma.locationSetting.update({
        where: { id: loc.id },
        data: { name, latitude: Number(latitude), longitude: Number(longitude), radius: Number(radius) }
      });
    } else {
      loc = await prisma.locationSetting.create({
        data: { name, latitude: Number(latitude), longitude: Number(longitude), radius: Number(radius) }
      });
    }
    res.json(loc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location settings' });
  }
};

export const getGeneralSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    let tolerance = settings.find(s => s.key === 'LATE_TOLERANCE_MINUTES');
    if (!tolerance) {
      tolerance = await prisma.setting.create({
        data: { key: 'LATE_TOLERANCE_MINUTES', value: '15', description: 'Toleransi Keterlambatan (Menit)' }
      });
      settings.push(tolerance);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch general settings' });
  }
};

export const updateGeneralSettings = async (req: Request, res: Response) => {
  try {
    const { LATE_TOLERANCE_MINUTES } = req.body;
    if (LATE_TOLERANCE_MINUTES !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'LATE_TOLERANCE_MINUTES' },
        update: { value: String(LATE_TOLERANCE_MINUTES) },
        create: { key: 'LATE_TOLERANCE_MINUTES', value: String(LATE_TOLERANCE_MINUTES), description: 'Toleransi Keterlambatan (Menit)' }
      });
    }
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update general settings' });
  }
};
