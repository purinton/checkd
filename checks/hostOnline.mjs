export async function checkHostOnline(params) {
  const { host, username, log, sshExec, sendMessage } = params;
  try {
    await sshExec({ host, username, commands: ['echo online'] });
    return true;
  } catch (e) {
    const msg = `Host ${host} is OFFLINE: SSH login failed.`;
    log.error(msg, { host });
    await sendMessage({
      body: {
        embeds: [{
          title: 'Host Offline',
          description: msg,
          color: 0xff0000
        }]
      }
    });
    return false;
  }
}
