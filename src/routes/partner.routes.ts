import express from 'express';
import { trackAffiliateClick } from '../controllers/track.controller';

const router = express.Router();

router.get('/track/:id', trackAffiliateClick);

export default router;

