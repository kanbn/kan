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
- 🎨 **Templates (coming soon)** : Save time with reusable board templates
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

### PostgreSQL Database Setup

Kan requires a PostgreSQL database. You can run one using the official PostgreSQL Docker image:

```bash
# Run PostgreSQL in a container using the official postgres image
docker run -d \
  --name kan-db \
  -e POSTGRES_DB=kan \
  -e POSTGRES_USER=kan_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v kan_postgres_data:/var/lib/postgresql/data \
  postgres:15

# Your POSTGRES_URL should be:
# postgres://kan_user:your_secure_password@your_host:5432/kan
```

### Kan Application Deployment

Deploy Kan with Docker using our pre-built image:

```bash
docker pull ghcr.io/kanbn/kan:latest && docker run -it -p 3000:3000 --env-file .env ghcr.io/kanbn/kan:latest
```

Make sure to create a `.env` file with the required environment variables (see the Environment Variables section below).

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

| Variable                         | Description                   | Required           | Example                                       |
| -------------------------------- | ----------------------------- | ------------------ | --------------------------------------------- |
| `POSTGRES_URL`                   | PostgreSQL connection URL     | Yes                | `postgres://user:pass@localhost:5432/db`      |
| `EMAIL_FROM`                     | Sender email address          | For Email          | `"Kan <hello@mail.kan.bn>"`                   |
| `SMTP_HOST`                      | SMTP server hostname          | For Email          | `smtp.resend.com`                             |
| `SMTP_PORT`                      | SMTP server port              | For Email          | `465`                                         |
| `SMTP_USER`                      | SMTP username/email           | For Email          | `resend`                                      |
| `SMTP_PASSWORD`                  | SMTP password/token           | For Email          | `re_xxxx`                                     |
| `NEXT_PUBLIC_BASE_URL`           | Base URL of your installation | Yes                | `http://localhost:3000`                       |
| `BETTER_AUTH_SECRET`             | Auth encryption secret        | Yes                | Random 32+ char string                        |
| `BETTER_AUTH_TRUSTED_ORIGINS`    | Allowed callback origins      | No                 | `http://localhost:3000,http://localhost:3001` |
| `GOOGLE_CLIENT_ID`               | Google OAuth client ID        | For Google login   | `xxx.apps.googleusercontent.com`              |
| `GOOGLE_CLIENT_SECRET`           | Google OAuth client secret    | For Google login   | `xxx`                                         |
| `DISCORD_CLIENT_ID`              | Discord OAuth client ID       | For Discord login  | `xxx`                                         |
| `DISCORD_CLIENT_SECRET`          | Discord OAuth client secret   | For Discord login  | `xxx`                                         |
| `GITHUB_CLIENT_ID`               | GitHub OAuth client ID        | For GitHub login   | `xxx`                                         |
| `GITHUB_CLIENT_SECRET`           | GitHub OAuth client secret    | For GitHub login   | `xxx`                                         |
| `TRELLO_APP_API_KEY`             | Trello app API key            | For Trello import  | `xxx`                                         |
| `TRELLO_APP_API_SECRET`          | Trello app API secret         | For Trello import  | `xxx`                                         |
| `S3_REGION`                      | S3 storage region             | For file uploads   | `WEUR`                                        |
| `S3_ENDPOINT`                    | S3 endpoint URL               | For file uploads   | `https://xxx.r2.cloudflarestorage.com`        |
| `S3_ACCESS_KEY_ID`               | S3 access key                 | For file uploads   | `xxx`                                         |
| `S3_SECRET_ACCESS_KEY`           | S3 secret key                 | For file uploads   | `xxx`                                         |
| `NEXT_PUBLIC_STORAGE_URL`        | Storage service URL           | For file uploads   | `https://storage.kanbn.com`                   |
| `NEXT_PUBLIC_STORAGE_DOMAIN`     | Storage domain name           | For file uploads   | `kanbn.com`                                   |
| `NEXT_PUBLIC_AVATAR_BUCKET_NAME` | S3 bucket name for avatars    | For file uploads   | `avatars`                                     |
| `NEXT_PUBLIC_ALLOW_CREDENTIALS`  | Allow email & password login  | For authentication | `true`                                        |
| `NEXT_PUBLIC_DISABLE_SIGN_UP`    | Disable sign up               | For authentication | `false`                                       |

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
