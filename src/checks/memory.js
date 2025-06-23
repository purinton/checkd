import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkMemory(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_memory`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total BIGINT, used BIGINT, free BIGINT, pct_used FLOAT, pct_free FLOAT)`);
  const memOutput = await sshExec(hostname, 'free -b');
  const lines = memOutput.split('\n');
  if (lines[1]) {
    const parts = lines[1].trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseFloat(parts[1]);
      const used = parseFloat(parts[2]);
      const free = parseFloat(parts[3]);
      const pctUsed = total > 0 ? (used / total) * 100 : 0;
      const pctFree = total > 0 ? (free / total) * 100 : 0;
      await sql.query(`INSERT INTO \`${table}\` (total, used, free, pct_used, pct_free) VALUES (?, ?, ?, ?, ?)`, [total, used, free, pctUsed, pctFree]);
      if (pctUsed > 90) await log('warn', `High memory usage on ${hostname}: ${pctUsed}% used.`);
      else return;
    } else {
      await log('warn', `Memory output format is incorrect for ${hostname}.`);
    }
  } else {
    await log('warn', `Unable to read memory output for ${hostname}. Output: ${memOutput}`);
  }
}
