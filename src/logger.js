import axios from 'axios';

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

const colorMap = {
  trace: 0x95a5a6, // gray
  debug: 0x3498db, // blue
  info: 0x2ecc71,  // green
  warn: 0xf1c40f,  // yellow
  error: 0xe67e22, // orange
  critical: 0xe74c3c, // red
};

export async function discordLog(level, ...args) {
  if (!DISCORD_WEBHOOK) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const title = `<t:${timestamp}:R> (${level.toUpperCase()})`;
  const description = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const color = colorMap[level] || 0x95a5a6;
  let retries = 0;
  let maxRetries = 3;
  let delay = 0;
  const { default: syncRequest } = await import('sync-request');
  while (retries <= maxRetries) {
    try {
      syncRequest('POST', DISCORD_WEBHOOK, {
        json: {
          embeds: [{
            title,
            description,
            color,
            timestamp: new Date().toISOString(),
          }],
        },
        headers: { 'Content-Type': 'application/json' }
      });
      break; // Success, exit loop
    } catch (e) {
      if (e.statusCode === 429 && e.headers && e.headers['retry-after']) {
        delay = parseInt(e.headers['retry-after'] || '1', 10) * 1000;
        console.warn('Discord rate limited, retrying in', delay, 'ms');
        const waitUntil = Date.now() + delay;
        while (Date.now() < waitUntil) {}
        retries++;
      } else {
        console.error('Failed to send Discord webhook:', e.message || e);
        break;
      }
    }
  }
}

export async function log(level, ...args) {
  await discordLog(level, ...args); // now async
  const msg = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  if (level === 'error' || level === 'warn' || level === 'critical') {
    console.error(msg, ...args);
  } else {
    console.log(msg, ...args);
  }
}
