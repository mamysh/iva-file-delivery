# Compatibility

Совместимость заявляется только для сочетаний, проверенных автоматическими тестами или
отдельным live smoke test.

| Компонент | Версия или режим | Подтверждение | Статус |
| --- | --- | --- | --- |
| Iva | `0.4.3` | plugin lifecycle, auth context, native `ask_question`, MCP proxy и `iva doctor` | поддерживается |
| Eve | `0.51.1` | typecheck, тесты и сборка Extension | поддерживается |
| Node.js | `24` | CI, typecheck, тесты и build | поддерживается для разработки |
| Telegram Bot API | `sendDocument`, `sendMediaGroup` | multipart contract, альбом из 2–10 документов и лимит 50 МБ на файл из официальной документации; тесты upload | поддерживается |
| Telegram chat | личный чат владельца | строгие auth-context тесты | единственный разрешённый режим |
| Linux | production Iva с user systemd | Extension, MCP proxy и detached update worker | поддерживается |

Новый выпуск Iva, Eve или Telegram Bot API не считается поддерживаемым только потому, что
плагин запускается. Перед обновлением таблицы нужны полный `npm run check`, clean install и
контролируемая отправка синтетического файла. Для update-flow дополнительно проверяются
clean install с trust, нативная кнопка, background update, status и rollback.
