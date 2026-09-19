# Установка и эксплуатация

## 1. Предварительная проверка

Убедитесь, что Iva `0.4.3` уже получает и отправляет обычные сообщения через Telegram-бота.
Плагин использует существующий `TELEGRAM_BOT_TOKEN`; создавать или копировать новый токен не
нужно.

Все команды выполняйте под тем Unix-пользователем, которому принадлежит установка Iva.

## 2. Установка стабильного выпуска

```bash
iva plugin add mamysh/iva-file-delivery/plugin@stable --trust
iva plugin list
iva doctor
```

В исходнике есть Eve Extension, поэтому Iva соберёт новую версию и выполнит штатный restart.
`--trust` разрешает запуск отдельного updater MCP; Telegram token ему не передаётся. Не
копируйте файлы напрямую в `data/custom` и не редактируйте plugin registry вручную.
`stable` двигается только после зелёного release CI. Для неизменяемого source используйте
точный tag `@v0.2.0`, но переход на следующий tag потребует remove/add по правилам Iva.

## 3. Первый тест

В личном чате попросите:

> Создай небольшой текстовый файл с фразой «Проверка доставки» и пришли его сюда как файл.

Ожидаемый результат: документ появляется от имени Telegram-бота Ивы, затем приходит обычное
текстовое подтверждение Ивы. Для canary не используйте чувствительные данные.

Проверьте отрицательную границу отдельно: tool не должен работать из группы, CLI-turn или для
файла вне `vault/attachments/`.

## 4. Обновление из Telegram

Напишите Иве в личном чате: «Проверь обновление плагина доставки файлов». Ива вызовет
`iva_file_delivery_update_check` и покажет текущую и кандидатную SemVer-версии, source/ref и
GitHub Actions. При успешном CI она отобразит нативные кнопки **⬆️ Обновить** и **Позже**.

После кнопки обновления отдельный user-systemd worker подождёт несколько секунд, вызовет
штатный `iva plugin update file-delivery`, сверит SHA и запустит `iva doctor`. Через минуту
спросите Иву о статусе. При неуспешной диагностике worker попытается вернуть предыдущий SHA.

Не вводите SHA, token или подтверждающую фразу вручную. Если apply вернул ошибку, не просите
Иву компенсировать её shell-командой, `systemctl` или restart: используйте только status и
разберите безопасный error code.

Ручной fallback из терминала:

```bash
iva plugin update file-delivery
iva doctor
```

Установка из `@stable` обновляется штатной командой выше. Установка по release tag фиксирует
версию; чтобы перейти на другой tag или на `stable`, удалите plugin и добавьте его из нового
source. Данные plugin сохраняются по правилам Iva. Не переключайте production на `@main` без
контролируемого теста.

### Миграция с 0.1.x

Версия `0.1.x` ещё не содержит updater MCP. Для первого перехода на `0.2.0` потребуется
последний терминальный bootstrap:

```bash
iva plugin update file-delivery
iva plugin trust file-delivery
iva doctor
```

После этого `iva plugin list` должен показать `enabled · trusted`, а doctor — отвечающий
`mcp-file-delivery--updates.service`. Следующие обновления выполняются из Telegram.

## 5. Отключение и удаление

```bash
iva plugin disable file-delivery
iva plugin remove file-delivery
iva doctor
```

Удаление плагина не удаляет созданные файлы из `vault/attachments/`. Проверьте и очистите их
отдельно по своей политике хранения.

## Troubleshooting

- `Telegram bot is not configured`: проверьте штатную настройку Telegram самой Iva; не
  создавайте отдельный env-файл плагина.
- `file delivery requires an authenticated user turn`: вызов пришёл не из поддерживаемого
  Telegram user turn.
- `allowed only in the owner's current private Telegram chat`: открыт group/channel либо auth
  context не подтверждает совпадение пользователя и чата.
- `relative path inside vault/attachments`: skill или пользователь передал абсолютный путь.
- `attachment is unavailable`: файл ещё не создан, удалён или каталог attachments недоступен.
- `Telegram rejected the upload`: сохраните только HTTP-статус из безопасной ошибки, проверьте
  соединение и размер файла.
- `enabled · untrusted`: file tool работает, но chat updater выключен; выполните один раз
  `iva plugin trust file-delivery`.
- `UPDATE_CHECK_REQUIRED` или `UPDATE_OFFER_EXPIRED`: запустите новую проверку из чата и
  используйте только её кнопку.
- `CI_NOT_SUCCESSFUL`: дождитесь зелёного GitHub Actions; не обходите проверку вручную.
- `rolled_back`: предыдущая версия восстановлена и теперь запинена на SHA; дальнейшую миграцию
  на `stable` выполняйте из терминала после разбора причины.

В публичный issue не прикладывайте tool trace целиком. Укажите версии, безопасный error text и
минимальные шаги с вымышленными именами файлов.
