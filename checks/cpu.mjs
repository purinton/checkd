// Threshold constants
const CPU_USAGE_THRESHOLD = 75;

export async function checkCPU(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_cpu`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, cpu_pct FLOAT NOT NULL)`);
  const [{ result: cpuOutput }] = await sshExec({ host, username, commands: [`sleep 1 && top -bn1 | grep 'Cpu(s)'`] });
  let cpuUsage = null;
  cpuOutput.split(',').forEach(part => {
    if (part.includes('id')) {
      const idle = parseFloat(part.replace(/[^\d.]/g, ''));
      cpuUsage = 100 - idle;
    }
  });
  log.debug(`Parsed CPU usage for ${host}:`, { cpuOutput, cpuUsage });
  if (cpuUsage == null) {
    const msg = `Unable to parse CPU usage for ${host}. Output: ${cpuOutput}`;
    log.warn(msg, { host });
    await sendMessage({
      body: {
        embeds: [{
          title: 'CPU Parse Error',
          description: msg,
          color: 0xffa500
        }]
      }
    });
    return;
  }
  await db.query(`INSERT INTO \`${table}\` (cpu_pct) VALUES (?)`, [cpuUsage]);
  if (cpuUsage > CPU_USAGE_THRESHOLD) {
    // Run 2 more checks in a single SSH connection with sleeps
    const checkCmd = `sleep 1 && top -bn1 | grep 'Cpu(s)'; sleep 3; sleep 1 && top -bn1 | grep 'Cpu(s)';`;
    const [{ result: multiOutput }] = await sshExec({ host, username, commands: [checkCmd] });
    const samples = multiOutput.split(/\n(?=Cpu\(s\))/g); // split on each 'Cpu(s)' line
    let consistent = true;
    for (const sample of samples) {
      let checkUsage = null;
      sample.split(',').forEach(part => {
        if (part.includes('id')) {
          const idle = parseFloat(part.replace(/[^\d.]/g, ''));
          checkUsage = 100 - idle;
        }
      });
      log.debug(`High CPU recheck sample for ${host}:`, { sample, checkUsage });
      if (checkUsage == null || checkUsage <= CPU_USAGE_THRESHOLD) {
        consistent = false;
        break;
      }
    }
    if (consistent && samples.length >= 2) {
      const msg = `High CPU usage on ${host}: CPU usage is above ${CPU_USAGE_THRESHOLD}% consistently.`;
      log.warn(msg, { host });
      await sendMessage({
        body: {
          embeds: [{
            title: 'High CPU Usage',
            description: msg,
            color: 0xffa500,
            fields: [
              { name: 'CPU Usage (%)', value: cpuUsage.toFixed(2), inline: true },
              { name: 'Threshold (%)', value: CPU_USAGE_THRESHOLD.toString(), inline: true }
            ]
          }]
        }
      });
    }
  }
}
