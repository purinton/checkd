#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const mainPath = path.join(dirname, 'src', 'main.js');
dotenv.config({ path: path.join(dirname, '.env') });

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

try {
  await import(mainPath);
} catch (err) {
  console.error('Failed to start main module:', err);
  process.exit(1);
}
