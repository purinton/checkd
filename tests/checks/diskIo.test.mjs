import { jest } from '@jest/globals';
import { checkDiskIO } from '../../checks/diskIo.mjs';

describe('checkDiskIO', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: 'xvda             1.40     44.29     0.00   0.04    0.49    31.57    0.03      0.42     0.01  14.88   10.54    14.52    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.20    0.00   0.02\nxvdb             0.44     12.18     0.00   0.02    0.58    27.67    0.67      7.18     0.15  17.85   13.87    10.69    0.00      0.00     0.00   0.00    0.00     0.00    0.07    0.32    0.01   1.50\n\n\nDevice            r/s     rkB/s   rrqm/s  %rrqm r_await rareq-sz     w/s     wkB/s   wrqm/s  %wrqm w_await wareq-sz     d/s     dkB/s   drqm/s  %drqm d_await dareq-sz     f/s f_await  aqu-sz  %util\nxvda             0.00      0.00     0.00   0.00    0.00     0.00    0.00      0.00     0.00   0.00    0.00     0.00    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.00   0.00\nxvdb             0.00      0.00     0.00   0.00    0.00     0.00    0.00      0.00     0.00   0.00    0.00     0.00    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.00   0.00\n\n\n' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkDiskIO(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_diskio`')
    );
    // INSERT (should check for at least one device)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_diskio`'),
      expect.arrayContaining(['xvda', expect.any(Number)])
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_diskio`'),
      expect.arrayContaining(['xvdb', expect.any(Number)])
    );
  });
  it('should not warn or send message if output format is incorrect (no valid lines)', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: 'bad output' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkDiskIO(params);
    expect(params.log.warn).not.toHaveBeenCalled();
    expect(params.sendMessage).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_diskio`'),
      expect.any(Array)
    );
  });
  it('should warn and send message if high usage is consistent', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: 'xvda 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 99.0\nxvdb 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 99.0\n' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkDiskIO(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_diskio`'),
      expect.arrayContaining(['xvda', expect.any(Number)])
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_diskio`'),
      expect.arrayContaining(['xvdb', expect.any(Number)])
    );
  });
});
