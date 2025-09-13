import express from 'express';
import dotenv from 'dotenv';
import routes from './src/routes/routes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(express.json());

// Middleware para logs básicos
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Usar as rotas
app.use('/', routes);

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
  });
});

// Middleware para tratamento de erros
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro na aplicação:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Inicializar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📱 WhatsApp Phone Number ID: 766776193182186`);
  console.log(`🎵 ElevenLabs configurado: ${process.env.ELEVENLABS_API_KEY ? 'Sim' : 'Não'}`);
  console.log(`🤖 OpenAI configurado: ${process.env.OPENAI_API_KEY ? 'Sim' : 'Não'}`);
  console.log(`⚡ Ambiente: ${process.env.NODE_ENV || 'development'}`);
});