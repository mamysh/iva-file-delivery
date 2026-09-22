# Release process

1. Обновить version в `package.json`, корневом `package-lock.json`, `plugin/plugin.json`,
   `plugin/sh.iva/package.json` и `plugin/sh.iva/package-lock.json`.
2. Добавить датированный раздел в `CHANGELOG.md` и при необходимости обновить compatibility.
3. Выполнить `npm ci`, `npm run check`, `npm audit --audit-level=high` и `git diff --check`.
   Если менялся updater, убедиться, что оба сгенерированных bundle обновлены и закоммичены.
4. Просмотреть весь staged diff и вывод `git status --ignored`; приватные локальные файлы не
   должны попасть в commit.
5. Открыть PR из рабочей ветки в `main`, дождаться зелёного GitHub Actions и влить PR.
   Ветка `main` защищена от прямой записи, удаления и force push.
6. Создать подписанный или annotated tag `vX.Y.Z` на проверенном commit и GitHub Release с
   краткими release notes.
7. После зелёного tag CI передвинуть ветку `stable` точно на release commit без отдельных
   изменений. `stable` защищена от удаления и force push, но допускает такой fast-forward.
8. Выполнить clean install по точному tag и canary-отправку синтетического файла.

Release tag неизменяем. Исправление публикуется новой SemVer-версией, а не переносом старого
tag. Секреты, реальные идентификаторы, содержимое файлов и серверные пути не входят ни в
release notes, ни в artifacts.
