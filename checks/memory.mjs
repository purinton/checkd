export async function checkMemory(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_memory`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total BIGINT, used BIGINT, free BIGINT, pct_used FLOAT, pct_free FLOAT)`);
  const [{ result: memOutput }] = await sshExec({ host, username, commands: ['free -b'] });
  const lines = memOutput.split('\n');
  if (lines[1]) {
    const parts = lines[1].trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseFloat(parts[1]);
      const used = parseFloat(parts[2]);
      const free = parseFloat(parts[3]);
      const pctUsed = total > 0 ? (used / total) * 100 : 0;
      const pctFree = total > 0 ? (free / total) * 100 : 0;
      log.debug(`Parsed memory usage for ${host}:`, { total, used, free, pctUsed, pctFree, line: lines[1] });
      await db.query(`INSERT INTO \`${table}\` (total, used, free, pct_used, pct_free) VALUES (?, ?, ?, ?, ?)`, [total, used, free, pctUsed, pctFree]);
      if (pctUsed > 90) {
        const msg = `High memory usage on ${host}: ${pctUsed}% used.`;
        log.warn(msg, { host });
        await sendMessage({
          body: {
            embeds: [{
              title: 'High Memory Usage',
              description: msg,
              color: 0xffa500
            }]
          }
        });
      }
    } else {
      const msg = `Memory output format is incorrect for ${host}.`;
      log.warn(msg, { host });
      await sendMessage({
        body: {
          embeds: [{
            title: 'Memory Output Error',
            description: msg,
            color: 0xffa500
          }]
        }
      });
    }
  } else {
    const msg = `Unable to read memory output for ${host}. Output: ${memOutput}`;
    log.warn(msg, { host });
    await sendMessage({
      body: {
        embeds: [{
          title: 'Memory Output Error',
          description: msg,
          color: 0xffa500
        }]
      }
    });
  }
}
