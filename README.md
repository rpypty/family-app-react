# My Family Frontend

Фронтенд семейного приложения на React + TypeScript. В одном интерфейсе собраны три сценария: учет расходов, семейные todo-списки и журнал тренировок.

Приложение рассчитано на работу вместе с отдельным backend API и Supabase Auth. При этом часть данных кэшируется локально, а для `expenses` и `todo` есть offline-first поведение с последующей синхронизацией.

## Что умеет приложение

- Авторизация через Google OAuth в Supabase.
- Создание семьи или вход в существующую семью по коду.
- Мини-приложение `Расходы`: список операций, категории, аналитика, отчеты, настройки.
- Мини-приложение `To Do`: несколько списков, архив выполненного, порядок списков, отметка кто завершил задачу.
- Мини-приложение `Тренировки`: тренировки, шаблоны, упражнения, аналитика, локальный кэш.
- PWA-режим: сервис-воркер, установка на устройство, базовый офлайн-кэш.
- Светлая и темная тема.

## Что важно понимать

- Этот репозиторий содержит только фронтенд.
- Основные данные приходят из backend API на `VITE_API_BASE_URL` или через dev-proxy Vite.
- Без backend приложение не будет полноценно работать, даже если включить `VITE_SKIP_AUTH=true`: в этом режиме фронтенд все равно ожидает `/auth/me`.
- `expenses` и `todo` умеют складывать часть действий в локальный outbox и синхронизировать их позже.
- `workouts` работают local-first, но без общей outbox-схемы как у расходов и todo.

## Стек

- React 19
- TypeScript
- Vite
- Material UI
- React Router
- Supabase JS
- Vitest + Testing Library
- `vite-plugin-pwa`

## Быстрый старт

Требуется Node.js 20+.

```bash
npm ci
cp .env.example .env
npm run dev
```

По умолчанию dev-сервер Vite поднимается на `http://localhost:5173` и проксирует `/api` на `http://localhost:5010`.

## Переменные окружения

Пример лежит в [`.env.example`](/Users/ashpak/Pet/family-app-react/.env.example).

Обязательные для обычного режима:

- `VITE_SUPABASE_URL` - URL проекта Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY` - publishable key Supabase.
- `VITE_API_BASE_URL` - базовый URL API. Для локальной разработки обычно `/api`.
- `VITE_API_PROXY_TARGET` - куда Vite будет проксировать `/api`, по умолчанию `http://localhost:5010`.

Опционально:

- `VITE_SKIP_AUTH=true` - отключает OAuth-флоу на фронте и использует `/auth/me` как источник тестовой сессии.
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` - в этом фронтенд-репозитории не используется напрямую, но оставлен для локального окружения / server-side конфигурации.

## Скрипты

```bash
npm run dev      # локальная разработка
npm run build    # production build
npm run preview  # локальный просмотр production build
npm run lint     # eslint
npm run test     # vitest
```

Сейчас в репозитории есть тесты для сценариев расходов и аналитики:

- [`src/features/miniapps/expense/expenses/components/ExpenseFormModal.test.tsx`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/expenses/components/ExpenseFormModal.test.tsx)
- [`src/features/miniapps/expense/expenses/lib/exchangePreview.test.ts`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/expenses/lib/exchangePreview.test.ts)
- [`src/features/miniapps/expense/analytics/screens/AnalyticsScreen.test.tsx`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/analytics/screens/AnalyticsScreen.test.tsx)

## Архитектура

```text
src/
  app/        корневая композиция приложения, навигация, shell, синхронизация
  features/   бизнес-фичи: auth, family, expenses, todo, workouts, onboarding
  shared/     общие типы, API-клиент, утилиты, локальное хранение, UI-компоненты
```

Ключевые зоны:

- [`src/app`](/Users/ashpak/Pet/family-app-react/src/app) - точка сборки приложения, маршруты, shell и управление жизненным циклом.
- [`src/features/auth`](/Users/ashpak/Pet/family-app-react/src/features/auth) - вход через Supabase / skip-auth.
- [`src/features/family`](/Users/ashpak/Pet/family-app-react/src/features/family) - создание семьи, вход по коду, участники.
- [`src/features/miniapps/expense`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense) - расходы, категории, мультивалютность, аналитика, отчеты.
- [`src/features/miniapps/todo`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/todo) - семейные списки задач.
- [`src/features/miniapps/workouts`](/Users/ashpak/Pet/family-app-react/src/features/miniapps/workouts) - тренировки, шаблоны и локальные сторы.
- [`src/features/sync`](/Users/ashpak/Pet/family-app-react/src/features/sync) - outbox и API синхронизации офлайн-операций.
- [`src/shared/storage`](/Users/ashpak/Pet/family-app-react/src/shared/storage) - локальный кэш и seed/storage-слой.

## Офлайн и синхронизация

- Приложение регистрирует service worker в [`src/main.tsx`](/Users/ashpak/Pet/family-app-react/src/main.tsx) и настраивает PWA через [`vite.config.ts`](/Users/ashpak/Pet/family-app-react/vite.config.ts).
- Последний пользователь, семья и время синка сохраняются в локальный offline cache.
- Для `expenses` и `todo` есть offline outbox: операции записываются локально и позже отправляются батчем в `/sync`.
- Если приложение стартует без сети и без локального кэша, пользователь увидит экран блокировки запуска.

## Docker и деплой

Для production здесь есть обычная схема `build -> nginx`:

- [`Dockerfile`](/Users/ashpak/Pet/family-app-react/Dockerfile) собирает статику и отдает ее через Nginx.
- [`nginx.conf`](/Users/ashpak/Pet/family-app-react/nginx.conf) проксирует `/api` на backend-контейнер `app:5010`.
- [`docker-compose.yml`](/Users/ashpak/Pet/family-app-react/docker-compose.yml) ожидает внешнюю сеть `family-app-go_default`.

Автодеплой настроен через GitHub Actions:

- [`.github/workflows/deploy.yml`](/Users/ashpak/Pet/family-app-react/.github/workflows/deploy.yml)

При пуше в `main` workflow подключается по SSH к VPS, делает `git pull` и запускает `docker compose up -d --build`.

## Статус фич

Уже есть в коде:

- расходы
- аналитика и месячные отчеты
- семейные todo-списки
- тренировки и шаблоны
- управление семьей
- офлайн-кэш и частичная синхронизация

Помечено как `coming soon` в интерфейсе:

- premium-подписка
- быстрые фильтры
- регулярные расходы
- экспорт
