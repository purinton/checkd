import { jest } from '@jest/globals';
import { checkXCPAlerts } from '../../checks/xcpAlerts.mjs';

describe('checkXCPAlerts', () => {
  it('should do nothing if xe is not found (all errors, no result)', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: '', error: 'bash: line 1: xe: command not found' },
        { result: '', error: 'bash: line 1: xe: command not found' },
        { result: '', error: 'bash: line 1: xe: command not found' },
        { result: '', error: 'bash: line 1: xe: command not found' },
        { result: '', error: 'bash: line 1: xe: command not found' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkXCPAlerts(params);
    expect(params.log.warn).not.toHaveBeenCalled();
    expect(params.log.error).not.toHaveBeenCalled();
    expect(params.sendMessage).not.toHaveBeenCalled();
  });
  it('should send messages for priorities with output', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: 'critical' },
        { result: 'error' },
        { result: 'warn' },
        { result: 'warn2' },
        { result: '' }
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkXCPAlerts(params);
    expect(params.sendMessage).toHaveBeenCalledTimes(4);
    expect(params.log.error).toHaveBeenCalled();
    expect(params.log.warn).toHaveBeenCalled();
  });
  it('should run without throwing (no alerts)', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn().mockResolvedValue([
        { result: '' }, // priority 1
        { result: '' }, // priority 2
        { result: '' }, // priority 3
        { result: '' }, // priority 4
        { result: '' }  // priority 5 uuids
      ]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkXCPAlerts(params)).resolves.not.toThrow();
    expect(params.sendMessage).not.toHaveBeenCalled();
    expect(params.log.warn).not.toHaveBeenCalled();
    expect(params.log.error).not.toHaveBeenCalled();
  });
  it('should destroy ignorable uuids and send notice for others', async () => {
    const params = {
      host: 'testhost',
      username: 'testuser',
      sshExec: jest.fn()
        .mockResolvedValueOnce([
          { result: '' }, { result: '' }, { result: '' }, { result: '' }, { result: 'uuid1,uuid2' }
        ])
        .mockResolvedValueOnce([
          { result: 'VMSS_SNAPSHOT_SUCCEEDED' }, { result: 'SOMETHING_ELSE' }
        ])
        .mockResolvedValueOnce([]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkXCPAlerts(params);
    expect(params.sendMessage).toHaveBeenCalled();
    expect(params.sshExec).toHaveBeenCalledTimes(3);
  });
});
