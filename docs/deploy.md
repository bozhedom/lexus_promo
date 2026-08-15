# Развёртывание на сервере

Нужны Node 20+, Postgres 16 и домен с сертификатом. Мессенджеры стучатся к нам
сами и сами скачивают картинки пригласительных, поэтому HTTP-адрес и
самоподписанный сертификат не годятся: без настоящего HTTPS пригласительные до
гостя не дойдут.

**1. База.** Managed-Postgres у хостера или свой контейнер — тогда закройте порт
5432 от внешнего мира и поменяйте пароль `promo/promo` из `docker-compose.yml`:
он годится только для локальной разработки.

**2. Код и переменные.**

```bash
git clone https://github.com/bozhedom/lexus_promo.git && cd lexus_promo
cp .env.example .env
npm ci
```

В `.env` обязательно: `DATABASE_URL`, свежий `PAYLOAD_SECRET`
(`openssl rand -hex 32`), `NEXT_PUBLIC_SITE_URL` с настоящим https-доменом,
`ADMIN_GATE_USER`/`ADMIN_GATE_PASSWORD` и `PAYLOAD_ADMIN_EMAIL`/
`PAYLOAD_ADMIN_PASSWORD`. Без пары `ADMIN_GATE_*` админка на проде не
открывается.

**3. Схема, аккаунт, кадры, сборка.**

```bash
npm run setup
npm run build
```

**4. Запуск.** `npm start` держит сайт на порту 3000; заворачивать его в
systemd-юнит или pm2 — чтобы поднимался после перезагрузки. Перед ним nginx:
проксирует на `127.0.0.1:3000`, отдаёт сертификат (`certbot --nginx`) и передаёт
`X-Forwarded-For` — по нему работает `ADMIN_ALLOWED_IPS`. Здесь же удобно
закрыть `/admin` вторым слоем: `allow` для адреса автоцентра, `deny all`.

**5. Вебхуки мессенджеров.** Один раз после того, как домен заработал:

```bash
curl -X POST "https://ваш-домен/api/invite-test/setup?key=$INVITE_TEST_SETUP_KEY"
```

Проверить настройку каналов — `https://ваш-домен/api/invite-test/status`.
Подробности в [../src/invite-test/README.md](../src/invite-test/README.md).

## Что беречь

Загрузки Payload лежат в папке `media/` рядом с проектом, а не в базе: там же и
выписанные пригласительные, которые уходят гостям. Папку нужно сохранять между
выкладками и класть в бэкап вместе с дампом Postgres.

Обновление дальше:

```bash
git pull && npm ci && npm run migrate && npm run build
```

и перезапуск сервиса.
