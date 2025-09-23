import express from 'express';
import dotenv from 'dotenv';
import routes from './src/routes/routes';
import { testConnection, initializeTables } from './src/database';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Função para inicializar o banco de dados
async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Inicializando banco de dados...');
    
    // Testar conexão
    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️ Não foi possível conectar ao PostgreSQL. Continuando sem persistência...');
      return;
    }
    
    // Inicializar tabelas
    await initializeTables();
    console.log('✅ Banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    console.warn('⚠️ Continuando sem persistência de mensagens...');
  }
}

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
async function startServer(): Promise<void> {
  try {
    // Inicializar banco de dados primeiro
    await initializeDatabase();
    
    // Iniciar servidor
    app.listen(port, () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar aplicação
startServer();