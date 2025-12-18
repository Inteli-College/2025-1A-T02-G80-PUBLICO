import { Router } from 'express';
import { 
  verifyWebhook, 
  handleWebhook,
  healthCheck
} from '../controllers/controller.js';

const router = Router();

// Rota para verificação do webhook (GET)
router.get('/', verifyWebhook);

// Rota para recebimento de mensagens (POST)
router.post('/', handleWebhook);

// Rota de health check
router.get('/health', healthCheck);

export default router;
