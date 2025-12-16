<h1 align="center">Welcome to Aksaria! 👋</h1>

[![All Contributors](https://img.shields.io/github/contributors/devoverid/aksaria)](https://github.com/devoverid/aksaria/graphs/contributors)
![GitHub last commit](https://img.shields.io/github/last-commit/devoverid/aksaria)

<h2 id="about">🤔 What is Aksaria?</h2>

> *"Where discipline meets destiny."*

Aksaria is a Discord-based community and system designed for those who choose discipline, consistency, and long-term growth. In a world saturated with distractions, Aksaria emerges as a space where each day is recorded, every step is acknowledged, and every spark is carefully tended🌸.

We call those who walk this path Grinders.

<h2 id="features">🤨 What features are available in Aksaria?</h2>

- **Daily Check-In System**

    Log your consistency and discipline daily to maintain your streak and unlock new roles.

- **Dynamic Streak Roles**

    Special Discord roles are awarded based on your check-in streaks, marking milestones and dedication.

- **Discord Slash Commands Integration**

    Fast and intuitive command set for all server interactions directly from Discord.

- **Comprehensive User Profiles**

    Track your progression, personal stats, and received awards.

- **Streak Leaderboards *(WIP)***

    See where you stand! View rankings of Grinders based on their check-in streaks and totals.

- **Automated Reminders *(WIP)***

    Bots automatically remind you to check-in and stay on track.

- **Flexible Deployment**

    Ready to run with Docker or via local development with Bun.

- **Multi-Platform Ready**

    Runs anywhere via Docker (Linux, macOS, ARM, AMD64).

<h2 id="pre-requisite">💾 Pre-requisite</h2>

<p>Here are the prerequisites required for installing and running the application.</p>

- [Bun](https://bun.sh/) (for local development) ≥ v1.3
- [PostgreSQL](https://www.postgresql.org/) (for DB) ≥ v17.6
- [Docker](https://www.docker.com/) (for containerized deployment)
- [Make](https://www.gnu.org/software/make/) (recommended for migration scripts)

<h2 id="installation">💻 Installation</h2>

<h3 id="develop-yourself">🏃‍♂️ Develop by yourself</h3>

1. Clone repository
```sh
git clone https://github.com/alfianchii/aksaria.git
cd aksaria
bun install
```

2. Configure environment
```sh
cp .env.example .env
```

3. Database configuration through the `.env` file

```yml
# Your application's token (APP_TOKEN)
# Obtain this from the [Discord Developer Portal](https://discord.com/developers/applications):
# 1. Navigate to your application
# 2. Go to "Bot" in the sidebar
# 3. Under "Bot", you will see the "Token" section, click "Reset Token" or "Copy" to get your token.
# 4. NEVER share your token publicly
APP_TOKEN=MTQxxxxxxxxxxxx

# Your Discord server's guild id (GUILD_ID)
# To get your guild (server) ID:
# 1. In Discord, go to User Settings > Advanced, and turn on "Developer Mode"
# 2. Right-click your server's icon in the guild/server list
# 3. Click "Copy Server ID"
GUILD_ID=99999999999999

# Your application's ID (APP_ID)
# To get your application (client) ID:
# 1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
# 2. Select your application
# 3. Your App's "Application ID" (Client ID) is displayed at the top under the app name
APP_ID=99999999999999

# Your DB's creds
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
```

4. Do migrations with `Makefile`

```sh
make migrate-up
```

5. Deploy its commands and launch the bot

```sh
bun commands
bun start
```

END
## Installation

### With docker

1. Create [.env](./.env.example) file
2. Run the image
```
docker run --env-file .env devover/aksaria:latest
```

### Local development (from source)

```sh
git clone https://github.com/devoverid/aksaria && cd aksaria
cp .env.example .env # and edit the required variables
make migrate-up
bun install
bun run dev
```

### Local development (docker compose)

```sh
git clone https://github.com/devoverid/aksaria && cd aksaria
cp .env.example .env # and edit the required variables
docker compose up
```

## Deploying commands

1. Update required variables `APP_TOKEN`, `GUILD_ID`, and `APP_ID` in your .env
2. Run `bun src/deploy-commands.ts`

## License

MIT license
