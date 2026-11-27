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
function page({base, title, description, content, classes, programPage=false, home=false}) {
  return '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="description" content="' + escapeHtml(description) + '"><title>' + escapeHtml(title) + '</title>' +
    '<link rel="icon" href="data:,">' +
    (home || programPage ? '<style>@view-transition{navigation:auto}@media(prefers-reduced-motion:reduce){@view-transition{navigation:none}}</style>' : '') +
    (home ? '<script>if(matchMedia("(prefers-reduced-motion: no-preference)").matches&&performance.getEntriesByType("navigation")[0]?.type!=="back_forward"){document.documentElement.dataset.heroIntro="";setTimeout(()=>{if(!document.querySelector("[data-dither-ready]"))document.documentElement.dataset.heroReveal=""},1600)}</script>' : '') +
    '<link rel="stylesheet" href="' + base + 'assets/site.css">' +
    (!home ? '<link rel="stylesheet" href="' + base + 'assets/program.css">' : '') +
    (home || programPage ? '<link rel="stylesheet" href="' + base + 'assets/hero-motion.css">' : '') +
    (home ? '<script src="' + base + 'assets/dither.js" defer fetchpriority="high"></script>' : '') +
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
  const items = lessons.map(chapter => '<li><a class="course-row" href="' + lessonLink('../', chapter.id) + '">' +
    escapeHtml(chapter.title) + '</a></li>').join('');
  const main = '<main id="main" class="contents-page frame">' +
    '<header class="contents-heading"><p>Лиды из <span lang="en">Threads</span></p><h1>Оглавление</h1></header>' +
    '<nav aria-label="Уроки"><ul class="contents-list">' + items + '</ul></nav></main>';
  return page({base:'../', title:'Оглавление — Лиды из Threads', description:'Оглавление курса по Threads.',
    content:main, classes:'program light', programPage:true});
}

function lessonPage(chapter) {
  const base = '../../';
  const main = '<main id="main" class="lesson-placeholder frame"><h1>' + escapeHtml(chapter.title) +
    '</h1><p>Урок в подготовке.</p><a href="' + courseLink(base) + '">К оглавлению</a></main>';
  return page({base, title:chapter.title + ' — Лиды из Threads', description:'Урок в подготовке.',
    content:main, classes:'light'});
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
  ...lessons.map(chapter => output('lessons/' + chapter.id + '/', lessonPage(chapter))),
]);
await writeFile(dist('.nojekyll'), '');
console.log('Built ' + (lessons.length + 2) + ' pages in ' + join('dist', ''));

