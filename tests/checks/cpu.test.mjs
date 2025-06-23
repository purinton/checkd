import { jest } from '@jest/globals';
import { checkCPU } from '../../checks/cpu.mjs';

describe('checkCPU', () => {
  it('should run without throwing (normal) and create table and insert correct data', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: '%Cpu(s):  2.3 us,  2.3 sy,  0.0 ni, 93.2 id,  0.0 wa,  0.0 hi,  0.0 si,  2.3 st ' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await expect(checkCPU(params)).resolves.not.toThrow();
    // CREATE TABLE
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS `testhost_cpu`')
    );
    // INSERT with correct value (floating point tolerant)
    const insertCall = db.query.mock.calls.find(call => call[0].includes('INSERT INTO `testhost_cpu`'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBeCloseTo(6.8, 2);
    // log.debug called with correct info
    expect(params.log.debug).toHaveBeenCalledWith(
      expect.stringContaining('Parsed CPU usage for testhost:'),
      expect.objectContaining({
        cpuOutput: expect.stringContaining('93.2 id'),
        cpuUsage: expect.closeTo(6.8, 2)
      })
    );
  });
  it('should warn and send message if parse fails', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn().mockResolvedValue([{ result: 'bad output' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkCPU(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    // Ensure no INSERT was attempted at all
    expect(db.query.mock.calls.some(
      call => call[0].includes('INSERT INTO `testhost_cpu`')
    )).toBe(false);
    // log.debug should still be called with cpuUsage null
    expect(params.log.debug).toHaveBeenCalledWith(
      expect.stringContaining('Parsed CPU usage for testhost:'),
      expect.objectContaining({
        cpuOutput: 'bad output',
        cpuUsage: null
      })
    );
  });
  it('should warn and send message if high usage is consistent', async () => {
    const db = { query: jest.fn() };
    const params = {
      host: 'testhost',
      username: 'testuser',
      db,
      sshExec: jest.fn()
        .mockResolvedValueOnce([{ result: '%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni, 10.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st' }])
        .mockResolvedValueOnce([{ result: 'Cpu(s):  0.0 us,  0.0 sy,  0.0 ni, 10.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\nCpu(s):  0.0 us,  0.0 sy,  0.0 ni, 10.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st' }]),
      log: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      sendMessage: jest.fn()
    };
    await checkCPU(params);
    expect(params.log.warn).toHaveBeenCalled();
    expect(params.sendMessage).toHaveBeenCalled();
    // INSERT with correct value for first sample (floating point tolerant)
    const insertCall = db.query.mock.calls.find(call => call[0].includes('INSERT INTO `testhost_cpu`'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBeCloseTo(90, 2);
    // log.debug for initial parse
    expect(params.log.debug).toHaveBeenCalledWith(
      expect.stringContaining('Parsed CPU usage for testhost:'),
      expect.objectContaining({
        cpuOutput: expect.stringContaining('10.0 id'),
        cpuUsage: expect.closeTo(90, 2)
      })
    );
    // log.debug for each high CPU recheck sample
    expect(params.log.debug).toHaveBeenCalledWith(
      expect.stringContaining('High CPU recheck sample for testhost:'),
      expect.objectContaining({
        sample: expect.stringContaining('10.0 id'),
        checkUsage: expect.closeTo(90, 2)
      })
    );
    expect(params.log.debug).toHaveBeenCalledTimes(3); // 1 initial + 2 rechecks
  });
});
