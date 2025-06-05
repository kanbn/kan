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

| Variable                         | Description                   | Required         | Example                                       |
| -------------------------------- | ----------------------------- | ---------------- | --------------------------------------------- |
| `POSTGRES_URL`                   | PostgreSQL connection URL     | Yes              | `postgres://user:pass@localhost:5432/db`      |
| `EMAIL_FROM`                     | Sender email address          | Yes              | `"Kan <hello@mail.kan.bn>"`                   |
| `SMTP_HOST`                      | SMTP server hostname          | Yes              | `smtp.resend.com`                             |
| `SMTP_PORT`                      | SMTP server port              | Yes              | `465`                                         |
| `SMTP_USER`                      | SMTP username/email           | Yes              | `resend`                                      |
| `SMTP_PASSWORD`                  | SMTP password/token           | Yes              | `re_xxxx`                                     |
| `NEXT_PUBLIC_BASE_URL`           | Base URL of your installation | Yes              | `http://localhost:3000`                       |
| `BETTER_AUTH_SECRET`             | Auth encryption secret        | Yes              | Random 32+ char string                        |
| `BETTER_AUTH_URL`                | Auth callback URL             | Yes              | Same as `NEXT_PUBLIC_BASE_URL`                |
| `BETTER_AUTH_TRUSTED_ORIGINS`    | Allowed callback origins      | For Google login | `http://localhost:3000,http://localhost:3001` |
| `GOOGLE_CLIENT_ID`               | Google OAuth client ID        | For Google login | `xxx.apps.googleusercontent.com`              |
| `GOOGLE_CLIENT_SECRET`           | Google OAuth client secret    | For Google login | `xxx`                                         |
| `DISCORD_CLIENT_ID`              | Discord OAuth client ID       | For Discord login | `xxx`                                         |
| `DISCORD_CLIENT_SECRET`          | Discord OAuth client secret   | For Discord login | `xxx`                                         |
| `GITHUB_CLIENT_ID`               | GitHub OAuth client ID        | For GitHub login | `xxx`                                         |
| `GITHUB_CLIENT_SECRET`           | GitHub OAuth client secret    | For GitHub login | `xxx`                                         |
| `GITLAB_CLIENT_ID`               | GitLab OAuth client ID        | For GitLab login | `xxx`                                         |
| `GITLAB_CLIENT_SECRET`           | GitLab OAuth client secret    | For GitLab login | `xxx`                                         |
| `GITLAB_ISSUER`                  | GitLab OAuth issuer           | For GitLab login | `xxx`                                         |
| `MICROSOFT_CLIENT_ID`            | Microsoft OAuth client ID     | For Microsoft login | `xxx`                                         |
| `MICROSOFT_CLIENT_SECRET`        | Microsoft OAuth client secret | For Microsoft login | `xxx`                                         |
| `TWITTER_CLIENT_ID`              | Twitter OAuth client ID       | For Twitter login | `xxx`                                         |
| `TWITTER_CLIENT_SECRET`          | Twitter OAuth client secret   | For Twitter login | `xxx`                                         |
| `KICK_CLIENT_ID`                 | Kick OAuth client ID          | For Kick login    | `xxx`                                         |
| `KICK_CLIENT_SECRET`             | Kick OAuth client secret      | For Kick login    | `xxx`                                         |
| `ZOOM_CLIENT_ID`                 | Zoom OAuth client ID          | For Zoom login    | `xxx`                                         |
| `ZOOM_CLIENT_SECRET`             | Zoom OAuth client secret      | For Zoom login    | `xxx`                                         |
| `DROPBOX_CLIENT_ID`              | Dropbox OAuth client ID       | For Dropbox login | `xxx`                                         |
| `DROPBOX_CLIENT_SECRET`          | Dropbox OAuth client secret   | For Dropbox login | `xxx`                                         |
| `VK_CLIENT_ID`                   | VK OAuth client ID            | For VK login      | `xxx`                                         |
| `VK_CLIENT_SECRET`               | VK OAuth client secret        | For VK login      | `xxx`                                         |
| `LINKEDIN_CLIENT_ID`             | LinkedIn OAuth client ID      | For LinkedIn login | `xxx`                                         |
| `LINKEDIN_CLIENT_SECRET`         | LinkedIn OAuth client secret  | For LinkedIn login | `xxx`                                         |
| `REDDIT_CLIENT_ID`               | Reddit OAuth client ID        | For Reddit login  | `xxx`                                         |
| `REDDIT_CLIENT_SECRET`           | Reddit OAuth client secret    | For Reddit login  | `xxx`                                         |
| `ROBLOX_CLIENT_ID`               | Roblox OAuth client ID        | For Roblox login  | `xxx`                                         |
| `ROBLOX_CLIENT_SECRET`           | Roblox OAuth client secret    | For Roblox login  | `xxx`                                         |
| `SPOTIFY_CLIENT_ID`              | Spotify OAuth client ID       | For Spotify login | `xxx`                                         |
| `SPOTIFY_CLIENT_SECRET`          | Spotify OAuth client secret   | For Spotify login | `xxx`                                         |
| `TIKTOK_CLIENT_ID`               | TikTok OAuth client ID        | For TikTok login  | `xxx`                                         |
| `TIKTOK_CLIENT_SECRET`           | TikTok OAuth client secret    | For TikTok login  | `xxx`                                         |
| `TIKTOK_CLIENT_KEY`              | TikTok OAuth client key       | For TikTok login  | `xxx`                                         |
| `TWITCH_CLIENT_ID`               | Twitch OAuth client ID        | For Twitch login  | `xxx`                                         |
| `TWITCH_CLIENT_SECRET`           | Twitch OAuth client secret    | For Twitch login  | `xxx`                                         |
| `APPLE_CLIENT_ID`                | Apple OAuth client ID         | For Apple login   | `xxx`                                         |
| `APPLE_CLIENT_SECRET`            | Apple OAuth client secret     | For Apple login   | `xxx`                                         |
| `APPLE_APP_BUNDLE_IDENTIFIER`    | Apple OAuth app bundle identifier | For Apple login | `xxx`                                         |
| `S3_REGION`                      | S3 storage region             | For file uploads | `WEUR`                                        |
| `S3_ENDPOINT`                    | S3 endpoint URL               | For file uploads | `https://xxx.r2.cloudflarestorage.com`        |
| `S3_ACCESS_KEY_ID`               | S3 access key                 | For file uploads | `xxx`                                         |
| `S3_SECRET_ACCESS_KEY`           | S3 secret key                 | For file uploads | `xxx`                                         |
| `NEXT_PUBLIC_STORAGE_URL`        | Storage service URL           | For file uploads | `https://storage.kanbn.com`                   |
| `NEXT_PUBLIC_STORAGE_DOMAIN`     | Storage domain name           | For file uploads | `storage.kanbn.com`                           |
| `NEXT_PUBLIC_AVATAR_BUCKET_NAME` | S3 bucket name for avatars    | For file uploads | `avatars`                                     |

See `.env.example` for a complete list of supported environment variables.

## Contributing 🤝

We welcome contributions! Please read our [contribution guidelines](CONTRIBUTING.md) before submitting a pull request.

## License 📝

Kan is licensed under the [AGPLv3 license](LICENSE).

## Contact 📧

For support or to get in touch, please email [henry@kan.bn](mailto:henry@kan.bn) or join our [Discord server](https://discord.gg/e6ejRb6CmT).
