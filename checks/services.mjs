export async function checkServices(params) {
  const { host, username, services = [], log, sshExec, sendMessage } = params;
  // Prepare commands for failed and active services
  const commands = [
    'systemctl --failed --no-pager',
  ];
  if (services.length) {
    const serviceList = services.join(' ');
    commands.push(`systemctl is-active ${serviceList}`);
  }
  const results = await sshExec({ host, username, commands });
  // Check for failed services
  const failedOutput = results[0].result;
  log.debug(`Checked failed services for ${host}:`, { failedOutput });
  if (!failedOutput.includes('0 loaded units listed')) {
    const msg = `Checkd found failed services on ${host} (see below):\n${failedOutput}`;
    log.error(msg, { host });
    await sendMessage({
      body: {
        embeds: [{
          title: 'Failed Services',
          description: msg,
          color: 0xff0000,
          fields: [
            { name: 'Host', value: host, inline: true }
          ]
        }]
      }
    });
  }
  // Check for inactive services
  if (services.length) {
    const output = results[1].result.trim();
    log.debug(`Checked service statuses for ${host}:`, { services, output });
    const lines = output.split('\n');
    await Promise.all(
      services.map(async (service, i) => {
        const status = lines[i] || 'inactive';
        if (status !== 'active') {
          const msg = `Service ${service} on ${host} is not active.`;
          log.warn(msg, { host, service });
          await sendMessage({
            body: {
              embeds: [{
                title: 'Service Not Active',
                description: msg,
                color: 0xffa500,
                fields: [
                  { name: 'Service', value: service, inline: true },
                  { name: 'Host', value: host, inline: true }
                ]
              }]
            }
          });
        }
      })
    );
  }
}
