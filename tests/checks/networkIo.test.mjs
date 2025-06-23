import { jest } from '@jest/globals';
import { checkNetworkIO } from '../../checks/networkIo.mjs';

describe('checkNetworkIO', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn()
        .mockResolvedValueOnce([{ result: `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n    lo:  339078    1406    0    0    0     0          0         0   339078    1406    0    0    0     0       0          0\n  enX0: 53775665  775682    0    0    0     0          0         0 48429552  496869    0    0    0     0       0          0\n  enX1: 17308414   95002    0 4844    0     0          0         0 11184442   89263    0    0    0     0       0          0\ndocker0:       0       0    0    0    0     0          0         0        0       0    0    9    0     0       0          0` }])
        .mockResolvedValueOnce([{ result: `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n    lo:  349285    1444    0    0    0     0          0         0   349285    1444    0    0    0     0       0          0\n  enX0: 53786716  775787    0    0    0     0          0         0 48436639  496929    0    0    0     0       0          0\n  enX1: 17308460   95003    0 4844    0     0          0         0 11184528   89264    0    0    0     0       0          0\ndocker0:       0       0    0    0    0     0          0         0        0       0    0    9    0     0       0          0` }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkNetworkIO(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_networkio`')
    );
    // INSERT (should check for at least one iface)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_networkio`'),
      expect.arrayContaining(['enX0', expect.any(Number), expect.any(Number)])
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_networkio`'),
      expect.arrayContaining(['enX1', expect.any(Number), expect.any(Number)])
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
    await checkNetworkIO(params);
    expect(params.log.warn).not.toHaveBeenCalled();
    expect(params.sendMessage).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_networkio`'),
      expect.any(Array)
    );
  });
  it('should warn and send message if high usage is consistent', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      // 1st: low, 2nd: high, 3rd: two full /proc/net/dev blocks with high usage, no blank line, just headers repeated
      sshExec: jest.fn()
        .mockResolvedValueOnce([{ result: `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n  enHigh: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0` }])
        .mockResolvedValueOnce([{ result: `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n  enHigh: 9999999999 0 0 0 0 0 0 0 0 9999999999 0 0 0 0 0 0` }])
        .mockResolvedValueOnce([{ result:
          `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n  enHigh: 19999999999 0 0 0 0 0 0 0 0 19999999999 0 0 0 0 0 0\nInter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n  enHigh: 29999999999 0 0 0 0 0 0 0 0 29999999999 0 0 0 0 0 0` }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkNetworkIO(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `testhost_networkio`'),
      expect.arrayContaining(['enHigh', expect.any(Number), expect.any(Number)])
    );
  });
});
