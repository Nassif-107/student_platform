# СтудПлатформа

Социальная академическая платформа студенческого сообщества.

Обмен конспектами, отзывы о преподавателях, поиск команд, дедлайны, маркетплейс учебников, события кампуса — всё в одном месте.

## Стек

**Frontend:** React 19, Vite 6, TailwindCSS v4, shadcn/ui, Framer Motion, TanStack Query, Zustand

**Backend:** Fastify 5, TypeScript, Mongoose, neo4j-driver, InfluxDB client, ioredis, Socket.io

**Базы данных:**
- MongoDB 7 — основное хранилище (пользователи, курсы, материалы, отзывы, форум)
- Neo4j 5 — граф связей (друзья, рекомендации, пререквизиты, подбор команд)
- InfluxDB 2 — аналитика и метрики (активность, тренды, временные ряды)
- Redis 7 — кэш, сессии, присутствие, лидерборд, real-time

## Требования

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Запуск

```bash
# Установить зависимости
pnpm install

# Поднять базы данных
docker compose -f docker-compose.dev.yml up -d

# Скопировать конфиг
cp .env.example .env

# Подождать ~20 секунд пока БД запустятся, потом заполнить тестовыми данными
cd backend && pnpm seed

# Запустить бэкенд (в отдельном терминале)
pnpm dev

# Запустить фронтенд (в другом терминале)
cd ../frontend && pnpm dev
```

Открыть http://localhost:3000

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | student1@university.ru | password123 |
| Модератор | student2@university.ru | password123 |
| Студент | student3@university.ru | password123 |

## Структура проекта

```
student-platform/
├── packages/shared/     # Общие типы, Zod-схемы, константы
├── backend/             # Fastify API сервер
│   ├── src/
│   │   ├── config/      # Подключения к БД (Mongo, Neo4j, InfluxDB, Redis)
│   │   ├── modules/     # 14 модулей (auth, users, courses, materials, ...)
│   │   ├── utils/       # Кэш, логгер, валидация, InfluxDB writer
│   │   ├── jobs/        # Фоновые задачи (синхронизация счётчиков)
│   │   └── scripts/     # Скрипт заполнения БД
│   └── package.json
├── frontend/            # React SPA
│   ├── src/
│   │   ├── pages/       # 28 страниц (лениво загружаемых)
│   │   ├── components/  # UI компоненты (shadcn + кастомные)
│   │   ├── services/    # API-клиент и сервисы по модулям
│   │   ├── hooks/       # useAuth, useSocket, usePresence, ...
│   │   └── store/       # Zustand (auth, ui, notifications)
│   └── package.json
├── docker-compose.dev.yml
└── .env.example
```

## Модули

| Модуль | Описание | БД |
|--------|----------|----|
| Авторизация | Регистрация, вход, JWT, сброс пароля | MongoDB + Redis |
| Профили | Студенты, преподаватели, навыки | MongoDB + Neo4j |
| Курсы | Каталог, запись, пререквизиты, рекомендации | MongoDB + Neo4j |
| Материалы | Загрузка, поиск, лайки, комментарии | MongoDB + Redis |
| Отзывы | Курсы и преподаватели, рейтинги, анонимность | MongoDB + InfluxDB |
| Форум | Вопросы, ответы, голосование, принятие ответа | MongoDB + Neo4j |
| Группы | Учебные группы, поиск команды по навыкам | MongoDB + Neo4j |
| Дедлайны | Календарь, подтверждения, напоминания | MongoDB + Redis |
| Маркетплейс | Учебники, обмен, продажа | MongoDB |
| События | Мероприятия кампуса, регистрация | MongoDB + Neo4j |
| Социальная сеть | Друзья, заявки, рекомендации, одногруппники | Neo4j + Redis |
| Аналитика | Дашборды, тренды, лидерборд | InfluxDB + MongoDB + Redis |
| Уведомления | Real-time пуши через Socket.io | MongoDB + Redis |
| Присутствие | Онлайн-статус через heartbeat | Redis + Socket.io |

## Порты

| Сервис | Порт |
|--------|------|
| Фронтенд | 3000 |
| Бэкенд API | 3001 |
| MongoDB | 27017 |
| Neo4j Browser | 7474 |
| Neo4j Bolt | 7687 |
| InfluxDB | 8086 |
| Redis | 6379 |

## Полезные команды

```bash
# Пересоздать тестовые данные
cd backend && pnpm seed

# Проверить типы
pnpm --filter backend typecheck
pnpm --filter frontend typecheck

# Остановить базы данных
docker compose -f docker-compose.dev.yml down

# Удалить данные БД (полный сброс)
docker compose -f docker-compose.dev.yml down -v
```
