export async function checkXCPAlerts(params) {
  const { host, username, sshExec, log, sendMessage } = params;
  // Batch all priority message-list commands
  const priorities = [1, 2, 3, 4];
  const commands = priorities.map(p => `xe message-list priority=${p}`);
  commands.push('xe message-list priority=5 --minimal');
  const results = await sshExec({ host, username, commands });

  // Handle priorities 1-4
  const priorityTitles = ['XCP Critical', 'XCP Error', 'XCP Warning', 'XCP Warning'];
  const priorityLog = ['error', 'error', 'warn', 'warn'];
  const priorityColors = [0xff0000, 0xff0000, 0xffa500, 0xffa500];
  for (let i = 0; i < 4; i++) {
    const output = results[i].result.trim();
    if (output) {
      const msg = `${priorityTitles[i].replace('XCP ', '')} messages on ${host}: ${output}`;
      log[priorityLog[i]](msg, { host });
      await sendMessage({
        body: {
          embeds: [{
            title: priorityTitles[i],
            description: msg,
            color: priorityColors[i]
          }]
        }
      });
    }
  }

  // Handle priority 5 UUIDs
  const uuidOutput = results[4].result.trim();
  log.debug(`Checked XCP priority 5 UUIDs for ${host}:`, { uuidOutput });
  const uuids = uuidOutput ? uuidOutput.split(',') : [];
  if (uuids.length) {
    // Batch all uuid name lookups
    const nameCmds = uuids.filter(Boolean).map(uuid => `xe message-list uuid=${uuid} params=name --minimal`);
    log.debug(`Looking up XCP message names for ${host}:`, { uuids, nameCmds });
    const nameResults = nameCmds.length ? await sshExec({ host, username, commands: nameCmds }) : [];
    // Prepare destroy commands for ignorable messages
    const ignorable = [
      'VMSS_SNAPSHOT_SUCCEEDED',
      'VM_SNAPSHOTTED',
      'VM_STARTED',
      'VM_SHUTDOWN',
      'VM_REBOOTED'
    ];
    const destroyCmds = [];
    for (let i = 0; i < uuids.length; i++) {
      const uuid = uuids[i];
      if (!uuid) continue;
      const message = (nameResults[i] && nameResults[i].result.trim()) || '';
      log.debug(`XCP message for ${host}:`, { uuid, message });
      if (ignorable.includes(message)) {
        destroyCmds.push(`xe message-destroy uuid=${uuid}`);
      } else {
        const msg = `Notice on ${host}: ${message}`;
        log.warn(msg, { host });
        await sendMessage({
          body: {
            embeds: [{
              title: 'XCP Notice',
              description: msg,
              color: 0x00bfff
            }]
          }
        });
      }
    }
    // Batch destroy ignorable messages
    if (destroyCmds.length) {
      log.debug(`Destroying ignorable XCP messages for ${host}:`, { destroyCmds });
      await sshExec({ host, username, commands: destroyCmds });
    }
  }
}
