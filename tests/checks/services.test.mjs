import { jest } from '@jest/globals';
import { checkServices } from '../../checks/services.mjs';

describe('checkServices', () => {
  it('should run without throwing (normal) and not warn or error if no failed/inactive services', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: '0 loaded units listed' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkServices(params)).resolves.not.toThrow();
    expect(params.log.warn).not.toHaveBeenCalled();
    expect(params.log.error).not.toHaveBeenCalled();
    expect(params.sendMessage).not.toHaveBeenCalled();
  });
  it('should error and send message if any service is failed', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: 'failme.service loaded failed failed  Failing Service' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkServices(params);
    expect(params.log.error).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
  });
  it('should error and send message if output format is incorrect', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: 'bad output' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkServices(params);
    // The implementation treats any non-zero output as a failure
    expect(params.log.error).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
  });
  it('should warn and send message if any named service is not active', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      services: ['failme', 'good'],
      sshExec: jest.fn().mockResolvedValue([
        { result: '0 loaded units listed' },
        { result: 'inactive\nactive' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkServices(params);
    expect(params.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Service failme on testhost is not active.'),
      expect.objectContaining({ host: 'testhost', service: 'failme' })
    );
    expect(params.sendMessage).toHaveBeenCalled();
  });
});
