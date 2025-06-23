#!/usr/bin/env node
import 'dotenv/config';
import { log, fs, path, registerHandlers, registerSignals } from '@purinton/common';
import cron from 'node-cron';
import { createDb } from '@purinton/mysql';
import { sshExec } from '@purinton/ssh-client';
import { sendMessage } from '@purinton/discord-webhook';
import { checkServices } from './checks/services.mjs';
import { checkCPU } from './checks/cpu.mjs';
import { checkMemory } from './checks/memory.mjs';
import { checkDisk } from './checks/disk.mjs';
import { checkDiskIO } from './checks/diskIo.mjs';
import { checkNetworkIO } from './checks/networkIo.mjs';
import { checkLoadAverages } from './checks/loadAverages.mjs';
import { checkXCPAlerts } from './checks/xcpAlerts.mjs';
import { checkHostOnline } from './checks/hostOnline.mjs';

async function checkServer(db, userAtHost, services) {
    const { username, host } = userAtHost.split('@');
    const params = { username, host, services, log, db, sshExec, sendMessage };
    try {
        const online = await checkHostOnline(params);
        if (!online) return;
        await checkServices(params);
        await checkCPU(params);
        await checkMemory(params);
        await checkDisk(params);
        await checkDiskIO(params);
        await checkNetworkIO(params);
        await checkLoadAverages(params);
        if (host.includes('xcp')) {
            await checkXCPAlerts(params);
        }
    } catch (e) {
        await log('error', `Error checking ${userAtHost}:`, e.message);
    }
}

async function runAllChecks(db) {
    const configFile = path(import.meta, 'servers.json');
    const config = JSON.parse(fs.readFile(configFile, 'utf8'));
    await Promise.all(
        Object.entries(config).map(([userAtHost, services]) =>
            checkServer(db, userAtHost, services)
        )
    );
}

if (process.env.NODE_ENV !== 'test') {
    registerHandlers({ log });

    const db = await createDb();
    registerSignals({ log, shutdownHook: () => db.end() });

    await runAllChecks(db);

    cron.schedule('*/10 * * * *', async () => {
        await runAllChecks(db);
        await log('info', 'Checks completed by cron schedule.');
    });

    process.stdin.resume();
}