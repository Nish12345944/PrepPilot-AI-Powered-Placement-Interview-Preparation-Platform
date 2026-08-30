const request = require('supertest');
const jwt = require('jsonwebtoken');

// Must be set before the server (and auth controller) are required.
process.env.JWT_SECRET = 'integration-test-secret';
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';

const { app } = require('../server');
const { query } = require('../config/db');

jest.mock('../config/db');
jest.mock('axios');

jest.mock('../config/redis', () => ({
  connect: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  del: jest.fn(),
}));

// Helper: return a user row for the auth lookup and empty rows otherwise.
const USER = { id: 'user-1', email: 'a@b.c', role: 'student', full_name: 'A' };
const authOrEmpty = (text) => {
  if (text.includes('FROM users WHERE id =')) return { rows: [USER] };
  return { rows: [] };
};

beforeEach(() => {
  query.mockReset();
  query.mockImplementation((text) => Promise.resolve(authOrEmpty(text)));
});

const authHeaders = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: USER.id }, process.env.JWT_SECRET)}`,
});

describe('Protected endpoints', () => {
  it.each([
    ['GET', '/api/profile'],
    ['GET', '/api/dashboard'],
    ['GET', '/api/chat/sessions'],
    ['GET', '/api/planner/today'],
    ['GET', '/api/notifications'],
    ['GET', '/api/gamification/achievements'],
  ])('%s %s returns 401 without a token', async (method, url) => {
    const res = await request(app)[method.toLowerCase()](url);
    expect(res.status).toBe(401);
  });
});

describe('Ownership / authorization', () => {
  it("GET /api/chat/sessions/:id/messages rejects another user's session", async () => {
    const res = await request(app)
      .get('/api/chat/sessions/foreign-session/messages')
      .set(authHeaders());
    expect(res.status).toBe(404);
  });

  it('POST /api/chat/message with a foreign session_id is rejected', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .set(authHeaders())
      .send({ session_id: 'foreign-session', message: 'hello' });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/planner/tasks/:id cannot update another user's task", async () => {
    const res = await request(app)
      .patch('/api/planner/tasks/foreign-task')
      .set(authHeaders())
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  it("POST /api/interview/sessions/:id/respond cannot target another user's session", async () => {
    const res = await request(app)
      .post('/api/interview/sessions/foreign-session/respond')
      .set(authHeaders())
      .send({ question_id: 'q1', user_answer: 'answer', session_type: 'technical' });
    expect(res.status).toBe(404);
  });

  it('POST /api/chat/message rejects an empty message', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .set(authHeaders())
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('GET /api/notifications/:id/read (foreign) returns 404', async () => {
    const res = await request(app)
      .post('/api/notifications/foreign/read')
      .set(authHeaders());
    expect(res.status).toBe(404);
  });
});

describe('Refresh token', () => {
  it('POST /api/auth/refresh with invalid token returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh without token returns 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});

describe('Password reset', () => {
  it('POST /api/auth/forgot-password always returns a generic 200 message', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
  });

  it('POST /api/auth/forgot-password rejects a malformed email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nope' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/reset-password rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ userId: '11111111-1111-1111-1111-111111111111', token: 'x', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('Interview session validation', () => {
  it('POST /api/interview/sessions validates session_type', async () => {
    const res = await request(app)
      .post('/api/interview/sessions')
      .set(authHeaders())
      .send({ session_type: 'not-a-type', question_count: 5 });
    expect(res.status).toBe(400);
  });

  it('POST /api/interview/sessions rejects out-of-range question_count', async () => {
    const res = await request(app)
      .post('/api/interview/sessions')
      .set(authHeaders())
      .send({ session_type: 'technical', question_count: 9999 });
    expect(res.status).toBe(400);
  });
});

describe('Coding submission normalisation', () => {
  const axios = require('axios');

  it('returns parsed test_results and passed/total for an accepted submission', async () => {
    const judgeResult = {
      status: 'accepted',
      test_results: JSON.stringify([
        { passed: true, output: 'x', expected: 'x' },
        { passed: true, output: 'y', expected: 'y' },
      ]),
      ai_feedback: JSON.stringify({ time_complexity: 'O(n)' }),
      runtime_ms: 12,
      memory_kb: 1000,
      compile_error: null,
    };
    axios.post.mockResolvedValueOnce({ data: judgeResult });

    query
      .mockImplementationOnce(() => Promise.resolve({ rows: [USER] }))
      .mockImplementationOnce(() => Promise.resolve({
        rows: [{ cp_id: 'cp-1', test_cases: JSON.stringify([{ input: '1' }]) }],
      }))
      .mockImplementationOnce(() => Promise.resolve({
        rows: [{ id: 'sub-1', status: 'accepted', problem_id: 'cp-1' }],
      }));

    const res = await request(app)
      .post('/api/coding/submit')
      .set(authHeaders())
      .send({ problem_id: 'q-1', language: 'python', code: 'print(1)' });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(2);
    expect(res.body.total).toBe(2);
    expect(Array.isArray(res.body.test_results)).toBe(true);
    expect(res.body.ai_feedback).toEqual({ time_complexity: 'O(n)' });
  });

  it('returns 502 when the code judge is unreachable', async () => {
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    query
      .mockImplementationOnce(() => Promise.resolve({ rows: [USER] }))
      .mockImplementationOnce(() => Promise.resolve({
        rows: [{ cp_id: 'cp-1', test_cases: JSON.stringify([]) }],
      }));

    const res = await request(app)
      .post('/api/coding/submit')
      .set(authHeaders())
      .send({ problem_id: 'q-1', language: 'python', code: 'print(1)' });
    expect(res.status).toBe(502);
  });
});