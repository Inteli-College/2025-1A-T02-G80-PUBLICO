import request from 'supertest';
import app from '../test-app.js';

describe('Endpoints da API', () => {
  
  // Teste 1: Health Check
  test('GET /health - deve retornar status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
      
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'Dalio AI');
    expect(response.body).toHaveProperty('version', '2.1.0');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Teste 2: Verificação do Webhook
  test('GET / - deve verificar webhook corretamente', async () => {
    const hubChallenge = 'test-challenge-123';
    const hubMode = 'subscribe';
    const verifyToken = 'test-verify-token'; // Mesmo token definido no topo
    
    const response = await request(app)
      .get('/')
      .query({
        'hub.mode': hubMode,
        'hub.challenge': hubChallenge,
        'hub.verify_token': verifyToken
      })
      .expect(200);
      
    expect(response.text).toBe(hubChallenge);
  });

  // Teste 3: Verificação do Webhook com token incorreto (403)
  test('GET / - deve retornar 403 com token incorreto', async () => {
    const hubChallenge = 'test-challenge-123';
    const hubMode = 'subscribe';
    const wrongToken = 'wrong-token';
    
    await request(app)
      .get('/')
      .query({
        'hub.mode': hubMode,
        'hub.challenge': hubChallenge,
        'hub.verify_token': wrongToken
      })
      .expect(403);
  });

  // Teste 4: Rota não encontrada (404)
  test('GET /rota-inexistente - deve retornar 404', async () => {
    const response = await request(app)
      .get('/rota-inexistente')
      .expect(404);
      
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Rota não encontrada');
    expect(response.body).toHaveProperty('path', '/rota-inexistente');
  });

});
