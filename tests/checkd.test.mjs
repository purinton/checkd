import { jest } from '@jest/globals';
test('checkd.mjs can be imported without error', async () => {
  process.env.LOG_LEVEL = 'none';
  await import('../checkd.mjs');
  expect(true).toBe(true);
});