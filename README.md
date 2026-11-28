# MANTA.

«Лиды из Threads» — сайт мини-курса о поиске клиентов в Threads. В программе три раздела: Threads, «Хуки» и «Упаковка профиля». Материалы уроков в подготовке.

[Открыть сайт «Лиды из Threads»](https://manta-course-preview.thexillix.chatgpt.site/)

## Локальный запуск

Нужен Node.js 22 или новее.

```sh
npm run build
npm run preview
```

Открой http://127.0.0.1:4173. Для публикации на статическом хостинге используй папку `dist/`. У каждого урока свой адрес. Все страницы генерируются заранее и читаются без JavaScript.

- `src/lessons.mjs` — уроки.
- `public/assets` — оформление, иллюстрации и шрифты.
- `build.mjs` — генерация страниц без сторонних зависимостей.

Google Sans поставляется с [лицензией SIL OFL 1.1](public/assets/fonts/OFL.txt).
