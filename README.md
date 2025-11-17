![github-background](https://github.com/user-attachments/assets/f728f52e-bf67-4357-9ba2-c24c437488e3)

<div align="center">
  <h3 align="center">Kan</h3>
  <p>The open-source project management alternative to Trello.</p>
</div>

<p align="center">
  <a href="https://kan.bn/kan/roadmap">Roadmap</a>
  ·
  <a href="https://kan.bn">Website</a>
  ·
  <a href="https://docs.kan.bn">Docs</a>
  ·
  <a href="https://discord.gg/e6ejRb6CmT">Discord</a>
</p>

<div align="center">
  <a href="https://github.com/kanbn/kan/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPLv3-purple"></a>
</div>

## Features 💫

- 👁️ **Board Visibility**: Control who can view and edit your boards
- 🤝 **Workspace Members**: Invite members and collaborate with your team
- 🚀 **Trello Imports**: Easily import your Trello boards
- 🔍 **Labels & Filters**: Organise and find cards quickly
- 💬 **Comments**: Discuss and collaborate with your team
- 📝 **Activity Log**: Track all card changes with detailed activity history
- 🎨 **Templates** : Save time with reusable custom board templates
- ⚡️ **Integrations (coming soon)** : Connect your favourite tools

See our [roadmap](https://kan.bn/kan/roadmap) for upcoming features.

## Screenshot 👁️

<img width="1507" alt="hero-dark" src="https://github.com/user-attachments/assets/5f7b6ad3-f31d-4b45-93dc-0132b3f2afd4" />

## Made With 🛠️

- [Next.js](https://nextjs.org/?ref=kan.bn)
- [tRPC](https://trpc.io/?ref=kan.bn)
- [Better Auth](https://better-auth.com/?ref=kan.bn)
- [Tailwind CSS](https://tailwindcss.com/?ref=kan.bn)
- [Drizzle ORM](https://orm.drizzle.team/?ref=kan.bn)
- [React Email](https://react.email/?ref=kan.bn)

## Self Hosting 🐳

The easiest way to self-host Kan is with Docker Compose. This will set up everything for you including your postgres database.

1. Create a new file called `docker-compose.yml` and paste the following configuration:

```yaml
services:
  web:
    image: ghcr.io/kanbn/kan:latest
    container_name: kan-web
    ports:
      - "3000:3000"
    networks:
      - kan-network
    environment:
      NEXT_PUBLIC_BASE_URL: http://localhost:3000
      BETTER_AUTH_SECRET: your_auth_secret
      POSTGRES_URL: postgresql://kan:your_postgres_password@postgres:5432/kan_db
      NEXT_PUBLIC_ALLOW_CREDENTIALS: true
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    container_name: kan-db
    environment:
      POSTGRES_DB: kan_db
      POSTGRES_USER: kan
      POSTGRES_PASSWORD: your_postgres_password
    ports:
      - 5432:5432
    volumes:
      - kan_postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - kan-network

networks:
  kan-network:

volumes:
  kan_postgres_data:
```

2. Start the containers in detached mode:

```bash
docker compose up -d
```

3. Access Kan at http://localhost:3000

The application will be running in the background. You can manage the containers using these commands:

- To stop the containers: `docker compose down`
- To view logs: `docker compose logs -f`
- To restart the containers: `docker compose restart`

For the complete Docker Compose configuration, see [docker-compose.yml](./docker-compose.yml) in the repository.

> **Note**: The Docker Compose configuration shown above is a minimal example. For a complete setup with all features (email, OAuth, file uploads, etc.), you'll need to create a `.env` file with the required environment variables. See the Environment Variables section below for the full list of available options.

## Local Development 🧑‍💻

1. Clone the repository (or fork)

```bash
git clone https://github.com/kanbn/kan.git
```

2. Install dependencies

```bash
pnpm install
```

3. Copy `.env.example` to `.env` and configure your environment variables
4. Migrate database

```bash
pnpm db:migrate
```

5. Start the development server

```bash
pnpm dev
```

## Environment Variables 🔐

| Variable                                  | Description                                              | Required                 | Example                                                     |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| `POSTGRES_URL`                            | PostgreSQL connection URL                                | To use external database | `postgres://user:pass@localhost:5432/db`                    |
| `EMAIL_FROM`                              | Sender email address                                     | For Email                | `"Kan <hello@mail.kan.bn>"`                                 |
| `SMTP_HOST`                               | SMTP server hostname                                     | For Email                | `smtp.resend.com`                                           |
| `SMTP_PORT`                               | SMTP server port                                         | For Email                | `465`                                                       |
| `SMTP_USER`                               | SMTP username/email                                      | No                       | `resend`                                                    |
| `SMTP_PASSWORD`                           | SMTP password/token                                      | No                       | `re_xxxx`                                                   |
| `SMTP_SECURE`                             | Use secure SMTP connection (defaults to true if not set) | For Email                | `true`                                                      |
| `NEXT_PUBLIC_DISABLE_EMAIL`               | To disable all email features                            | For Email                | `true`                                                      |
| `NEXT_PUBLIC_BASE_URL`                    | Base URL of your installation                            | Yes                      | `http://localhost:3000`                                     |
| `BETTER_AUTH_SECRET`                      | Auth encryption secret                                   | Yes                      | Random 32+ char string                                      |
| `BETTER_AUTH_TRUSTED_ORIGINS`             | Allowed callback origins                                 | No                       | `http://localhost:3000,http://localhost:3001`               |
| `GOOGLE_CLIENT_ID`                        | Google OAuth client ID                                   | For Google login         | `xxx.apps.googleusercontent.com`                            |
| `GOOGLE_CLIENT_SECRET`                    | Google OAuth client secret                               | For Google login         | `xxx`                                                       |
| `DISCORD_CLIENT_ID`                       | Discord OAuth client ID                                  | For Discord login        | `xxx`                                                       |
| `DISCORD_CLIENT_SECRET`                   | Discord OAuth client secret                              | For Discord login        | `xxx`                                                       |
| `GITHUB_CLIENT_ID`                        | GitHub OAuth client ID                                   | For GitHub login         | `xxx`                                                       |
| `GITHUB_CLIENT_SECRET`                    | GitHub OAuth client secret                               | For GitHub login         | `xxx`                                                       |
| `OIDC_CLIENT_ID`                          | Generic OIDC client ID                                   | For OIDC login           | `xxx`                                                       |
| `OIDC_CLIENT_SECRET`                      | Generic OIDC client secret                               | For OIDC login           | `xxx`                                                       |
| `OIDC_DISCOVERY_URL`                      | OIDC discovery URL                                       | For OIDC login           | `https://auth.example.com/.well-known/openid-configuration` |
| `TRELLO_APP_API_KEY`                      | Trello app API key                                       | For Trello import        | `xxx`                                                       |
| `TRELLO_APP_API_SECRET`                   | Trello app API secret                                    | For Trello import        | `xxx`                                                       |
| `S3_REGION`                               | S3 storage region                                        | For file uploads         | `WEUR`                                                      |
| `S3_ENDPOINT`                             | S3 endpoint URL                                          | For file uploads         | `https://xxx.r2.cloudflarestorage.com`                      |
| `S3_ACCESS_KEY_ID`                        | S3 access key                                            | For file uploads         | `xxx`                                                       |
| `S3_SECRET_ACCESS_KEY`                    | S3 secret key                                            | For file uploads         | `xxx`                                                       |
| `S3_FORCE_PATH_STYLE`                     | Use path-style URLs for S3                               | For file uploads         | `true`                                                      |
| `NEXT_PUBLIC_STORAGE_URL`                 | Storage service URL                                      | For file uploads         | `https://storage.kanbn.com`                                 |
| `NEXT_PUBLIC_STORAGE_DOMAIN`              | Storage domain name                                      | For file uploads         | `kanbn.com`                                                 |
| `NEXT_PUBLIC_AVATAR_BUCKET_NAME`          | S3 bucket name for avatars                               | For file uploads         | `avatars`                                                   |
| `NEXT_PUBLIC_ATTATCHMENTS_BUCKET_NAME`    | S3 bucket name for attatchments                          | For file uploads         | `attatchments`                                              |
| `NEXT_PUBLIC_ALLOW_CREDENTIALS`           | Allow email & password login                             | For authentication       | `true`                                                      |
| `NEXT_PUBLIC_DISABLE_SIGN_UP`             | Disable sign up                                          | For authentication       | `false`                                                     |
| `NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY` | Hide “Powered by kan.bn” on public boards (self-host)    | For white labelling      | `true`                                                      |

See `.env.example` for a complete list of supported environment variables.

## Contributing 🤝

We welcome contributions! Please read our [contribution guidelines](CONTRIBUTING.md) before submitting a pull request.

## Contributors 👥

<a href="https://github.com/kanbn/kan/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kanbn/kan" />
</a>

## License 📝

Kan is licensed under the [AGPLv3 license](LICENSE).

## Contact 📧

For support or to get in touch, please email [henry@kan.bn](mailto:henry@kan.bn) or join our [Discord server](https://discord.gg/e6ejRb6CmT).
