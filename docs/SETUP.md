# Установка и эксплуатация

## 1. Предварительная проверка

Убедитесь, что Iva `0.4.3` уже получает и отправляет обычные сообщения через Telegram-бота.
Плагин использует существующий `TELEGRAM_BOT_TOKEN`; создавать или копировать новый токен не
нужно.

Все команды выполняйте под тем Unix-пользователем, которому принадлежит установка Iva.

## 2. Установка стабильного выпуска

```bash
iva plugin add mamysh/iva-file-delivery/plugin@v0.1.1
iva plugin list
iva doctor
```

В исходнике есть Eve Extension, поэтому Iva соберёт новую версию и выполнит штатный restart.
Не копируйте файлы напрямую в `data/custom` и не редактируйте plugin registry вручную.

## 3. Первый тест

В личном чате попросите:

> Создай небольшой текстовый файл с фразой «Проверка доставки» и пришли его сюда как файл.

Ожидаемый результат: документ появляется от имени Telegram-бота Ивы, затем приходит обычное
текстовое подтверждение Ивы. Для canary не используйте чувствительные данные.

Проверьте отрицательную границу отдельно: tool не должен работать из группы, CLI-turn или для
файла вне `vault/attachments/`.

## 4. Обновление

Сначала изучите CHANGELOG и совместимость, затем:

```bash
iva plugin update file-delivery
iva doctor
```

Установка по release tag фиксирует первую версию. Для перехода на новый release tag может
потребоваться повторно указать новый source согласно plugin lifecycle текущей Iva. Не
переключайте production на `@main` без контролируемого теста.

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

В публичный issue не прикладывайте tool trace целиком. Укажите версии, безопасный error text и
минимальные шаги с вымышленными именами файлов.
