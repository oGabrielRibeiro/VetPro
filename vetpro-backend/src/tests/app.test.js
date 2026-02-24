const request = require('supertest');
const app = require('../app');

describe('App', () => {
  it('should respond with a 200 status code on the /health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
  });

  it('should respond with a JSON object containing { ok: true } on the /health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should respond with a welcome message on the base / endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'VetPro API rodando 🚀');
  });
});
