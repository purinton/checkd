export async function checkNetworkIO(params) {
  const { host, username, db, sshExec, log, sendMessage } = params;
  const table = `${host.replace(/\W/g, '_')}_networkio`;
  await db.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, iface VARCHAR(64), rx_rate BIGINT, tx_rate BIGINT)`);
  const threshold = 400 * 1000 * 1000 / 8;
  // Initial sample
  const [{ result: first }] = await sshExec({ host, username, commands: ['cat /proc/net/dev'] });
  if (process.env.NODE_ENV !== 'test') {
    await new Promise(r => setTimeout(r, 3000));
  }
  const [{ result: second }] = await sshExec({ host, username, commands: ['cat /proc/net/dev'] });
  const parse = raw => {
    const stats = {};
    raw.split('\n').forEach(line => {
      if (line.includes(':')) {
        const [iface, data] = line.split(':', 2);
        const fields = data.trim().split(/\s+/);
        if (fields.length >= 16) {
          stats[iface.trim()] = { rx: parseInt(fields[0]), tx: parseInt(fields[8]) };
        }
      }
    });
    return stats;
  };
  const firstStats = parse(first);
  const secondStats = parse(second);
  let sampleHigh = false;
  await Promise.all(Object.keys(firstStats).map(async iface => {
    if (secondStats[iface]) {
      const rxRate = (secondStats[iface].rx - firstStats[iface].rx) / 3;
      const txRate = (secondStats[iface].tx - firstStats[iface].tx) / 3;
      log.debug(`Parsed network IO for ${host}:`, { iface, rxRate, txRate, first: firstStats[iface], second: secondStats[iface] });
      db.query(`INSERT INTO \`${table}\` (iface, rx_rate, tx_rate) VALUES (?, ?, ?)`, [iface, rxRate, txRate]);
      if (rxRate > threshold || txRate > threshold) sampleHigh = true;
    }
  }));
  if (sampleHigh) {
    // Do 2 more samples in a single SSH connection with sleeps
    const checkCmd = 'cat /proc/net/dev; sleep 3; cat /proc/net/dev;';
    const [{ result: multiOutput }] = await sshExec({ host, username, commands: [checkCmd] });
    // Split on header line for each /proc/net/dev block
    const blocks = multiOutput.split(/(?=Inter-\|)/g).map(b => b.trim()).filter(Boolean);
    let allHigh = true;
    for (let s = 0; s < blocks.length - 1; s++) {
      const stats1 = parse(blocks[s]);
      const stats2 = parse(blocks[s + 1]);
      let foundHigh = false;
      Object.keys(stats1).forEach(iface => {
        if (stats2[iface]) {
          const rxRate = (stats2[iface].rx - stats1[iface].rx) / 3;
          const txRate = (stats2[iface].tx - stats1[iface].tx) / 3;
          log.debug(`High network IO recheck for ${host}:`, { iface, rxRate, txRate, stats1: stats1[iface], stats2: stats2[iface] });
          if (rxRate > threshold || txRate > threshold) foundHigh = true;
        }
      });
      if (!foundHigh) {
        allHigh = false;
        break;
      }
    }
    if (allHigh && blocks.length >= 2) {
      const msg = `High network IO on ${host}: At least one interface above 400Mbps for 3 consecutive samples.`;
      log.warn(msg, { host });
      await sendMessage({
        body: {
          embeds: [{
            title: 'High Network IO',
            description: msg,
            color: 0xffa500
          }]
        }
      });
    }
  }
}
