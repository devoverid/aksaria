<h1 align="center">Welcome to Aksaria! 👋</h1>

[![All Contributors](https://img.shields.io/github/contributors/devoverid/aksaria)](https://github.com/devoverid/aksaria/graphs/contributors)
![GitHub last commit](https://img.shields.io/github/last-commit/devoverid/aksaria)

<h2 id="about">🤔 What is Aksaria?</h2>

> *"Where discipline meets destiny."*

Aksaria is a community system for Discord and Telegram designed for those who choose discipline, consistency, and long-term growth. In a world saturated with distractions, Aksaria emerges as a space where each day is recorded, every step is acknowledged, and every spark is carefully tended🌸.

We call those who walk this path Grinders.

<h2 id="features">🤨 What features are available in Aksaria?</h2>

- **Daily Check-In System**

    Log your consistency and discipline daily to maintain your streak and unlock new roles.

- **Dynamic Streak Roles**

    Special Discord roles are awarded based on your check-in streaks, marking milestones and dedication.

- **Discord Slash Commands Integration**

    Fast and intuitive command set for all server interactions directly from Discord.

- **Telegram Group Check-Ins**

    Optional Telegram adapter with group submissions, private status and details, peer review and audits, reviewer reminders, streak-loss notices and a self-serve member tag.

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

1. Clone the repository and install dependencies

```sh
git clone https://github.com/devoverid/aksaria.git
cd aksaria
bun install
bun prisma
```

2. Create the environment file

```sh
cp .env.example .env
```

Set `BOT_PLATFORMS` to choose what runs:

| `BOT_PLATFORMS` | Adapters |
| --- | --- |
| unset, empty, or `discord` | Discord only |
| `telegram` | Telegram only |
| `both` | Discord and Telegram |

Then fill in the values for the adapters you enabled:

```yml
# --- Discord (only when BOT_PLATFORMS is discord or both) ---
# Discord Developer Portal > your application > Bot > Reset Token
APP_TOKEN=

# Discord Developer Portal > your application > General Information > Application ID
APP_ID=99999999999999

# Right-click your server > Copy Server ID (Developer Mode must be enabled)
GUILD_ID=99999999999999

# --- Telegram (only when BOT_PLATFORMS is telegram or both) ---
# BotFather > /newbot > token
TELEGRAM_BOT_TOKEN=

# Canonical negative decimal id of the group/supergroup
TELEGRAM_GROUP_ID=

# Tag granted by /post_grinder_tag (1-16 ASCII letters, digits, spaces or hyphens)
TELEGRAM_MEMBER_TAG=Grinder

# --- PostgreSQL ---
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
DATABASE_URL="postgresql://postgres:password@localhost:5432/aksaria"
```

> Keep `DATABASE_URL` in `.env`; `prisma.config.ts` loads that file for Prisma CLI commands such as `bun x prisma migrate deploy` and `make migrate-up`. You can also export it in the shell if you prefer.

3. Prepare Discord (skip when `BOT_PLATFORMS=telegram`)

- Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
- Under **Bot > Privileged Gateway Intents**, enable **Message Content Intent** and **Server Members Intent**.
- Invite the bot with the `bot` and `applications.commands` scopes. It needs at least View Channels, Send Messages, Read Message History, Embed Links, Attach Files, Manage Messages, Manage Roles, and Use Application Commands in the relevant channels.
- The bot's highest role must be above any role it grants or removes. Users who run `/create-embed-role-grant` or `/send-message` need **Manage Server**.
- Put the token, application ID, and guild ID in `.env`.

4. Prepare Telegram (skip when `BOT_PLATFORMS=discord`)

- Create a bot with [BotFather](https://t.me/BotFather) and put its token in `TELEGRAM_BOT_TOKEN`.
- Keep **privacy mode enabled** (BotFather `/setprivacy` → Enable). The bot only handles its commands and the configured group.
- Add the bot to a group or supergroup, then promote it to **administrator** with the **Manage Tags** right. Startup fails if this right is missing. Using a supergroup avoids a chat-id change if the group is upgraded later.
- Make sure the bot has no webhook configured, because Aksaria uses long polling:

  ```sh
  curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook"
  ```

- Set `TELEGRAM_GROUP_ID` to the group's negative decimal id (for example `-1001234567890`). Before starting Aksaria, you can read it from a Telegram client that exposes chat IDs, or from `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates` (look at `message.chat.id` or `my_chat_member.chat.id`).
- Start the bot once; it registers the group, administrator, and private command menus automatically. Members can then open `https://t.me/<bot_username>` and send `/start` for private status and details.
- A moderator can post the tag claim message in the group with `/post_grinder_tag`.

Telegram command reference:

| Where | Command | Purpose |
| --- | --- | --- |
| Group | `/checkin <description>` | Submit today's check-in, with a photo/document attached or replied to |
| Group | `/checkin_status`, `/checkin_details` | Return the private Start link |
| Group | `/ping` | Reply `Pong!` |
| Group | `/help`, `/start` | Show group instructions |
| Group | `/post_grinder_tag` | Moderators: post the self-serve tag button |
| Private | `/start` | Opt in to private status and details |
| Private | `/checkin_status` | Show today's state and current streak |
| Private | `/checkin_details <ID>` | Show one of your check-ins and its proof |
| Private | `/checkin_review [ID] [approve\|reject] [comment]` | Group members: review another member's check-in; not your own |
| Private | `/checkin_audit <ID> approve [comment]` | Group members: approve an older waiting check-in; not your own |

5. Create the database and run migrations

```sh
createdb aksaria
export DATABASE_URL="postgresql://postgres:password@localhost:5432/aksaria"
bun x prisma migrate deploy
# or: make migrate-up
```

`make migrate-reset` deletes all data and is only for disposable databases.

6. Deploy Discord commands and start the application

```sh
# Discord or both only; skip for BOT_PLATFORMS=telegram
bun commands

# Watch mode for development
bun start
# Non-watch mode
bun run prod
```

7. Run the tests against a disposable, migrated PostgreSQL database

```sh
DATABASE_URL="postgresql://postgres:password@localhost:5432/aksaria_test" bun test
```

<h3 id="develop-docker">🐳 Develop w/ Docker</h3>

1. Clone the repository

```sh
git clone https://github.com/devoverid/aksaria.git
cd aksaria
```

2. Copy `.env.example` to `.env` and configure it.

For Compose, the database host is the `db` service:

```yml
BOT_PLATFORMS=discord # discord | telegram | both

# Discord (only when BOT_PLATFORMS is discord or both)
APP_TOKEN=
APP_ID=99999999999999
GUILD_ID=99999999999999

# Telegram (only when BOT_PLATFORMS is telegram or both)
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_ID=
TELEGRAM_MEMBER_TAG=Grinder

# PostgreSQL
DB_HOST=db
DB_PORT=5432
DB_NAME=aksaria
DB_USER=postgres
DB_PASS=password
DATABASE_URL="postgresql://postgres:password@db:5432/aksaria"
```

3. Build and start

```sh
docker compose up --build -d
```

The container entrypoint applies Prisma migrations, deploys Discord commands when `BOT_PLATFORMS` is `discord` or `both`, and then starts the application. Telegram command menus are registered by the application on startup.

<h4 id="docker-commands">🔐 Commands</h4>

- Follow logs: `docker compose logs -f app`
- Open a shell in the app container: `docker compose run --rm --entrypoint "" app sh`
- Reset a disposable database: `docker compose run --rm --entrypoint "" app bun x prisma migrate reset`
- PostgreSQL shell: `docker compose exec db psql -U postgres -d aksaria`

<h2 id="production">🌐 Production</h2>

<h3 id="deployment-docker-vps">🐳 Deployment w/ Docker (use Virtual Private Server)</h3>

- Clone the repository with SSH and enter the directory:

  ```sh
  git clone git@github.com:devoverid/aksaria
  cd aksaria
  ```

- Copy `.env.example` to `.env` and configure it the same way as the Docker development setup. Use `DB_HOST=db` and a `DATABASE_URL` whose host is also `db`.

- Set `BOT_PLATFORMS` to `discord`, `telegram`, or `both`. Only enable Telegram when `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID`, and the bot's admin/Manage Tags setup are ready; startup fails otherwise.

- Deploy:

  ```sh
  docker compose -f ./docker-compose.prod.yml up -d
  ```

The production image runs migrations on startup, deploys Discord commands only in `discord`/`both` mode, and starts the configured adapters. Watchtower tracks `devover/aksaria:latest`, so publish a new image (for example with `make release`) to roll out changes.

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