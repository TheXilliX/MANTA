import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lessons } from './src/lessons.mjs';

const destination = new URL('./dist/', import.meta.url);
const assets = new URL('./public/assets/', import.meta.url);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const svg = (path) => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
const slideArrow = svg('<path d="M5 12h13m-5-5 5 5-5 5"/>');
const slideCheck = svg('<path d="m5 12 4 4L19 6"/>');

const lessonLink = (base, id) => base + 'lessons/' + id + '/';
const courseLink = (base) => base + 'program/';
const sections = [
  { id: 'threads', title: 'Threads' },
  { id: 'hooks', title: 'Хуки' },
  { id: 'profile', title: 'Упаковка профиля' },
];
const sectionIds = new Set(sections.map(section => section.id));
const placeholders = [
  ...sections,
  ...lessons.filter(lesson => !sectionIds.has(lesson.id)),
];

function page({base, title, description, content, classes, programPage=false, home=false}) {
  return '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="description" content="' + escapeHtml(description) + '"><title>' + escapeHtml(title) + '</title>' +
    '<link rel="icon" href="data:,">' +
    (home || programPage ? '<style>@view-transition{navigation:auto}@media(prefers-reduced-motion:reduce){@view-transition{navigation:none}}</style>' : '') +
    (home ? '<script>if(matchMedia("(prefers-reduced-motion: no-preference)").matches&&performance.getEntriesByType("navigation")[0]?.type!=="back_forward"){document.documentElement.dataset.heroIntro="";setTimeout(()=>{if(!document.querySelector("[data-dither-ready]"))document.documentElement.dataset.heroReveal=""},1600)}</script>' : '') +
    '<link rel="stylesheet" href="' + base + 'assets/site.css">' +
    (!home ? '<link rel="stylesheet" href="' + base + 'assets/program.css">' : '') +
    (home || programPage ? '<link rel="stylesheet" href="' + base + 'assets/hero-motion.css">' : '') +
    (home || programPage ? '<script src="' + base + 'assets/dither.js" defer fetchpriority="high"></script>' : '') +
    '<script src="' + base + 'assets/site.js" defer></script></head>' +
    '<body class="' + classes + '"><a class="skip-link" href="#main">К содержанию</a>' +
    content + '</body></html>';
}

function home() {
  const main = '<main id="main" class="home-main">' +
    '<div class="dither-container" aria-hidden="true"><canvas class="dither-canvas"></canvas></div>' +
    '<section class="hero-copy frame">' +
    '<h1><span class="hero-lead">Лиды из</span> <span lang="en">Threads</span></h1>' +
    '<div class="hero-action"><a class="primary-button slide-commit" href="' + courseLink('./') + '" draggable="false">' +
    '<span class="slide-commit__fallback">Начать</span>' +
    '<span class="slide-commit__label" aria-hidden="true">Двигай</span>' +
    '<span class="slide-commit__handle" aria-hidden="true">' + slideArrow + '</span>' +
    '<span class="slide-commit__done" aria-hidden="true">' + slideCheck + 'Открываем</span>' +
    '</a></div>' +
    '</section></main>';
  return page({base:'./', title:'Лиды из Threads', description:'Открытый мини-курс о трафике, постах и поиске клиентов в Threads.', content:main, classes:'home dark', home:true});
}

function program() {
  const [mainLesson, ...resources] = sections;
  const actionLink = (section, modifier = '') =>
    '<a class="edge-button' + (modifier ? ' ' + modifier : '') + '" href="' + lessonLink('../', section.id) +
    '" aria-label="Открыть урок — ' + escapeHtml(section.title) + '">Открыть урок</a>';
  const items = resources.map(section => '<section class="contents-resource"><h2>' +
    escapeHtml(section.title) + '</h2>' + actionLink(section) + '</section>').join('');
  const main = '<main id="main" class="contents-page">' +
    '<div class="dither-container" aria-hidden="true"><canvas class="dither-canvas"></canvas>' +
    '<img class="contents-art" data-dither-ray src="../assets/art/hero-ray.png" width="1280" height="853" alt="" fetchpriority="high"></div>' +
    '<div class="contents-layout frame"><div class="contents-lessons"><section class="contents-feature">' +
    '<h1 lang="en">' + escapeHtml(mainLesson.title) + '</h1>' +
    actionLink(mainLesson, 'edge-button--primary') +
    '</section><nav class="contents-resources" aria-label="Другие уроки">' + items + '</nav></div></div></main>';
  return page({base:'../', title:'Разделы курса — Лиды из Threads', description:'Основной урок, хуки и упаковка профиля.',
    content:main, classes:'program dark', programPage:true});
}

function lessonPage(chapter) {
  const base = '../../';
  const main = '<main id="main" class="lesson-placeholder frame"><h1>' + escapeHtml(chapter.title) +
    '</h1><p>Материал в подготовке.</p><a class="edge-button" href="' + courseLink(base) + '">К разделам</a></main>';
  return page({base, title:chapter.title + ' — Лиды из Threads', description:'Материал в подготовке.',
    content:main, classes:'dark'});
}

await access(new URL('dither.js', assets));
await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });
const dist = (file) => new URL(file, destination);
await cp(assets, dist('assets/'), { recursive: true });

async function output(folder, text) {
  const target = dist(folder);
  await mkdir(target, { recursive: true });
  await writeFile(new URL('index.html', target), text + '\n', 'utf8');
}

await Promise.all([
  output('./', home()),
  output('program/', program()),
  ...placeholders.map(chapter => output('lessons/' + chapter.id + '/', lessonPage(chapter))),
]);
await writeFile(dist('.nojekyll'), '');
console.log('Built ' + (placeholders.length + 2) + ' pages in ' + join('dist', ''));

