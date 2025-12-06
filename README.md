# Aksaria Bot

A discord bot that helps you to become consistent in grinding

## Installation

### With docker

1. Create [.env](./.env.example) file
2. Run the image
```
docker run --env-file .env zuramai/aksaria:latest
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
