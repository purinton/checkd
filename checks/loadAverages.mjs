export async function checkLoadAverages(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_loadavg`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, load1 FLOAT, load5 FLOAT, load15 FLOAT)`);
  const [{ result: output }] = await sshExec({ host, username, commands: ['cat /proc/loadavg'] });
  const parts = output.trim().split(/\s+/);
  if (parts.length >= 3) {
    const load1 = parseFloat(parts[0]);
    const load5 = parseFloat(parts[1]);
    const load15 = parseFloat(parts[2]);
    log.debug(`Parsed load averages for ${host}:`, { load1, load5, load15, output });
    await db.query(`INSERT INTO \`${table}\` (load1, load5, load15) VALUES (?, ?, ?)`, [load1, load5, load15]);
    if (load1 > 8.0 || load5 > 8.0 || load15 > 8.0) {
      // Run 2 more checks in a single SSH connection with sleeps
      const checkCmd = 'cat /proc/loadavg; sleep 3; cat /proc/loadavg;';
      const [{ result: multiOutput }] = await sshExec({ host, username, commands: [checkCmd] });
      const samples = multiOutput.split(/\n(?=\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+)/g); // split on each loadavg line
      let consistent = true;
      for (const sample of samples) {
        const checkParts = sample.trim().split(/\s+/);
        log.debug(`High load average recheck for ${host}:`, { checkParts });
        if (checkParts.length < 3 || (parseFloat(checkParts[0]) <= 8.0 && parseFloat(checkParts[1]) <= 8.0 && parseFloat(checkParts[2]) <= 8.0)) {
          consistent = false;
          break;
        }
      }
      if (consistent && samples.length >= 2) {
        const msg = `High load average on ${host}: 1min=${load1}, 5min=${load5}, 15min=${load15} (over 8.0 for 3 consecutive samples)`;
        log.warn(msg, { host });
        await sendMessage({
          body: {
            embeds: [{
              title: 'High Load Average',
              description: msg,
              color: 0xffa500
            }]
          }
        });
      }
    }
  } else {
    const msg = `Unable to parse load average for ${host}. Output: ${output}`;
    log.warn(msg, { host });
    await sendMessage({
      body: {
        embeds: [{
          title: 'Load Average Parse Error',
          description: msg,
          color: 0xffa500
        }]
      }
    });
  }
}
