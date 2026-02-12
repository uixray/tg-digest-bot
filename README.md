# Telegram Digest Bot

Персональный Telegram-бот для сбора и агрегации новостей из Telegram-каналов с AI-суммаризацией.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## 🎯 Для кого этот бот

- **Дизайнеры и креаторы** — следите за трендами из профессиональных каналов
- **Разработчики** — агрегируйте новости из tech-каналов
- **Исследователи** — собирайте информацию из множества источников
- **Все, кто тонет в Telegram-подписках** — получайте одну сводку вместо сотен сообщений

## ✨ Возможности

### Текущий функционал (v1.0)

- 📰 **Сбор сообщений** из Telegram-каналов через MTProto (GramJS)
- 🤖 **AI-суммаризация** через LM Studio (локально) или YandexGPT (облако)
- 📅 **Автоматические дайджесты** по расписанию (cron)
- 🏷️ **Типы каналов** — категоризация с эмодзи (встроенные + кастомные)
- 🎯 **Фильтры** — дайджест только по выбранным типам каналов
- 🖼️ **Медиа-индикаторы** — эмодзи для фото, видео, документов
- 🔐 **Приватность** — работает только для владельца
- ⚡ **Контекстный онбординг** — адаптивный интерфейс для новых и опытных пользователей

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL 14+
- Telegram аккаунт
- (Опционально) LM Studio для локальной AI-суммаризации

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/tg-digest-bot.git
cd tg-digest-bot

# Установить зависимости
npm install

# Скопировать конфигурацию
cp .env.example .env
```

### Настройка

1. **Создайте бота** через [@BotFather](https://t.me/BotFather) и получите токен

2. **Получите API credentials** на https://my.telegram.org/apps

3. **Заполните `.env`**:
   ```env
   BOT_TOKEN=your_bot_token
   OWNER_CHAT_ID=your_telegram_id
   TELEGRAM_API_ID=12345678
   TELEGRAM_API_HASH=your_api_hash
   DATABASE_URL=postgresql://postgres:password@localhost:5432/tg_digest
   ```

4. **Инициализируйте базу данных**:
   ```bash
   npx prisma migrate dev
   ```

5. **Авторизуйте userbot**:
   ```bash
   npm run auth
   # Введите номер телефона и код из Telegram
   # Скопируйте полученную сессию в .env (TELEGRAM_SESSION)
   ```

6. **Запустите бота**:
   ```bash
   npm run build
   npm start
   ```

### Использование pm2 (рекомендуется)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Автозапуск при загрузке системы
```

#### Windows: автозапуск с pm2

```bash
npm install -g pm2-windows-startup
pm2-windows-startup install
pm2 save
```

## 📱 Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и онбординг |
| `/menu` | Главное меню с кнопками |
| `/digest` | Дайджест за 24 часа |
| `/digest ai` | Дайджест с AI-суммаризацией |
| `/digest 3d` | Дайджест за 3 дня |
| `/channels` | Список каналов |
| `/add @channel` | Добавить канал |
| `/remove @channel` | Удалить канал |
| `/types` | Управление типами каналов |
| `/addtype 🎨 design` | Добавить кастомный тип |
| `/settype @channel tech` | Установить тип канала |
| `/settings` | Настройки |
| `/help` | Справка |

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────┐
│                  Telegram                        │
│   Владелец  ←──→  Telegraf Bot (Bot API)        │
│   Каналы    ←──→  GramJS Userbot (MTProto)      │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │PostgreSQL│ │ Digest   │ │   AI     │
  │ (Prisma) │ │ Engine   │ │ Provider │
  └──────────┘ └──────────┘ └──────────┘
```

### Принцип работы

1. **GramJS (userbot)** — читает сообщения из каналов через MTProto API
2. **PostgreSQL** — хранит каналы, сообщения, дайджесты, настройки
3. **Digest Engine** — группирует сообщения по каналам и форматирует
4. **AI Provider** — создаёт краткую сводку (опционально)
5. **Telegraf** — отправляет дайджест владельцу через Bot API
6. **Cron** — запускает сборку и отправку по расписанию

## 📁 Структура проекта

```
tg-digest-bot/
├── src/
│   ├── index.ts              # Точка входа
│   ├── config.ts             # Конфигурация из .env
│   ├── bot/                  # Telegram бот (Telegraf)
│   │   ├── index.ts          # Создание бота, обработчики
│   │   ├── commands/         # Команды бота
│   │   │   ├── start.ts      # /start — контекстный онбординг
│   │   │   ├── menu.ts       # /menu — главное меню
│   │   │   ├── digest.ts     # /digest — создание дайджеста
│   │   │   ├── channels.ts   # /channels — список каналов
│   │   │   ├── add.ts        # /add — добавление канала с типом
│   │   │   ├── remove.ts     # /remove — удаление канала
│   │   │   ├── types.ts      # /types — управление типами
│   │   │   ├── filter.ts     # Фильтрация по типам
│   │   │   ├── settings.ts   # /settings — настройки
│   │   │   └── help.ts       # /help — справка
│   │   └── middleware/
│   │       └── auth.ts       # Проверка владельца
│   ├── userbot/              # MTProto клиент (GramJS)
│   │   ├── client.ts         # Singleton клиента
│   │   ├── auth.ts           # Скрипт авторизации
│   │   └── collector.ts      # Сбор сообщений
│   ├── digest/               # Формирование дайджестов
│   │   ├── builder.ts        # Сборка данных
│   │   └── formatter.ts      # HTML-форматирование
│   ├── ai/                   # AI-провайдеры
│   │   ├── provider.ts       # Интерфейс и фабрика
│   │   ├── lmstudio.ts       # LM Studio (OpenAI API)
│   │   └── yandexgpt.ts      # YandexGPT
│   ├── scheduler/            # Cron-планировщик
│   │   └── cron.ts
│   └── db/                   # База данных
│       ├── prisma.ts         # Prisma client
│       └── seed-types.ts     # Инициализация типов
├── prisma/
│   └── schema.prisma         # Схема базы данных
├── scripts/                  # Bat-скрипты управления (Windows)
│   ├── start.bat
│   ├── stop.bat
│   ├── restart.bat
│   ├── status.bat
│   ├── logs.bat
│   └── build-and-restart.bat
└── dist/                     # Скомпилированный JS
```

## ⚙️ Конфигурация

### Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|:-----------:|---------|
| `BOT_TOKEN` | ✅ | Токен бота от @BotFather |
| `OWNER_CHAT_ID` | ✅ | Ваш Telegram ID |
| `TELEGRAM_API_ID` | ✅ | API ID с my.telegram.org |
| `TELEGRAM_API_HASH` | ✅ | API Hash |
| `TELEGRAM_SESSION` | ✅ | Строка сессии GramJS |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AI_PROVIDER` | — | `lmstudio` / `yandexgpt` / `none` |
| `LMSTUDIO_BASE_URL` | — | URL LM Studio (default: `http://localhost:1234/v1`) |
| `YANDEX_FOLDER_ID` | — | ID каталога Yandex Cloud |
| `YANDEX_API_KEY` | — | API-ключ Yandex Cloud |
| `DIGEST_CRON` | — | Cron-выражение (default: `0 9 * * *`) |
| `DIGEST_TIMEZONE` | — | Часовой пояс (default: `Europe/Moscow`) |

### AI-провайдеры

**LM Studio (рекомендуется для локального использования):**
1. Установите [LM Studio](https://lmstudio.ai/)
2. Загрузите модель (например, `granite-3.2-8b`, `llama-3.1-8b`)
3. Запустите локальный сервер (порт 1234)
4. Установите `AI_PROVIDER=lmstudio`

**YandexGPT:**
1. Создайте каталог в [Yandex Cloud](https://cloud.yandex.ru/)
2. Получите API-ключ
3. Заполните `YANDEX_FOLDER_ID` и `YANDEX_API_KEY`
4. Установите `AI_PROVIDER=yandexgpt`

## 🛠️ Разработка

```bash
# Режим разработки с hot-reload
npm run dev

# Сборка
npm run build

# Просмотр базы данных
npm run prisma:studio

# Применить миграции
npm run prisma:migrate
```

---

## 🗺️ Roadmap

### v1.1 — Умный поиск (RAG)

Цель: возможность задавать вопросы по собранным новостям на естественном языке.

**Архитектура (гибрид с локальными эмбеддингами):**

```
┌─────────────────────────────────────────────────────────┐
│                    Поиск по запросу                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Запрос пользователя                                     │
│        │                                                 │
│        ▼                                                 │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Локальные   │    │   pgvector   │                   │
│  │  эмбеддинги  │───▶│   поиск      │                   │
│  │  (transformers)   │   (cosine)   │                   │
│  └──────────────┘    └──────────────┘                   │
│                             │                            │
│                             ▼                            │
│                    Релевантные сообщения                │
│                             │                            │
│                             ▼                            │
│                    ┌──────────────┐                     │
│                    │   LLM для    │                     │
│                    │   ответа     │                     │
│                    └──────────────┘                     │
│                             │                            │
│                             ▼                            │
│                    Ответ пользователю                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Планируемые изменения:**

1. **Расширение схемы БД:**
   ```prisma
   model Message {
     // ... существующие поля
     embedding     Unsupported("vector(384)")?  // pgvector
     embeddedAt    DateTime?
   }

   model ImageDescription {
     id          Int      @id @default(autoincrement())
     messageId   Int      @unique
     message     Message  @relation(fields: [messageId], references: [id])
     description String   // Описание изображения от AI
     createdAt   DateTime @default(now())
   }
   ```

2. **Новые файлы:**
   ```
   src/
   ├── search/
   │   ├── embeddings.ts     # Локальные эмбеддинги (@xenova/transformers)
   │   ├── vector-store.ts   # Работа с pgvector
   │   └── rag.ts            # RAG-пайплайн
   └── vision/
       └── image-describer.ts  # Описание изображений через AI
   ```

3. **Новые команды:**
   - `/search <query>` — поиск по базе
   - `/ask <question>` — вопрос с AI-ответом
   - `/similar <message_id>` — похожие сообщения

4. **Зависимости:**
   ```bash
   npm install @xenova/transformers
   # PostgreSQL с расширением pgvector
   ```

**Преимущества подхода:**
- ✅ Полная приватность — эмбеддинги создаются локально
- ✅ Быстрый поиск через pgvector
- ✅ Описания изображений для полнотекстового контекста
- ✅ Нет зависимости от внешних embedding API

---

### v1.2 — Интеграция с Obsidian

Цель: автоматическое сохранение дайджестов в вашу базу знаний Obsidian.

**Архитектура:**

```
┌─────────────────────────────────────────────────────────┐
│                 Obsidian Integration                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Дайджест готов                                          │
│        │                                                 │
│        ▼                                                 │
│  ┌──────────────┐                                       │
│  │  Markdown    │  Конвертация HTML → Markdown          │
│  │  Exporter    │  с сохранением ссылок и форматирования│
│  └──────────────┘                                       │
│        │                                                 │
│        ▼                                                 │
│  ┌──────────────┐    ┌──────────────────────┐          │
│  │  File Writer │───▶│  Obsidian Vault      │          │
│  │              │    │  /Digests/           │          │
│  └──────────────┘    │    2026-02-13.md     │          │
│                      │    2026-02-12.md     │          │
│                      └──────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Формат Markdown-файла:**

```markdown
---
date: 2026-02-13
channels: 5
messages: 23
ai_summary: true
tags: [digest, telegram, daily]
---

# 📰 Дайджест за 13 февраля 2026

## 🏢 Дизайн-канал
- 10:30 [[2026-02-13#msg-123|Новый тренд в UI...]] 🖼
- 14:15 [[2026-02-13#msg-124|Figma выпустила обновление...]]

## 📢 Tech News
- 09:00 [[2026-02-13#msg-125|Apple анонсировала...]]

---

## 🤖 AI-итоги

Главные темы дня: обновления дизайн-инструментов...

---

#digest #telegram #2026-02
```

**Планируемые настройки:**

```env
# Obsidian интеграция
OBSIDIAN_VAULT_PATH=/path/to/your/vault
OBSIDIAN_DIGESTS_FOLDER=Digests
OBSIDIAN_TEMPLATE=default  # или custom
OBSIDIAN_AUTO_EXPORT=true  # автоматический экспорт после создания
```

**Новые команды:**
- `/export` — экспортировать последний дайджест в Obsidian
- `/export all` — экспортировать все дайджесты
- `/obsidian` — настройки интеграции

**Преимущества:**
- ✅ Дайджесты становятся частью базы знаний
- ✅ Поиск через Obsidian Search
- ✅ Связи с другими заметками через backlinks
- ✅ Теги для организации
- ✅ Работает локально, без облачных сервисов

---

### v2.0 — Мультипользовательский режим

- Поддержка нескольких пользователей
- Веб-интерфейс для настройки
- Расшаренные дайджесты между пользователями

---

## 🔒 Безопасность

### Защита данных

- **Только владелец**: Middleware `auth.ts` проверяет `ctx.from.id === OWNER_CHAT_ID`
- **Сессия GramJS**: Хранится в `.env`, не коммитится в репозиторий
- **API ключи**: Все секреты в переменных окружения

### Рекомендации

1. **Никогда не коммитьте `.env`** — он в `.gitignore`
2. **Используйте отдельный Telegram-аккаунт** для userbot при возможности
3. **Ограничьте права PostgreSQL** — создайте отдельного пользователя для бота
4. **Регулярно обновляйте зависимости** — `npm audit` для проверки уязвимостей

### Известные риски

| Риск | Митигация |
|------|-----------|
| Утечка сессии GramJS | Сессия работает только с вашего IP; при подозрении — `/telegram session revoke` |
| Блокировка аккаунта | Соблюдайте rate limits (1-2 сек между запросами); не используйте на спам-активности |
| SQL-инъекции | Prisma ORM автоматически экранирует запросы |
| XSS в дайджестах | HTML-escape в formatter.ts |

## 🤝 Contributing

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Changelog

### v1.0.0 (2026-02)

- ✅ Базовый сбор сообщений из каналов
- ✅ AI-суммаризация (LM Studio, YandexGPT)
- ✅ Автоматические дайджесты по cron
- ✅ Типы каналов с эмодзи
- ✅ Фильтры по типам каналов
- ✅ Контекстный онбординг
- ✅ Удобные пресеты расписания

## 📄 Лицензия

MIT License — см. [LICENSE](LICENSE)

## 👤 Автор

Создано с помощью [Claude Code](https://claude.ai/claude-code)

---

<p align="center">
  <i>Если проект полезен — поставьте ⭐️ на GitHub!</i>
</p>
