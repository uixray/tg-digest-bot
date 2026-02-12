# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02

### Added

- **Core Features**
  - Message collection from Telegram channels via GramJS (MTProto)
  - Digest generation with channel grouping
  - AI summarization support (LM Studio, YandexGPT)
  - Scheduled auto-digests via cron
  - Owner-only access via middleware

- **Channel Management**
  - Add/remove channels with `/add` and `/remove`
  - Channel types with emoji (personal, company, digest, news, tech, other)
  - Custom channel types via `/addtype`
  - Type assignment on channel add or via `/settype`

- **Digest Features**
  - Period selection: 24h, 3d, 1w
  - Filter by channel types
  - Media indicators (photo, video, document, etc.)
  - HTML formatting with message links
  - Long message splitting (>4096 chars)

- **User Experience**
  - Context-aware onboarding (different for new/returning users)
  - Main menu with logical button grouping
  - Cron schedule presets (daily, weekdays, weekly, twice daily)
  - Human-readable cron display in Russian
  - Example digest for new users

- **Settings**
  - AI provider selection via buttons
  - Schedule presets and manual cron input
  - Settings persistence in database

- **Infrastructure**
  - PostgreSQL database via Prisma ORM
  - pm2 process management
  - Windows batch scripts for management
  - Comprehensive documentation

### Security

- Owner-only middleware
- HTML escaping for XSS prevention
- Rate limiting between channel requests
- Secrets in environment variables
- .gitignore for sensitive files

---

## [Unreleased]

### Planned for v1.1 (RAG Search)

- Vector search with pgvector
- Local embeddings via @xenova/transformers
- Natural language queries (`/search`, `/ask`)
- Image descriptions for media messages
- Similar messages feature

### Planned for v1.2 (Obsidian Integration)

- Markdown export for digests
- Obsidian vault integration
- YAML frontmatter with metadata
- Auto-export on digest creation
- Customizable templates

### Planned for v2.0 (Multi-user)

- Multiple user support
- Web admin interface
- Shared digests
- User permissions
