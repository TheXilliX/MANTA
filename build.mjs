import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lessons } from './src/lessons.mjs';

const destination = new URL('./dist/', import.meta.url);
const assets = new URL('./public/assets/', import.meta.url);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const indexLabel = (index) => String(index + 1).padStart(2, '0');
const brand = 'MANTA<span>.</span>';
const svg = (path) => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
const menuIcon = svg('<path d="M4 7h16M4 12h16M4 17h10"/>');
const closeIcon = svg('<path d="m6 6 12 12M18 6 6 18"/>');
const copyIcon = svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>');
const slideArrow = svg('<path d="M5 12h13m-5-5 5 5-5 5"/>');
const slideCheck = svg('<path d="m5 12 4 4L19 6"/>');

const lessonLink = (base, id) => base + 'lessons/' + id + '/';
const courseLink = (base) => base + 'program/';
function lessonMenu(base, current = '') {
  return '<ol class="course-list">' + lessons.map((chapter, i) =>
    '<li><a class="course-row" href="' + lessonLink(base, chapter.id) + '"' + (current === chapter.id ? ' aria-current="page"' : '') +
    '><span class="course-number">' + indexLabel(i) + '</span><span><strong>' + escapeHtml(chapter.title) +
    '</strong><small>' + escapeHtml(chapter.short) + '</small></span></a></li>').join('') + '</ol>';
}

function header(base, programPage) {
  return '<header class="site-header frame"><a class="wordmark" href="' + base + '" aria-label="MANTA. Главная">' + brand + '</a>' +
    (programPage ? '<a class="header-link" href="' + base + '">На главную</a>' : '<a class="header-link" href="' + courseLink(base) +
    '" data-program>' + menuIcon + 'Уроки</a>') + '</header>';
}

function drawer(base, current) {
  return '<dialog class="drawer" aria-labelledby="drawer-title"><div class="drawer-top"><h2 id="drawer-title">Программа</h2>' +
    '<form method="dialog"><button class="icon-button" type="submit" aria-label="Закрыть программу">' + closeIcon + '</button></form></div>' +
    '<p class="drawer-subtitle">' + lessons.length + ' уроков по трафику из Threads</p>' +
    '<nav aria-label="Список уроков">' + lessonMenu(base, current) + '</nav></dialog>';
}

function page({base, title, description, content, classes, current='', programPage=false, home=false}) {
  return '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="description" content="' + escapeHtml(description) + '"><title>' + escapeHtml(title) + '</title>' +
    '<link rel="icon" href="' + base + 'assets/manta-icon.png" type="image/png">' +
    (home || programPage ? '<style>@view-transition{navigation:auto}@media(prefers-reduced-motion:reduce){@view-transition{navigation:none}}</style>' : '') +
    '<link rel="stylesheet" href="' + base + 'assets/site.css">' +
    (home || programPage ? '<link rel="stylesheet" href="' + base + 'assets/hero-motion.css">' : '') +
    (home ? '<script src="' + base + 'assets/dither.js" defer fetchpriority="high"></script>' : '') +
    '<script src="' + base + 'assets/site.js" defer></script></head>' +
    '<body class="' + classes + '"><a class="skip-link" href="#main">К содержанию</a>' +
    (home ? '' : header(base, programPage)) + content + (home || programPage ? '' : drawer(base, current)) + '</body></html>';
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
  return page({base:'./', title:'Лиды из Threads — MANTA.', description:'Открытый мини-курс о трафике, постах и поиске клиентов в Threads.', content:main, classes:'home dark', home:true});
}

function program() {
  const main = '<main id="main" class="program-page frame"><div class="program-intro"><h1>Программа курса</h1>' +
    '<p>От оформления профиля и первых строк до поиска запросов и разбора результатов.</p></div>' +
    '<nav aria-label="Список уроков">' + lessonMenu('../') + '</nav></main>';
  return page({base:'../', title:'Программа курса — MANTA.', description:'Восемь уроков по трафику из Threads.', content:main, classes:'program dark', programPage:true});
}

function renderItem(item) {
  if (typeof item === 'string') return '<p>' + escapeHtml(item) + '</p>';
  if (Array.isArray(item)) return '<ul>' + item.map((value) => '<li>' + escapeHtml(value) + '</li>').join('') + '</ul>';
  if (item.quote) return '<blockquote><p>' + escapeHtml(item.quote) + '</p></blockquote>';
  return '<dl class="comparison">' + item.rows.map(([term, desc]) =>
    '<div><dt>' + escapeHtml(term) + '</dt><dd>' + escapeHtml(desc) + '</dd></div>').join('') + '</dl>';
}

function lessonPage(chapter, index) {
  const base = '../../';
  const sections = chapter.sections.map(([title, ...items], i) => '<section class="lesson-section" id="section-' + (i + 1) +
    '"><h2>' + escapeHtml(title) + '</h2>' + items.map(renderItem).join('') + '</section>').join('');
  const table = '<aside class="lesson-aside"><nav aria-label="Содержание урока"><h2>В этом уроке</h2><ul>' +
    chapter.sections.map(([title], i) => '<li><a href="#section-' + (i + 1) + '">' + escapeHtml(title) + '</a></li>').join('') +
    '<li><a href="#practice">Практика</a></li></ul></nav></aside>';
  const terms = chapter.labels ? '<dl class="glossary">' + chapter.labels.map(([term, desc]) =>
    '<div><dt>' + escapeHtml(term) + '</dt><dd>' + escapeHtml(desc) + '</dd></div>').join('') + '</dl>' : '';
  const practice = '<section class="practice" id="practice"><h2>Практика</h2><p>' + escapeHtml(chapter.task) +
    '</p><div class="template"><div class="template-bar"><h3>Шаблон</h3>' +
    '<button class="copy-button" type="button" data-copy hidden>' + copyIcon + '<span>Скопировать</span></button></div>' +
    '<pre data-template>' + escapeHtml(chapter.template) + '</pre><span class="copy-status" role="status"></span></div></section>';
  const neighbor = (offset, label) => {
    const item = lessons[index + offset];
    if (!item) return '<a class="neighbor" href="' + courseLink(base) + '" data-program><span>' + label + '</span><strong>К программе</strong></a>';
    return '<a class="neighbor" href="' + lessonLink(base, item.id) + '"><span>' + label + '</span><strong>' +
      escapeHtml(item.title) + '</strong></a>';
  };
  const main = '<main id="main"><section class="chapter-hero"><img class="chapter-art" src="' + base + 'assets/art/' + chapter.scene +
    '.jpg" alt="" fetchpriority="high"><div class="chapter-shade"></div><div class="chapter-heading frame"><p class="chapter-number">Урок ' +
    indexLabel(index) + ' / ' + String(lessons.length).padStart(2, '0') + '</p><h1>' + escapeHtml(chapter.title) +
    '</h1><p class="lead">' + escapeHtml(chapter.lead) + '</p></div></section>' +
    '<div class="lesson-grid frame"><article class="lesson-body"><div class="takeaway"><p><strong>После урока</strong><br>' + escapeHtml(chapter.takeaway) + '</p></div>' + sections + terms + practice + '</article>' + table + '</div>' +
    '<nav class="lesson-nav frame" aria-label="Переход между уроками">' + neighbor(-1,'Назад') +
    neighbor(1,index === lessons.length - 1 ? 'Все уроки' : 'Следующий урок') + '</nav></main>';
  return page({base, title:chapter.title + ' — MANTA.', description:chapter.lead, content:main,
    classes:'lesson ' + chapter.theme + ' look-' + chapter.look, current:chapter.id});
}

const expectedScenes = lessons.map(({scene}) => scene + '.jpg');
await Promise.all([
  access(new URL('dither.js', assets)),
  ...expectedScenes.map((name) => access(new URL('art/' + name, assets))),
]);
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
  ...lessons.map((chapter, i) => output('lessons/' + chapter.id + '/', lessonPage(chapter, i))),
]);
await writeFile(dist('.nojekyll'), '');
console.log('Built ' + (lessons.length + 2) + ' pages in ' + join('dist', ''));

