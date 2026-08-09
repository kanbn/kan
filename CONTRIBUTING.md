# Contributing to Kan

Thank you for your interest in contributing to Kan!

## Before you start

**Open an issue before writing code for a new feature.**

Feature PRs opened without a prior approved issue will be closed without review - not because the idea is bad, but because we can't review code for features we haven't aligned on yet. This protects your time as much as ours.

The process is:

1. Open a [feature request](https://github.com/kanbn/kan/issues/new?template=feature_request.md) and describe what you want to build
2. Wait for a maintainer to respond and signal approval (we aim to respond within a few days)
3. Once approved, open a PR that links the issue

Bug fixes and documentation improvements don't need prior approval - just open a PR.

---

## Getting started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/kan.git`
3. Create a branch: `git checkout -b feat/your-feature-name` or `fix/your-fix-name`
4. Install dependencies: `pnpm install`
5. Copy `.env.example` to `.env` and configure your environment variables
6. Make your changes
7. Commit using [conventional commits](https://www.conventionalcommits.org/): `git commit -m "feat: description"`
8. Push and open a Pull Request

## Pull request expectations

- Link the related issue (required for features)
- Write a clear description of what changed and why
- Include screenshots for any UI changes
- Keep PRs focused - one feature or fix per PR
- All CI checks must pass before review

## Code style

- Follow the existing patterns in the codebase
- Use meaningful names - avoid comments that just restate what the code does
- Keep functions focused and concise

## Need help?

- Join our [Discord server](https://discord.gg/e6ejRb6CmT)
- Check existing issues and PRs before opening new ones
- Email [henry@kan.bn](mailto:henry@kan.bn) for major concerns

## License

By contributing to Kan, you agree that your contributions will be licensed under the AGPLv3 License.
