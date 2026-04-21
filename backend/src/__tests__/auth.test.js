const request = require('supertest');
const { app } = require('../server');
const { query } = require('../config/db');

// Mock DB and Redis for unit tests
jest.mock('../config/db');
jest.mock('../config/redis', () => ({
  connect: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('Auth API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    full_name: 'Test User',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', email: testUser.email, full_name: testUser.full_name, role: 'student' }] })
        .mockResolvedValueOnce({ rows: [] }) // profile insert
        .mockResolvedValueOnce({ rows: [] }); // refresh token insert

      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...testUser, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...testUser, password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject wrong credentials', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });
});

describe('Health Check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
