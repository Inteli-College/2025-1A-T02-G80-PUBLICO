import { Router } from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/controller';

const router = Router();

// Rota para verificação do webhook (GET)
router.get('/', verifyWebhook);

// Rota para recebimento de mensagens (POST)
router.post('/', handleWebhook);

export default router;
