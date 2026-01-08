import { Router } from 'express';
import { analyzeOnboardingDocs } from '../services/onboarding.js';
import { analyzeEfficiency } from '../services/efficiency.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/onboarding', async (req, res) => {
    try {
        const { text } = req.body;
        const result = await analyzeOnboardingDocs(text);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to analyze onboarding document' });
    }
});

router.get('/efficiency/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get real transactions to analyze
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            take: 50,
            orderBy: { date: 'desc' }
        });

        const metrics = await analyzeEfficiency(transactions as any);
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate efficiency metrics' });
    }
});

export default router;
