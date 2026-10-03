# Визуальный стиль и промпты

## Что взяли из подачи Ивы

Референс: [smixs/iva-agent](https://github.com/smixs/iva-agent), главная страница и изображения
`iva-header.webp`, `iva-use-cases.webp`; просмотрено 4 октября 2026 года.

- Первое сообщение — что человек получит; затем живые запросы, установка и помощь.
- Чёрный фон, крупная светлая типографика, тонкие цветные линии и много воздуха.
- Дерево и листья связывают название Ивы с образом продукта.
- У каждой картинки одна задача: познакомить или объяснить сценарий.
- Подробности устройства доступны отдельно, а примеры можно читать без знания кода.

### Разбор визуального референса

Subject & Blocking: дерево в левой части обложки, название и обещание справа.
Карточки сценариев строятся вокруг одного значка и короткого запроса.
Environment & Depth: чёрная плоскость, слабая глубина прозрачных карточек, свободные промежутки.
Lighting & Contrast: светлые надписи на чёрном фоне, сдержанные мятные, голубые и коралловые акценты.
Tech & Optics: фронтальная графическая композиция, тонкие контуры; обложка и карточки имеют разный масштаб.

## Правила для этой репы

Core look: спокойная иллюстрация о том, как готовая работа оказывается под рукой в Telegram.
Material language: натуральная фактура листьев, тонкие светлые линии, матовые тёмные карточки.
Structural rule: один путь от готовых документов к одному личному чату; ботаника поддерживает сюжет.
Color direction: фон `#080B0A`, текст `#F3F5EF`, мята `#91C9AD`,
коралл `#E8A88D`, голубой `#95BFDA`.

Текст с инструкциями остаётся в Markdown. Картинки — иллюстрации, не скриншоты и не обещание
конкретного интерфейса. Они не содержат пользовательских данных. На странице есть alt-текст.

## Набор изображений

| Файл | Целевой размер | Размещение | Содержание |
| --- | --- | --- | --- |
| `assets/file-delivery-hero.webp` | 1792×768, 7:3 | Верх README, ширина 100% | Ветка ивы, три типа документов, один чат, заголовок «Файлы прямо в чат». |
| `assets/file-delivery-flow.webp` | 1792×1024, 7:4 | Раздел «Как приходят файлы», ширина 100% | Запрос → готовые файлы → одна группа документов в личном чате. |

Рабочая ширина страницы GitHub примерно 850–900 px; изображения также проверяются на
узком экране. Для дополнительных иллюстраций сохраняйте эту палитру и минимум текста.
Промежуточные PNG не нужны в репозитории. Публикуются оптимизированные WebP.

## Как сгенерировано

Промпты составлены по навыку **image**: выбор модели → правила GPT Image → golden rules →
иллюстрация и точный текст. Генерация выполнена встроенным инструментом **imagegen**.
Рекомендованные параметры ниже описывают повторное использование промптов; встроенный
инструмент не позволяет явно выбрать модель или quality. Его фактическая модель не заявляется.

### 1. Обложка

- Model: gpt-image-2.5-flare
- Quality: high
- Size / Ratio: 1792×768 / 7:3

Prompt:

```text
Create a wide editorial cover illustration for the Russian Iva file delivery plugin, 1792x768 pixels, landscape.
Scene: an opaque near-black #080B0A background, a quiet spacious composition, subtle fine grain.
Subject: on the left third a slender willow branch with long drooping leaves drawn from fine mint #91C9AD lines and softly lit botanical detail. Three simple document sheets detach from the branch and travel along one restrained curved mint line toward a dark rounded message card on the lower right, conveying files delivered into a personal chat.
Important Details: crisp ivory #F3F5EF typography occupying the center and upper right. Render exactly once the small label "IVA / FILE DELIVERY" and exactly once the large Russian heading "Файлы прямо в чат" on two lines: "Файлы" then "прямо в чат". Use a readable geometric sans serif, large lowercase Russian forms after the initial capital, generous line spacing. Sheets feature only simple coral #E8A88D, blue #95BFDA and mint pictograms for a document, spreadsheet and presentation. Restrained translucent charcoal surfaces and thin borders, ample negative space, soft edge illumination. The lower right message card contains the three document symbols and a small paper-plane symbol, with no other lettering.
Use Case: GitHub README banner viewed at 850px wide and on mobile. An original companion illustration for an independently maintained Iva plugin.
Constraints: preserve text verbatim, all text fully legible, no extra text, no duplicate text, no watermark, no screenshot claims, no invented statistics or official endorsement. Keep the willow small and the title dominant; this is an editorial illustration with only one destination chat, no people, no technical architecture, no code rain or neon glow.
```

### 2. Доставка файлов

- Model: gpt-image-2.5-flare
- Quality: high
- Size / Ratio: 1792×1024 / 7:4

Prompt:

```text
Create an editorial explanatory illustration, 1792x1024 pixels landscape, for the Iva file delivery GitHub README.
Scene: opaque near-black #080B0A background with subtle fine grain and ample spacing; a small delicate drooping willow twig in the upper left corner.
Subject: a left-to-right journey with exactly three clear zones: a request bubble at left, three prepared document sheets in the center, one personal chat bubble at right containing a neatly stacked group of the same three documents. Two thin mint directional connectors connect these zones. Documents travel to exactly one destination.
Important Details: use large ivory #F3F5EF geometric sans-serif Russian labels below the three zones: render "Попросите Иву" once under the left zone, "Готовые файлы" once under the center, and "В вашем чате" once under the right. The left bubble has one coral document pictogram and a small mint speech mark, with no small written text. The center sheets have a coral #E8A88D document pictogram, blue #95BFDA spreadsheet grid, and mint #91C9AD presentation chart. The right chat card has three document rows with matching pictograms and a small ivory paper-plane emblem at top. Surfaces are charcoal with thin softly lit edges, the botanical twig has natural fine leaf texture. All three illustrations are at a similar scale. The labels remain visible at 850px width.
Use Case: a conceptual illustration showing a user requesting prepared files and receiving them as documents together in their own chat, not a real interface screenshot.
Constraints: all Russian labels exact and fully legible, exactly three zones and one destination, no extra text, no duplicate text, no watermark, no file sizes, no account identities, no server paths, no UI buttons, no claimed official Telegram screenshot. Match the restrained botanical charcoal mint editorial language described above, with no neon bloom, no people, no decorative technology circuitry.
```

## Проверка результата

- Кириллица точная, подписи читаются при уменьшении.
- Один получатель, три типа документа, понятное направление доставки.
- Нет выдуманных версий, функций, имён пользователей или размеров файлов.
- Карточки не выданы за настоящий Telegram-интерфейс.
- Изображения сохраняют контраст и свободное пространство.
- При доработке меняйте одну вещь за раз и перечисляйте, что сохранить:
  палитру, ветку ивы, формы документов, расположение и точный текст.

## Атрибуция

Методика подготовки промптов: Serge Shima,
[image / visual-skills](https://github.com/smixs/visual-skills), **CC BY 4.0**.
Композиция и промпты адаптированы для `iva-file-delivery`.
Новые изображения созданы для этого репозитория; исходные картинки Ивы не включены в него.
