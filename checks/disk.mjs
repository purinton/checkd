export async function checkDisk(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_disk`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mount VARCHAR(255), used BIGINT, free BIGINT, total BIGINT, pct_used FLOAT, pct_free FLOAT)`);
  const [{ result: diskOutput }] = await sshExec({ host, username, commands: ['df -B1'] });
  await Promise.all(diskOutput.split('\n').map(async line => {
    if (!line.toLowerCase().includes('filesystem') && line.trim()) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const free = parseInt(parts[3]);
        const mount = parts[parts.length - 1];
        const pctUsed = total > 0 ? (used / total) * 100 : 0;
        const pctFree = total > 0 ? (free / total) * 100 : 0;
        log.debug(`Parsed disk usage for ${host}:`, { mount, used, free, total, pctUsed, pctFree, line });
        db.query(`INSERT INTO \`${table}\` (mount, used, free, total, pct_used, pct_free) VALUES (?, ?, ?, ?, ?, ?)`, [mount, used, free, total, pctUsed, pctFree]);
        if (pctUsed > 95 && !mount.includes('squashfs')) {
          const msg = `High disk usage on ${host}: ${mount} is ${pctUsed}% used.`;
          log.warn(msg, { host, mount });
          await sendMessage({
            body: {
              embeds: [{
                title: 'High Disk Usage',
                description: msg,
                color: 0xffa500
              }]
            }
          });
        }
      } else {
        const msg = `Disk output format is incorrect for ${host}.`;
        log.warn(msg, { host });
        await sendMessage({
          body: {
            embeds: [{
              title: 'Disk Output Error',
              description: msg,
              color: 0xffa500
            }]
          }
        });
      }
    }
  }));
}
