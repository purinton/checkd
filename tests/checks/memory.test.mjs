import { jest } from '@jest/globals';
import { checkMemory } from '../../checks/memory.mjs';

describe('checkMemory', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: '               total        used        free      shared  buff/cache   available\nMem:      3822080000  1079234560  1973731328    44535808  1057697792  2742845440\nSwap:     3436179456           0  3436179456' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkMemory(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_memory`')
    );
    // INSERT
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_memory`'),
      expect.arrayContaining([3822080000, 1079234560, 1973731328, expect.any(Number), expect.any(Number)])
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
    await checkMemory(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_memory`'),
      expect.any(Array)
    );
  });
  it('should warn and send message if high usage', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: '               total        used        free      shared  buff/cache   available\nMem:      3822080000  3700000000  100000000    44535808  1057697792  2742845440\nSwap:     3436179456           0  3436179456' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkMemory(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_memory`'),
      expect.arrayContaining([3822080000, 3700000000, 100000000, expect.any(Number), expect.any(Number)])
    );
  });
});
