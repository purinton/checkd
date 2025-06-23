// Threshold constants
const DISK_IO_UTIL_THRESHOLD = 80;

export async function checkDiskIO(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_diskio`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, device VARCHAR(64), util_pct FLOAT)`);
  // Initial sample
  const [{ result: output, stderr }] = await sshExec({ host, username, commands: ['iostat -dx 1 2 | grep -A 100 Device | tail -n +2'] });
  if (stderr && stderr.toLowerCase().includes('invalid command')) {
    log.debug(`iostat not available on host ${host}, skipping disk IO check.`, { host, stderr });
    return;
  }
  let sampleHigh = false;
  await Promise.all(output.split('\n').map(async line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 23) {
      const device = parts[0];
      const util = parseFloat(parts[22]);
      log.debug(`Parsed disk IO for ${host}:`, { device, util, line });
      if (!isNaN(util)) {
        db.query(`INSERT INTO \`${table}\` (device, util_pct) VALUES (?, ?)`, [device, util]);
        if (util > DISK_IO_UTIL_THRESHOLD) sampleHigh = true;
      }
    }
  }));
  if (sampleHigh) {
    // Do 2 more samples in a single SSH connection with sleeps
    const checkCmd = 'iostat -dx 1 2 | grep -A 100 Device | tail -n +2; sleep 3; iostat -dx 1 2 | grep -A 100 Device | tail -n +2;';
    const [{ result: multiOutput }] = await sshExec({ host, username, commands: [checkCmd] });
    const samples = multiOutput.split(/\n(?=\S)/g); // crude split: each output block
    let allHigh = true;
    for (const sample of samples) {
      let foundHigh = false;
      sample.split('\n').forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 23) {
          const util = parseFloat(parts[22]);
          log.debug(`High disk IO recheck for ${host}:`, { line, util });
          if (!isNaN(util) && util > DISK_IO_UTIL_THRESHOLD) foundHigh = true;
        }
      });
      if (!foundHigh) {
        allHigh = false;
        break;
      }
    }
    if (allHigh && samples.length >= 2) {
      const msg = `High disk IO on ${host}: Device(s) above ${DISK_IO_UTIL_THRESHOLD}% utilization for 3 consecutive samples.`;
      log.warn(msg, { host });
      await sendMessage({
        body: {
          embeds: [{
            title: 'High Disk IO',
            description: msg,
            color: 0xffa500,
            fields: [
              { name: 'Utilization Threshold (%)', value: DISK_IO_UTIL_THRESHOLD.toString(), inline: true }
            ]
          }]
        }
      });
    }
  }
}
