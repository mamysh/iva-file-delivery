# Устройство плагина

`iva-file-delivery` добавляет Иве одну возможность без патча её ядра: загрузить уже готовый
локальный файл владельцу текущего личного Telegram-чата от имени бота.

## Цели

- устанавливаться и удаляться штатными командами Iva;
- не принимать адрес назначения от модели;
- не использовать Telegram userbot или личный аккаунт владельца;
- не создавать публичную ссылку на файл;
- ограничивать чтение каталогом `vault/attachments/`;
- оставлять обычный текст ответа на штатном Outbox Iva;
- не требовать отдельного секрета;
- переживать обновление Iva без изменений её исходного дерева.
- обновлять уже установленный экземпляр из чата после нативного кнопочного подтверждения;
- выполнять update вне процесса Iva и автоматически проверять либо откатывать результат.

## Не входит в текущую версию

- группы, каналы, другие пользователи и фоновые/плановые отправки;
- произвольный Telegram Bot API tool;
- фото-, видео- или audio-specific UX; файл всегда отправляется как document;
- caption от модели;
- загрузка по URL или повторная отправка по Telegram `file_id`;
- DLP, классификация или антивирусная проверка содержимого;
- история отправок, очередь, retry или публичный backend.

## Архитектура

```text
plugin/plugin.json
  ├── sh.iva/extension       Eve Extension и file_delivery__send_document
  ├── mcp.json               отдельный updater MCP
  ├── update-server.mjs      три ограниченных update-tools
  ├── update-worker.mjs      detached systemd worker
  └── skills/                доставка файла и кнопочный update-flow

authenticated Telegram turn
  → privateTelegramTarget(auth)
  → loadAttachment(relative path, vault/attachments)
  → multipart sendDocument with Iva's existing bot token
  → same private chat

owner asks to check updates
  → update_check: recorded source/ref/SHA → candidate manifest → GitHub Actions
  → ask_question: Обновить / Позже
  → update_apply: one-time offer token + fresh SHA/CI recheck
  → transient user-systemd worker
  → iva plugin update file-delivery → SHA check → iva doctor
  → success or previous-SHA rollback
```

Extension выбран вместо отдельного MCP-процесса, потому что получатель должен выводиться из
аутентифицированного контекста именно текущего turn, а bot token уже принадлежит runtime Iva.
MCP потребовал бы либо передавать destination от модели, либо дублировать контекст и секреты.
Updater, напротив, вынесен в MCP намеренно: ему не нужен текущий Telegram auth context или bot
token, а trust делает отдельный процесс и его команду видимыми владельцу при установке.

## Независимые проверки

Назначение проходит проверку `principalType`, `chat_type` и равенства `chat_id === user_id`.
Источник проходит lexical и physical containment, запрет абсолютного пути и скрытых
компонентов, `realpath`, `O_NOFOLLOW`, проверку открытого descriptor, размер и безопасное имя.

Проверки не заменяют друг друга. Даже если prompt заставит модель выбрать неожиданный файл,
она не сможет назначить другого Telegram-получателя; даже корректный получатель не открывает
чтение произвольного файла сервера.

## Ошибки и наблюдаемость

В tool result возвращаются короткие стабильные сообщения без bot token, абсолютного пути,
Telegram response body и сырых сетевых или файловых ошибок. Успех содержит только message ID,
имя, размер и MIME-тип.
Файл не удаляется после отправки: lifecycle attachments остаётся ответственностью Iva и
владельца.

## Обновляющий контур

Check читает только запись `file-delivery` из `plugins.json` и не принимает source от модели.
Candidate определяется `git ls-remote` по записанному ref. Manifest загружается с точного SHA
без редиректов и с лимитом размера; offer создаётся только для более высокой SemVer и
успешных workflow runs GitHub Actions.

Apply принимает только candidate SHA и случайный token свежего offer с TTL 15 минут. Он
повторно проверяет установленный SHA, moving ref и CI, записывает job и lock с правами `0600`
и запускает worker через `systemd-run --user --no-block`. Worker использует точный
`~/.local/bin/iva`, поэтому не доверяет `PATH` и переживает restart Iva. Результат job доступен
через status; сырые stdout/stderr наружу не возвращаются.

Решение и остаточные риски отдельно зафиксированы в
[ADR-0001](adr/0001-owner-confirmed-plugin-updates.md).
