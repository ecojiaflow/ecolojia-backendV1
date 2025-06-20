import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const trackAffiliateClick = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const link = await prisma.partnerLink.findUnique({
      where: { id },
      include: { partner: true },
    });

    if (!link || !link.active) {
      return res.status(404).json({ error: 'Lien partenaire introuvable ou inactif' });
    }

    await prisma.partnerLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    return res.redirect(302, link.url);
  } catch (error) {
    console.error('Erreur tracking affiliation :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};


