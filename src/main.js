// main.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './logger.js';
import { connectDB, closeDB } from './db.js';

// Import all checks
import { checkFailedServices, checkActiveServices } from './checks/services.js';
import { checkCPU } from './checks/cpu.js';
import { checkMemory } from './checks/memory.js';
import { checkDisk } from './checks/disk.js';
import { checkDiskIO } from './checks/diskIo.js';
import { checkNetworkIO } from './checks/networkIo.js';
import { checkLoadAverage } from './checks/loadAverages.js';
import { checkXCPAlerts } from './checks/xcpAlerts.js';


// Always resolve config path relative to this file's location
const dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(dirname, '../config/Checkd.json');

async function checkServer(hostname, services) {
  try {
    await checkFailedServices(hostname);
    await checkActiveServices(hostname, services);
    await checkCPU(hostname);
    await checkMemory(hostname);
    await checkDisk(hostname);
    await checkDiskIO(hostname);
    await checkNetworkIO(hostname);
    await checkLoadAverage(hostname);
    if (hostname.includes('xcp')) {
      await checkXCPAlerts(hostname);
    }
  } catch (e) {
    await log('error', `Error checking ${hostname}:`, e.message);
  }
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  await connectDB();
  const servers = config.servers;
  await Promise.all(
    Object.entries(servers).map(([hostname, services]) =>
      checkServer(hostname, services)
    )
  );
  await closeDB();
}

// Graceful shutdown
function shutdownHandler(signal) {
  log('info', `Received ${signal}, shutting down...`).then(() => {
    closeDB()
      .then(() => {
        log('info', 'MySQL connection closed.').then(() => process.exit(0));
      })
      .catch((err) => {
        log('error', 'Error closing MySQL connection:', err.message).then(() => process.exit(1));
      });
  });
}
process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

main();
