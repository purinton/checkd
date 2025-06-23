import { log } from '../logger.js';
import { sshExec } from '../ssh.js';
import { connectDB, getTableBase } from '../db.js';

export async function checkCPU(hostname) {
  const sql = await connectDB();
  const table = `${getTableBase(hostname)}_cpu`;
  await sql.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id INT AUTO_INCREMENT PRIMARY KEY, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, cpu_pct FLOAT NOT NULL)`);
  const cpuOutput = await sshExec(hostname, `sleep 1 && top -bn1 | grep 'Cpu(s)'`);
  let cpuUsage = null;
  cpuOutput.split(',').forEach(part => {
    if (part.includes('id')) {
      const idle = parseFloat(part.replace(/[^\d.]/g, ''));
      cpuUsage = 100 - idle;
    }
  });
  if (cpuUsage == null) {
    await log('warn', `Unable to parse CPU usage for ${hostname}. Output: ${cpuOutput}`);
    return;
  }
  await sql.query(`INSERT INTO \`${table}\` (cpu_pct) VALUES (?)`, [cpuUsage]);
  if (cpuUsage > 75) {
    let consistent = true;
    for (let i = 0; i < 2; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const check = await sshExec(hostname, `sleep 1 && top -bn1 | grep 'Cpu(s)'`);
      let checkUsage = null;
      check.split(',').forEach(part => {
        if (part.includes('id')) {
          const idle = parseFloat(part.replace(/[^\d.]/g, ''));
          checkUsage = 100 - idle;
        }
      });
      if (checkUsage == null || checkUsage <= 75) {
        consistent = false;
        break;
      }
    }
    if (consistent) await log('warn', `High CPU usage on ${hostname}: CPU usage is above 75% consistently.`);
    else return;
  } else {
    return;
  }
}
