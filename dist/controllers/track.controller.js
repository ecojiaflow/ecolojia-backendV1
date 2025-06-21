"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAffiliateClick = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const trackAffiliateClick = async (req, res) => {
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
    }
    catch (error) {
        console.error('Erreur tracking affiliation :', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
exports.trackAffiliateClick = trackAffiliateClick;
