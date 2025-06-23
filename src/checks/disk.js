import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkDisk(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_disk`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mount VARCHAR(255), used BIGINT, free BIGINT, total BIGINT, pct_used FLOAT, pct_free FLOAT)`);
  const diskOutput = await sshExec(hostname, 'df -B1');
  diskOutput.split('\n').forEach(async line => {
    if (!line.toLowerCase().includes('filesystem') && line.trim()) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const free = parseInt(parts[3]);
        const mount = parts[parts.length - 1];
        const pctUsed = total > 0 ? (used / total) * 100 : 0;
        const pctFree = total > 0 ? (free / total) * 100 : 0;
        sql.query(`INSERT INTO \`${table}\` (mount, used, free, total, pct_used, pct_free) VALUES (?, ?, ?, ?, ?, ?)`, [mount, used, free, total, pctUsed, pctFree]);
        if (pctUsed > 95 && !mount.includes('squashfs')) await log('warn', `High disk usage on ${hostname}: ${mount} is ${pctUsed}% used.`);
      } else {
        await log('warn', `Disk output format is incorrect for ${hostname}.`);
      }
    }
  });
}
