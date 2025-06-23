import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkDiskIO(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_diskio`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, device VARCHAR(64), util_pct FLOAT)`);
  let allHigh = true;
  for (let i = 0; i < 3; i++) {
    const output = await sshExec(hostname, 'iostat -dx 1 2 | grep -A 100 Device | tail -n +2');
    let sampleHigh = false;
    await Promise.all(output.split('\n').map(async line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 23) {
        const device = parts[0];
        const util = parseFloat(parts[22]);
        if (!isNaN(util)) {
          sql.query(`INSERT INTO \`${table}\` (device, util_pct) VALUES (?, ?)`, [device, util]);
          if (util > 80) sampleHigh = true;
        }
      }
    }));
    if (!sampleHigh) {
      allHigh = false;
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (allHigh) await log('warn', `High disk IO on ${hostname}: Device(s) above 80% utilization for 3 consecutive samples.`);
}
