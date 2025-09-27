import express from 'express';
import routes from './routes/routes';

// App de teste sem inicializar servidor
const app = express();

// Middlewares básicos
app.use(express.json());

// Rotas
app.use('/', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
  });
});

export default app;
