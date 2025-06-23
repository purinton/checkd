import { sshExec } from '../ssh.js';
import { log } from '../logger.js';

export async function checkXCPAlerts(hostname) {
  let output = await sshExec(hostname, 'xe message-list priority=1');
  if (output.trim()) await log('critical', `Critical messages on ${hostname}: ${output}`);

  output = await sshExec(hostname, 'xe message-list priority=2');
  if (output.trim()) await log('error', `Error messages on ${hostname}: ${output}`);

  output = await sshExec(hostname, 'xe message-list priority=3');
  if (output.trim()) await log('warn', `Warning messages on ${hostname}: ${output}`);

  output = await sshExec(hostname, 'xe message-list priority=4');
  if (output.trim()) await log('warn', `Warning messages on ${hostname}: ${output}`);

  output = await sshExec(hostname, 'xe message-list priority=5 --minimal');
  const uuids = output.trim().split(',');
  for (const uuid of uuids) {
    if (!uuid) continue;
    const message = await sshExec(hostname, `xe message-list uuid=${uuid} params=name --minimal`);
    if (
      message.trim() === 'VMSS_SNAPSHOT_SUCCEEDED' ||
      message.trim() === 'VM_SNAPSHOTTED' ||
      message.trim() === 'VM_STARTED' ||
      message.trim() === 'VM_SHUTDOWN' ||
      message.trim() === 'VM_REBOOTED'
    ) {
      await sshExec(hostname, `xe message-destroy uuid=${uuid}`);
    } else {
      await log('warn', `Notice on ${hostname}: ${message}`);
    }
  }
}
