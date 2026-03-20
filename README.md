# СтудПлатформа

Социальная академическая платформа студенческого сообщества.

Обмен конспектами, отзывы о преподавателях, поиск команд для проектов, отслеживание дедлайнов, маркетплейс учебников и события кампуса.

## Стек

**Frontend:** React 19, Vite 6, TailwindCSS v4, shadcn/ui, Framer Motion, TanStack Query, Zustand

**Backend:** Fastify 5, TypeScript, Mongoose, neo4j-driver, InfluxDB client, ioredis, Socket.io

**Базы данных:**
- MongoDB 7 (документоориентированная): пользователи, курсы, материалы, отзывы, форум
- Neo4j 5 (графовая): друзья, рекомендации, цепочки пререквизитов, подбор команд
- InfluxDB 2 (временных рядов): активность пользователей, тренды, метрики платформы
- Redis 7 (ключ-значение): кэш, сессии, присутствие, лидерборд, счётчики

## Требования

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Запуск (Docker, всё сразу)

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d --build

# подождать ~1 минуту пока всё соберётся и запустится

# заполнить БД тестовыми данными
docker compose -f docker-compose.dev.yml exec backend pnpm seed
```

Открыть http://localhost:3000

## Запуск (без Docker для backend/frontend)

Если Docker для приложений не нужен, можно запустить только БД:

```bash
pnpm install
cp .env.example .env

docker compose -f docker-compose.dev.yml up -d mongodb neo4j influxdb redis

# подождать ~30 секунд

cd backend && pnpm seed
pnpm dev          # терминал 1

cd ../frontend
pnpm dev          # терминал 2
```

Открыть http://localhost:3000

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | student1@university.ru | password123 |
| Модератор | student2@university.ru | password123 |
| Студент | student3@university.ru | password123 |

## Структура

```
student-platform/
  packages/shared/        Общие типы, Zod-схемы, константы
  backend/
    src/
      config/             Подключения к БД
      modules/            14 модулей (auth, users, courses, ...)
      utils/              Кэш, логгер, валидация
      jobs/               Фоновые задачи
      scripts/            Заполнение БД тестовыми данными
  frontend/
    src/
      pages/              28 страниц
      components/         UI компоненты
      services/           API-клиент
      hooks/              useAuth, useSocket, usePresence, ...
      store/              Zustand (auth, ui, notifications)
  docker-compose.dev.yml
  .env.example
```

## Модули

| Модуль | Что делает | Какие БД |
|--------|-----------|----------|
| Авторизация | Регистрация, вход, JWT, сброс пароля | MongoDB, Redis |
| Профили | Студенты, преподаватели, навыки | MongoDB, Neo4j |
| Курсы | Каталог, запись, пререквизиты, рекомендации | MongoDB, Neo4j |
| Материалы | Загрузка файлов, поиск, лайки, комментарии | MongoDB, Redis |
| Отзывы | Рейтинги курсов и преподавателей, анонимность | MongoDB, InfluxDB |
| Форум | Вопросы, ответы, голосование | MongoDB, Neo4j |
| Группы | Учебные группы, поиск команды по навыкам | MongoDB, Neo4j |
| Дедлайны | Календарь, подтверждения | MongoDB, Redis |
| Маркетплейс | Продажа и обмен учебников | MongoDB |
| События | Мероприятия кампуса, регистрация | MongoDB, Neo4j |
| Друзья | Заявки, рекомендации, одногруппники | Neo4j, Redis |
| Аналитика | Дашборды, тренды, лидерборд | InfluxDB, MongoDB, Redis |
| Уведомления | Пуши через Socket.io | MongoDB, Redis |
| Присутствие | Онлайн-статус через heartbeat | Redis, Socket.io |

## Порты

| Сервис | Порт |
|--------|------|
| Фронтенд | 3000 |
| Бэкенд | 3001 |
| MongoDB | 27017 |
| Neo4j Browser | 7474 |
| Neo4j Bolt | 7687 |
| InfluxDB | 8086 |
| Redis | 6379 |

## Команды

```bash
# запустить всё
docker compose -f docker-compose.dev.yml up -d --build

# заполнить БД тестовыми данными
cd backend && pnpm seed

# посмотреть логи
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend

# остановить всё
docker compose -f docker-compose.dev.yml down

# удалить все данные и начать заново
docker compose -f docker-compose.dev.yml down -v
```
