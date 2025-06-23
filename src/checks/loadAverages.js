import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkLoadAverage(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_loadavg`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, load1 FLOAT, load5 FLOAT, load15 FLOAT)`);
  const output = await sshExec(hostname, 'cat /proc/loadavg');
  const parts = output.trim().split(/\s+/);
  if (parts.length >= 3) {
    const load1 = parseFloat(parts[0]);
    const load5 = parseFloat(parts[1]);
    const load15 = parseFloat(parts[2]);
    await sql.query(`INSERT INTO \`${table}\` (load1, load5, load15) VALUES (?, ?, ?)`, [load1, load5, load15]);
    if (load1 > 8.0 || load5 > 8.0 || load15 > 8.0) {
      let consistent = true;
      for (let i = 0; i < 2; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const check = await sshExec(hostname, 'cat /proc/loadavg');
        const checkParts = check.trim().split(/\s+/);
        if (checkParts.length < 3 || (parseFloat(checkParts[0]) <= 8.0 && parseFloat(checkParts[1]) <= 8.0 && parseFloat(checkParts[2]) <= 8.0)) {
          consistent = false;
          break;
        }
      }
      if (consistent) await log('warn', `High load average on ${hostname}: 1min=${load1}, 5min=${load5}, 15min=${load15} (over 8.0 for 3 consecutive samples)`);
    }
  } else {
    await log('warn', `Unable to parse load average for ${hostname}. Output: ${output}`);
  }
}
