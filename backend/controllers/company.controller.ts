import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getCompanyProfile = async (req: Request, res: Response) => {
  try {
    let profile = await prisma.companyProfile.findFirst();
    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: {
          name: 'KOPI SELON',
          hours: '24 Jam'
        }
      });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
};

export const updateCompanyProfile = async (req: Request, res: Response) => {
  try {
    const { name, address, phone, email, hours, about, mapsLink } = req.body;
    let profile = await prisma.companyProfile.findFirst();
    
    // Logo upload
    let logoUrl = profile?.logoUrl;
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    }

    if (profile) {
      profile = await prisma.companyProfile.update({
        where: { id: profile.id },
        data: { name, address, phone, email, hours, about, mapsLink, logoUrl }
      });
    } else {
      profile = await prisma.companyProfile.create({
        data: { name, address, phone, email, hours, about, mapsLink, logoUrl }
      });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company profile' });
  }
};
