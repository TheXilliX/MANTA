// Tech Text sweep and letter reveal adapted from David Haz's React Bits.
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/TechText/TechText.jsx
// MIT + Commons Clause. See the license notice in waves.js.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const touchScreen = matchMedia('(pointer: coarse)');
  const focusTitle = document.querySelector('.focus-title');
  const focusWords = [...focusTitle.querySelectorAll('[data-focus-word]')];
  const title = document.querySelector('[data-fuzzy]');
  const techTitle = document.querySelector('.tech-title');
  const techInk = techTitle.querySelector('.tech-ink');
  const techCanvas = document.createElement('canvas');
  const tech = techCanvas.getContext('2d');
  if (tech) {
    techCanvas.className = 'tech-canvas';
    techCanvas.setAttribute('aria-hidden', 'true');
    techTitle.append(techCanvas);
  }
  const canvas = document.createElement('canvas');
  const source = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const ink = source.getContext('2d');
  if (context && ink) {
    canvas.setAttribute('aria-hidden', 'true');
    title.append(canvas);
  }
  const focusHold = 1700;
  let current = 0;
  let pinned = false;
  let nextFocus = 0;
  let lastDraw = 0;
  let frame = 0;
  let ready = false;
  let departing = false;
  let leadPressed = false;
  let strip = 0;
  let idleAmount = 0;
  let activeAmount = 0;
  let techRatio = 1;
  let techPadding = 10;
  let techBaseline;
  let techColor;
  let techAccent;
  let techGlyphs = [];
  let techFrame;
  let techPointer;
  let techClock = 0;
  let techPrevious = 0;
  let techCursor;

  function measureTech() {
    if (!tech) return;
    const box = techTitle.getBoundingClientRect();
    const ink = techInk.getBoundingClientRect();
    const style = getComputedStyle(techInk);
    techRatio = Math.min(devicePixelRatio || 1, 1.5);
    techPadding = Math.ceil(Math.max(8, parseFloat(style.fontSize) * .34));
    techTitle.style.setProperty('--tech-padding', techPadding + 'px');
    techCanvas.width = Math.ceil((box.width + 2 * techPadding) * techRatio);
    techCanvas.height = Math.ceil((box.height + 2 * techPadding) * techRatio);
    tech.setTransform(techRatio, 0, 0, techRatio, 0, 0);
    tech.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    if ('letterSpacing' in tech) tech.letterSpacing = style.letterSpacing;
    tech.lineJoin = 'round';
    tech.lineWidth = 1;
    techColor = style.color;
    techAccent = style.getPropertyValue('--blue').trim() || '#82c4ff';
    const word = techInk.textContent;
    const metrics = tech.measureText(word);
    const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
    const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
    techBaseline = techPadding + (box.height + ascent - descent) / 2;
    let prefix = '';
    techGlyphs = [...word].map(char => {
      prefix += char;
      const own = tech.measureText(char);
      const x = techPadding + ink.left - box.left + tech.measureText(prefix).width - own.width;
      const bounds = [
        x - own.actualBoundingBoxLeft - 3,
        techBaseline - own.actualBoundingBoxAscent - 3,
        x + own.actualBoundingBoxRight + 3,
        techBaseline + own.actualBoundingBoxDescent + 3,
      ];
      return { char, x, bounds, center: (bounds[0] + bounds[2]) / 2, outline: 0 };
    });
    techFrame = undefined;
    techCursor = undefined;
  }

  function drawTech(now) {
    if (!techGlyphs.length) return;
    const dt = Math.min(85, techPrevious ? now - techPrevious : 34);
    techPrevious = now;
    if (techPointer === undefined) techClock += dt;
    const first = techGlyphs[0].center;
    const last = techGlyphs.at(-1).center;
    const target = techPointer ?? first + (last - first) * (.5 - .5 * Math.cos(techClock / 580));
    const glide = 1 - Math.exp(-dt / 80);
    techCursor ??= target;
    techCursor += (target - techCursor) * glide;
    const selected = techGlyphs.reduce((closest, glyph) =>
      Math.abs(glyph.center - techCursor) < Math.abs(closest.center - techCursor) ? glyph : closest);
    tech.clearRect(0, 0, techCanvas.width / techRatio, techCanvas.height / techRatio);
    for (const glyph of techGlyphs) {
      glyph.outline += (Number(glyph === selected) - glyph.outline) * glide;
      tech.globalAlpha = 1 - glyph.outline;
      tech.fillStyle = techColor;
      tech.fillText(glyph.char, glyph.x, techBaseline);
      tech.globalAlpha = glyph.outline;
      tech.strokeStyle = techColor;
      tech.setLineDash([2.1, 1.4]);
      tech.strokeText(glyph.char, glyph.x, techBaseline);
    }

    techFrame = (techFrame ?? selected.bounds).map((value, index) => value + (selected.bounds[index] - value) * glide);
    const [left, top, right, bottom] = techFrame;
    tech.globalAlpha = .44;
    tech.strokeStyle = techAccent;
    tech.setLineDash([]);
    tech.strokeRect(left, top, right - left, bottom - top);
    tech.globalAlpha = .94;
    tech.fillStyle = techAccent;
    for (const x of [left, right]) {
      for (const y of [top, bottom]) tech.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
    }
    const sweep = ((now / 530) % 1) * (right - left);
    tech.fillRect(left + sweep - 1.3, top - 1.3, 2.6, 2.6);
    tech.fillRect(right - sweep - 1.3, bottom - 1.3, 2.6, 2.6);
    tech.globalAlpha = 1;
    if (!techTitle.hasAttribute('data-tech-ready')) techTitle.setAttribute('data-tech-ready', '');
  }

  function setFocus(index) {
    if (motion.matches) return;
    current = index;
    const title = focusTitle.getBoundingClientRect();
    const target = focusWords[index].getBoundingClientRect();
    focusTitle.style.setProperty('--focus-x', target.left - title.left + 'px');
    focusTitle.style.setProperty('--focus-y', target.top - title.top + 'px');
    focusTitle.style.setProperty('--focus-width', target.width + 'px');
    focusTitle.style.setProperty('--focus-height', target.height + 'px');
    focusWords.forEach((word, i) => word.toggleAttribute('data-focus-current', i === index));
    focusTitle.setAttribute('data-focus-ready', '');
    nextFocus = performance.now() + focusHold;
  }

  function measureTitle() {
    if (!context || !ink) return;
    const style = getComputedStyle(title);
    const box = title.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const size = parseFloat(style.fontSize);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const active = Math.min(16, size * .156);
    const pad = Math.ceil(Math.max(8, active + 2));
    canvas.width = source.width = Math.ceil((box.width + 2 * pad) * ratio);
    canvas.height = source.height = Math.ceil((box.height + 2 * pad) * ratio);
    title.style.setProperty('--fuzzy-padding', pad + 'px');
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
    ink.fillStyle = style.color;
    const plain = title.querySelector('.fuzzy-ink').textContent;
    const text = style.textTransform === 'uppercase' ? plain.toUpperCase() : plain;
    const metrics = ink.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent ?? size * .8;
    const descent = metrics.fontBoundingBoxDescent ?? size * .2;
    const baseline = pad + (box.height + ascent - descent) / 2;
    ink.translate(pad, baseline);
    ink.scale(box.width / Math.max(1, metrics.width), 1);
    ink.fillText(text, 0, 0);
    strip = Math.max(1, Math.round(ratio * (touchScreen.matches ? 2.5 : 2)));
    idleAmount = ratio * Math.min(2.25, size * .023);
    activeAmount = ratio * active;
  }

  function drawTitle() {
    if (!strip) return;
    const boost = touchScreen.matches ? leadPressed : title.matches(':hover');
    const range = boost ? activeAmount : idleAmount;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < canvas.height; row += strip) {
      const height = Math.min(strip, canvas.height - row);
      const offset = Math.round((Math.random() * 2 - 1) * range);
      context.drawImage(source, 0, row, canvas.width, height, offset, row, canvas.width, height);
    }
    if (!title.hasAttribute('data-fuzzy-ready')) title.setAttribute('data-fuzzy-ready', '');
  }

  function tick(now) {
    frame = 0;
    if (motion.matches || departing || document.hidden) return;
    if (!pinned && now >= nextFocus) setFocus((current + 1) % focusWords.length);
    if (now - lastDraw >= (touchScreen.matches ? 66 : 34)) {
      drawTitle();
      drawTech(now);
      lastDraw = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function wake() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!ready || motion.matches || departing || document.hidden) return;
    if (touchScreen.matches && document.documentElement.hasAttribute('data-wave-mode')) return;
    frame = requestAnimationFrame(tick);
  }

  function refresh() {
    if (!ready || motion.matches || departing) return;
    if (touchScreen.matches && document.documentElement.hasAttribute('data-wave-mode')) return;
    measureTitle();
    measureTech();
    setFocus(current);
    wake();
  }

  focusWords.forEach((word, index) => {
    word.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      pinned = true;
      setFocus(index);
    });
    word.addEventListener('pointerleave', () => {
      pinned = false;
      nextFocus = performance.now() + focusHold;
    });
  });

  function trackTech(event) {
    techPointer = event.clientX - techTitle.getBoundingClientRect().left + techPadding;
  }
  function releaseTech() { techPointer = undefined; }
  techTitle.addEventListener('pointermove', trackTech, { passive: true });
  techTitle.addEventListener('pointerdown', trackTech, { passive: true });
  techTitle.addEventListener('pointerleave', releaseTech);
  techTitle.addEventListener('pointercancel', releaseTech);
  techTitle.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') releaseTech(); });

  title.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    leadPressed = true;
    lastDraw = 0;
  });
  const releaseLead = () => { leadPressed = false; };
  window.addEventListener('pointerup', releaseLead);
  window.addEventListener('pointercancel', releaseLead);

  motion.addEventListener('change', () => {
    if (motion.matches) focusTitle.removeAttribute('data-focus-ready');
    else refresh();
    wake();
  });
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('course-wave-end', refresh);
  window.addEventListener('course-wave-start', () => {
    departing = true;
    wake();
  });
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pinned = false;
    releaseTech();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    departing = false;
    leadPressed = false;
    refresh();
  });

  const observer = new ResizeObserver(refresh);
  observer.observe(focusTitle);
  observer.observe(title);
  observer.observe(techTitle);
  document.fonts.ready.then(() => {
    ready = true;
    refresh();
  });
})();
