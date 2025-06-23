import { jest } from '@jest/globals';
import { checkLoadAverages } from '../../checks/loadAverages.mjs';

describe('checkLoadAverages', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: '0.00 0.00 0.00 1/502 50873' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkLoadAverages(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_loadavg`')
    );
    // INSERT
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_loadavg`'),
      expect.arrayContaining([expect.any(Number), expect.any(Number), expect.any(Number)])
    );
  });
  it('should warn and send message if output format is incorrect', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: 'bad output' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkLoadAverages(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_loadavg`'),
      expect.any(Array)
    );
  });
});
