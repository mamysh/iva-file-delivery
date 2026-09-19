# iva-file-delivery

Плагин для [Iva](https://github.com/smixs/iva-agent), который отправляет готовый локальный
файл в текущий личный Telegram-чат владельца **от имени бота Ивы**.

[![CI](https://github.com/mamysh/iva-file-delivery/actions/workflows/ci.yml/badge.svg)](https://github.com/mamysh/iva-file-delivery/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Iva](https://img.shields.io/badge/Iva-0.4.3-6f42c1)](https://github.com/smixs/iva-agent)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot_API-229ED9)](https://core.telegram.org/bots/api#senddocument)

Плагин решает один узкий сценарий: Ива создала или извлекла документ и должна приложить его
к ответу. Файл загружается напрямую в Telegram методом `sendDocument`; личный аккаунт
владельца, «Избранное» и публичный файловый хостинг не используются. Проверять и применять
следующие стабильные версии можно из того же чата после нативного кнопочного подтверждения.

> **Статус:** текущая версия проверена с Iva `0.4.3` (Eve `0.51.1`). Перед установкой на
> основной экземпляр рекомендуется один контролируемый canary-файл без чувствительных данных.

## Как это выглядит

```text
владелец просит файл в личном чате
  → Iva сохраняет результат в vault/attachments/
    → file_delivery__send_document
      → Telegram Bot API
        → тот же личный чат, отправитель — бот Ивы

обычный текст ответа
  → штатный Outbox Iva
```

| Инструмент | Назначение |
| --- | --- |
| `file_delivery__send_document` | Отправить файл из `vault/attachments/` владельцу текущего личного чата |
| `iva_file_delivery_update_check` | Проверить новую SemVer-версию и GitHub Actions без изменений сервера |
| `iva_file_delivery_update_apply` | После кнопки «Обновить» запустить проверенную версию в фоновой systemd job |
| `iva_file_delivery_update_status` | Показать итог фонового обновления или автоматического отката |

File tool принимает только относительный путь внутри `vault/attachments/` и необязательное
безопасное имя файла. Адрес чата в его аргументах отсутствует.

## Граница безопасности

- Получатель берётся из аутентифицированного контекста текущего Telegram-turn, а не из текста
  запроса или аргумента модели.
- Разрешён только личный чат, где Telegram `chat_id` совпадает с аутентифицированным
  `user_id`. Группы, каналы, CLI-turn и отправка другому пользователю отклоняются.
- Файл должен быть обычным, видимым и непустым, находиться физически внутри
  `vault/attachments/` и иметь размер не больше 50 МБ.
- Абсолютные пути, dot-path, выход через `..`, симлинки и переименование файла в путь
  отклоняются.
- Плагин не принимает caption: пояснение Ивы продолжает идти через штатный Outbox.
- Нет fallback на userbot, «Избранное», произвольный `chat_id` или публичную ссылку.
- Telegram bot token читается из уже настроенного окружения Iva. Отдельный секрет плагину не
  нужен, токен не возвращается в tool result и не логируется кодом плагина.
- Updater принимает только SHA и одноразовый token свежего offer для этого уже установленного
  плагина. Имя плагина, URL, ref и shell-команда не принимаются от модели.
- Обновление разрешается только при более высокой SemVer и успешном GitHub Actions на точном
  candidate SHA; после установки запускается `iva doctor`, а неуспешная версия откатывается.

Плагин **не анализирует содержимое файла на секреты**. Файл передаётся Telegram и остаётся
доступен владельцу чата; перед отправкой чувствительных данных нужно проверить сам результат.
Подробная модель угроз и осознанные ограничения описаны в [SECURITY.md](SECURITY.md) и
[docs/DESIGN.md](docs/DESIGN.md).

## Требования

- Iva `0.4.3`;
- настроенный Telegram-бот Iva и личный чат владельца;
- Linux с user systemd для обновления из чата;
- Node.js 24 для разработки.

Поддержка заявляется только для проверенных сочетаний из
[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md). Более новая Iva не считается автоматически
совместимой.

## Установка

На сервере под тем же Unix-пользователем, которому принадлежит Iva:

```bash
iva plugin add mamysh/iva-file-delivery/plugin@stable --trust
iva plugin list
iva doctor
```

Дополнительный `.env` не нужен. `--trust` разрешает только отдельный MCP-процесс updater;
отправка файла остаётся встроенным Extension. Iva соберёт Extension, подключит updater и
перезапустит агент по штатному lifecycle. Для первого теста попросите Иву создать небольшой
текстовый файл и прислать его в текущий чат.

Ветка `stable` двигается только на проверенные выпуски. После установки попросите Иву:
«Проверь обновление плагина доставки файлов». Она покажет версии и источник, затем предложит
нативные кнопки **Обновить** и **Позже**. Для полностью неизменяемой установки укажите точный
tag, например `@v0.2.0`; такой source не получает новые версии автоматически.

Пошаговая установка, обновление, удаление и troubleshooting находятся в
[docs/SETUP.md](docs/SETUP.md).

## Разработка

```bash
npm ci
npm run check
```

Проверка ищет секреты и приватные локальные следы, валидирует дистрибутив, запускает TypeScript
typecheck, отрицательные и положительные тесты, собирает Eve Extension и проверяет stdio MCP
smoke-test. `plugin/sh.iva/dist/` не коммитится: Iva собирает Extension при установке.
`plugin/update-server.mjs` и `plugin/update-worker.mjs` коммитятся намеренно, чтобы production
не загружал npm-зависимости updater во время установки.

Изменения приветствуются по правилам [CONTRIBUTING.md](CONTRIBUTING.md). Устройство плагина и
release-процесс описаны в [docs/DESIGN.md](docs/DESIGN.md) и
[docs/RELEASING.md](docs/RELEASING.md).

## Связанные проекты

- [Iva](https://github.com/smixs/iva-agent)
- [Agent Plugins specification](https://agent-plugins.org/)
- [Telegram Bot API: sendDocument](https://core.telegram.org/bots/api#senddocument)

## Безопасность

Не публикуйте Telegram bot token, реальные chat/user ID, содержимое частных файлов, абсолютные
пути сервера или несокращённые логи. Уязвимости следует сообщать приватно по инструкции в
[SECURITY.md](SECURITY.md).

## Лицензия

[MIT](LICENSE) © 2026 [mamysh](https://github.com/mamysh)
