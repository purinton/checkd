import { sshExec } from '../ssh.js';
import { log } from '../logger.js';

export async function checkFailedServices(hostname) {
  const output = await sshExec(hostname, 'systemctl --failed --no-pager');
  if (!output.includes('0 loaded units listed')) {
    await log('error', `Checkd found failed services on ${hostname}:\n${output}`);
  }
}

export async function checkActiveServices(hostname, services) {
  if (!services.length) return;
  const serviceList = services.join(' ');
  const output = await sshExec(hostname, `systemctl is-active ${serviceList}`);
  const lines = output.trim().split('\n');
  await Promise.all(
    services.map(async (service, i) => {
      const status = lines[i] || 'inactive';
      if (status !== 'active') await log('warn', `Service ${service} on ${hostname} is not active.`);
    })
  );
}
