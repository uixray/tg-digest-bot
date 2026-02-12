# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by creating a private issue or contacting the maintainer directly.

**Please do not open public issues for security vulnerabilities.**

## Security Considerations

### Authentication & Authorization

1. **Owner-only access**: The bot uses middleware (`auth.ts`) that checks `ctx.from.id === OWNER_CHAT_ID` to ensure only the configured owner can interact with the bot.

2. **GramJS Session**: The userbot session is stored as a string in `.env`. This session provides full access to your Telegram account.
   - Never share your session string
   - Never commit `.env` to version control
   - If you suspect session compromise, revoke all sessions in Telegram settings

### Data Protection

1. **Environment Variables**: All secrets are stored in `.env`:
   - `BOT_TOKEN` — Bot API token
   - `TELEGRAM_API_HASH` — MTProto API hash
   - `TELEGRAM_SESSION` — GramJS session string
   - `YANDEX_API_KEY` — YandexGPT API key (if used)

2. **Database**: PostgreSQL connection string in `DATABASE_URL` may contain credentials.
   - Use a dedicated database user with minimal privileges
   - Enable SSL for remote connections

### Input Validation

1. **XSS Prevention**: All user-generated content (channel titles, message text) is escaped using `escapeHtml()` in `formatter.ts` before being sent as HTML.

2. **SQL Injection**: Prisma ORM handles query parameterization automatically. Raw SQL is not used.

### Rate Limiting

1. **Telegram MTProto**: The collector uses a 1.5-second delay between channel requests to avoid rate limiting and account restrictions.

2. **AI Providers**: No built-in rate limiting for AI API calls. Consider adding if you process large volumes.

### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Session leakage | High | Keep `.env` secure, use `.gitignore` |
| Account ban | Medium | Respect rate limits, avoid spam-like behavior |
| Database exposure | Medium | Use strong passwords, enable SSL |
| AI prompt injection | Low | AI summaries are user-facing only |

## Best Practices

### Before Deployment

1. Run security audit:
   ```bash
   npm audit
   ```

2. Verify `.gitignore` includes:
   - `.env`
   - `*.session`
   - `node_modules/`

3. Check no secrets in git history:
   ```bash
   git log --all --full-history -- "*.env"
   ```

### During Operation

1. Monitor bot logs for unusual activity
2. Regularly update dependencies
3. Use a separate Telegram account for the userbot if possible
4. Back up your database regularly

### If Compromised

1. Immediately revoke the bot token via @BotFather
2. Revoke all Telegram sessions in Settings → Devices
3. Regenerate API credentials on my.telegram.org
4. Change database passwords
5. Audit collected data for unauthorized access

## Dependency Security

This project uses:
- **Telegraf** — Popular Telegram Bot framework
- **GramJS (telegram)** — MTProto client
- **Prisma** — Type-safe ORM with built-in SQL injection protection
- **OpenAI SDK** — For LM Studio compatibility

All dependencies are from npm and should be regularly updated.

## Security Headers

For future web interface (v2.0), ensure:
- HTTPS only
- CSP headers
- CSRF protection
- Rate limiting on API endpoints
