import { jest } from '@jest/globals';
import { checkHostOnline } from '../../checks/hostOnline.mjs';

describe('checkHostOnline', () => {
  it('should return true if sshExec succeeds', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([{ result: 'online' }]),
      log: { error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkHostOnline(params)).resolves.toBe(true);
  });
  it('should return false and send alert if sshExec fails', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockRejectedValue(new Error('fail')),
      log: { error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkHostOnline(params)).resolves.toBe(false);
    expect(params.sendMessage).toHaveBeenCalled();
  });
});
