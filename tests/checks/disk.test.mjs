import { jest } from '@jest/globals';
import { checkDisk } from '../../checks/disk.mjs';

describe('checkDisk', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: `Filesystem                    1B-blocks        Used   Available Use% Mounted on\n/dev/xvda4                  29779558400 11268747264 18510811136  38% /\n/dev/xvdb                   34292629504 14256508928 20036120576  42% /var` }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkDisk(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_disk`')
    );
    // INSERT for /
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_disk`'),
      expect.arrayContaining(['/', 11268747264, 18510811136, 29779558400, expect.any(Number), expect.any(Number)])
    );
    // INSERT for /var
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_disk`'),
      expect.arrayContaining(['/var', 14256508928, 20036120576, 34292629504, expect.any(Number), expect.any(Number)])
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
    await checkDisk(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    // Should not insert
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_disk`'),
      expect.any(Array)
    );
  });
  it('should warn and send message if high usage', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: `Filesystem                    1B-blocks        Used   Available Use% Mounted on\n/dev/xvda4                  29779558400 29000000000  780000000  97% /` }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkDisk(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_disk`'),
      expect.arrayContaining(['/', 29000000000, 780000000, 29779558400, expect.any(Number), expect.any(Number)])
    );
  });
});
