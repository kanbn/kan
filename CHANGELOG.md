# Changelog

``` yaml
Kan Portuguese version. If you adjust anything, remember to run:
docker build -f apps/web/Dockerfile -t jovaniojunior/kan-ptbr:latest .
docker push jovaniojunior/kan-ptbr:latest

Until the Portuguese version is available on the official website, I use it for Umbrel on my Docker Hub:
docker.io/jovaniojunior/kan-ptbr:latest
https://hub.docker.com/r/jovaniojunior/kan-ptbr/tags
docker pull jovaniojunior/kan-ptbr:latest
```



All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/kanbn/kan/compare/v0.2.4...HEAD)

## [0.2.4](https://github.com/kanbn/kan/compare/v0.2.3...v0.2.4) - 2025-01-14

### Added

- Button to view and update board public URL directly from board page
- Redirect from root to login page for self-hosted instances

### Changed

- Updated all label router endpoints to return consistent structure
- Added verbose error logging to magic link invitation process

### Fixed

- Updated tRPC dependencies and added OpenAPI meta to providers endpoint

## [0.2.3](https://github.com/kanbn/kan/compare/v0.2.2...v0.2.3) - 2025-07-07

### Added

- Mobile support with responsive navigation and layout
- Template selection when creating new boards with predefined lists and labels
- S3_FORCE_PATH_STYLE configuration for MinIO compatibility

### Changed

- Improved mobile UI styling and layout containers
- Enhanced iOS mobile support with viewport fixes and zoom prevention
- Improved card view layout for mobile devices

### Fixed

- Mobile dashboard min-width issues
- Dynamic viewport height on mobile devices
- Scroll functionality on card pages

## [0.2.2](https://github.com/kanbn/kan/compare/v0.2.1...v0.2.2) - 2025-06-28

### Added

- Localization and multi-language support
- URLs are now rendered as clickable links in card descriptions

### Changed

- Improved email configuration with optional SMTP authentication

## [0.2.1](https://github.com/kanbn/kan/compare/v0.2.0...v0.2.1) - 2025-06-19

### Added

- PostHog analytics integration
- Debug logging for email functionality
- Standalone mode support for Next.js
- Environment variable for configuring web port
- Docker Compose setup with PostgreSQL

### Changed

- SMTP authentication is now optional
- Added `SMTP_SECURE` configuration option
- Improved Docker build process with better context handling

### Fixed

- Default output mode for Next.js builds
- Container environment variable configuration
- Docker Compose volume naming
- Build context and static file copying in Docker
- Comment rendering inside contenteditable elements

## [0.2.0](https://github.com/kanbn/kan/compare/v0.1.0...v0.2.0) - 2025-06-10

### Added

- Trello integration with OAuth authentication and user field mapping
- Board visibility controls with dropdown menu and success notifications
- Markdown editor for card descriptions
- Email/password authentication for self-hosters
- Account deletion functionality with cascade delete for workspaces
- Enhanced scrollbar styles for dark mode

### Changed

- Simplified auth configuration to use `NEXT_PUBLIC_BASE_URL` instead of `BETTER_AUTH_URL`
- Updated self-hosting documentation
- Improved database schema with relation names

### Fixed

- List buttons stacking issue
- Editor onChange prop is now optional
- Renamed markdown prop to content in Editor component
- Router navigation for disabled signup redirects

## [0.1.0](https://github.com/kanbn/kan/releases/tag/v0.1.0) - 2025-06-02

### Added

- Initial release of Kan
- Core project management features
- Board, list, and card management
- User authentication system
- Workspace collaboration
- Comment system
- Activity logging
- Docker deployment support
- Self-hosting capabilities

### Changed

- Updated license link in footer
