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

1. Clone repository and install its deps
```sh
git clone https://github.com/devoverid/aksaria.git
cd aksaria
bun install
bun prisma
```

2. Copy `.env.example` file with `cp .env.example .env` and configure database:

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
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
```

3. Do migrations with `Makefile`

```sh
make migrate-up
# Use this command below if you want to reset all of the data on database
make migrate-reset
```

4. Deploy its commands and launch the bot

```sh
bun commands
bun start
```

<h3 id="develop-docker">🐳 Develop w/ Docker</h3>

1. Clone the repository
```sh
git clone https://github.com/devoverid/aksaria.git
cd aksaria
```

2. Copy `.env.example` file with `cp .env.example .env` and configure database:

```yml
APP_TOKEN=MTQxxxxxxxxxxxx
GUILD_ID=99999999999999
APP_ID=99999999999999

DB_HOST=db
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
```

3. Make sure you have Docker installed and run:
```bash
docker compose up --build -d
```

<h4 id="docker-commands">🔐 Commands</h4>

- Bun
- - `docker compose run --rm --entrypoint "" app bunx prisma migrate reset`
- PostgreSQL
- - `docker compose exec db psql -U postgres -d aksaria`

<h2 id="production">🌐 Production</h2>

<h3 id="deployment-docker-vps">🐳 Deployment w/ Docker (use Virtual Private Server)</h3>

- Clone the repository w/ SSH method `git clone git@github.com:devoverid/aksaria` and go to the directory with `cd aksaria` command.

- Copy `.env.example` file to `.env` and do configs.

```yml
APP_TOKEN=MTQxxxxxxxxxxxx
GUILD_ID=99999999999999
APP_ID=99999999999999

DB_HOST=db
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
```

- Let's deploy with `docker compose -f ./docker-compose.prod.yaml up -d` command.

- Congrats! The bot is running securely, connected to persistent Postgres, and auto-updating when `devover/aksaria:latest` changes.

<h4 id="docker-commands-for-production">🔐 Commands</h4>

- `docker compose -f docker-compose.prod.yml ps`
- `docker compose -f docker-compose.prod.yml logs -f app`
- `docker compose -f docker-compose.prod.yml logs -f watchtower`
- `docker compose -f docker-compose.prod.yml logs -f db`

<h2 id="support">💌 Support us</h2>

<p>You can support us and the further development of Aksaria! Even the smallest contribution goes a long way. Giving a ⭐️ to this repo or sharing it with others is already greatly appreciated.<br><br>
If you'd like to treat us to a coffee, you can support via Trakteer:<br>
<a href="https://trakteer.id/aksaria" target="_blank"><img id="wse-buttons-preview" src="https://cdn.trakteer.id/images/embed/trbtn-red-2.png" height="40" style="border:0px;height:40px;" alt="Trakteer Us"></a>


<h2 id="contributing">🤝 Contributing</h2>

<p>Contributions, issues, and feature requests are highly appreciated as this application is far from perfect. Please do not hesitate to make a pull request and make changes to this project!</p>

<h2 id="lisensi">📝 License</h2>

Aksaria is open-sourced software licensed under the [MIT License](./LICENSE).