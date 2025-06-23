import { spawn } from 'child_process';

export async function sshExec(host, command) {
  return new Promise((resolve, reject) => {
    const ssh = spawn('ssh', [host, `${command} 2>&1`], { shell: true });
    let stdout = '';
    let stderr = '';
    ssh.stdout.on('data', data => { stdout += data; });
    ssh.stderr.on('data', data => { stderr += data; });
    ssh.on('close', code => {
      if (code !== 0) reject(new Error(`SSH failed on ${host}: ${stderr}`));
      else resolve(stdout);
    });
    ssh.on('error', err => reject(err));
  });
}
