import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkNetworkIO(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_networkio`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, iface VARCHAR(64), rx_rate BIGINT, tx_rate BIGINT)`);
  const threshold = 400 * 1000 * 1000 / 8;
  let allHigh = true;
  for (let i = 0; i < 3; i++) {
    const first = await sshExec(hostname, 'cat /proc/net/dev');
    await new Promise(r => setTimeout(r, 3000));
    const second = await sshExec(hostname, 'cat /proc/net/dev');
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
        sql.query(`INSERT INTO \`${table}\` (iface, rx_rate, tx_rate) VALUES (?, ?, ?)`, [iface, rxRate, txRate]);
        if (rxRate > threshold || txRate > threshold) sampleHigh = true;
      }
    }));
    if (!sampleHigh) {
      allHigh = false;
      break;
    }
  }
  if (allHigh) await log('warn', `High network IO on ${hostname}: At least one interface above 400Mbps for 3 consecutive samples.`);
}
