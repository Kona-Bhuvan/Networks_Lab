import { Router } from 'express';
import { getTokenHandler } from './controller';
const router = Router();

router.get('/', getTokenHandler);

export default router;