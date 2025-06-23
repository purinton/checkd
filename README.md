# [![Purinton Dev](https://purinton.us/logos/brand.png)](https://discord.gg/QSBxQnX7PF)

## @purinton/checkd [![npm version](https://img.shields.io/npm/v/@purinton/checkd.svg)](https://www.npmjs.com/package/@purinton/checkd)[![license](https://img.shields.io/github/license/purinton/checkd.svg)](LICENSE)[![build status](https://github.com/purinton/checkd/actions/workflows/nodejs.yml/badge.svg)](https://github.com/purinton/checkd/actions)

A Node.js server monitoring and alerting tool. Runs checks (CPU, disk, memory, network, services, XCP alerts) on remote hosts via SSH, logs results to MySQL, and sends alerts to Discord.

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Customization](#customization)
- [Support](#support)
- [License](#license)

## Features

- Pre-configured for Node.js (ESM)
- Environment variable support via dotenv
- Logging and signal handling via `@purinton/common`
- SSH-based remote checks for CPU, disk, memory, network, services, and XCP alerts
- Results stored in MySQL
- Discord webhook alerting for failures and warnings
- Cron-based scheduling (every 10 minutes by default)
- Jest for testing
- MIT License

## Getting Started

1. **Clone this repository:**

   ```bash
   git clone https://github.com/purinton/checkd.git
   cd checkd
   npm install
   ```

2. **Update project details:**
   - Edit `package.json` (name, description, author, etc.)
   - Update this `README.md` as needed
   - Change the license if required

3. **Configure servers:**
   - Copy `servers.json.example` to `servers.json` and edit with your hosts and services.
   - Set up your `.env` file with required environment variables (see `.env.example` if available).

## Development

- Main entry: `checkd.mjs`
- Start your app:

  ```bash
  node checkd.mjs
  ```

- Add your code in new files and import as needed.

## Testing

- Run tests with:

  ```bash
  npm test
  ```

- Add your tests in the `tests/` folder or alongside your code.

## Customization

- Replace or extend the logging and signal handling as needed.
- Add dependencies and scripts to fit your project.
- Remove or modify template files and sections.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://purinton.us/logos/discord_96.png)](https://discord.gg/QSBxQnX7PF)[![Purinton Dev](https://purinton.us/logos/purinton_96.png)](https://discord.gg/QSBxQnX7PF)

**[Purinton Dev on Discord](https://discord.gg/QSBxQnX7PF)**

## License

[MIT © 2025 Russell Purinton](LICENSE)

## Links

- [GitHub Repo](https://github.com/purinton/checkd)
- [GitHub Org](https://github.com/purinton)
- [GitHub Personal](https://github.com/rpurinton)
- [Discord](https://discord.gg/QSBxQnX7PF)
