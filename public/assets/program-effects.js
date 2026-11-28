(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const touchScreen = matchMedia('(pointer: coarse)');
  const focusTitle = document.querySelector('.focus-title');
  const focusWords = [...focusTitle.querySelectorAll('[data-focus-word]')];
  const words = [...document.querySelectorAll('[data-fuzzy]')].flatMap(word => {
    const canvas = document.createElement('canvas');
    const source = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const ink = source.getContext('2d');
    if (!context || !ink) return [];
    canvas.setAttribute('aria-hidden', 'true');
    word.append(canvas);
    return [{ word, canvas, source, context, ink, lead: Boolean(word.closest('h1')) }];
  });
  const focusHold = 1700;
  let current = 0;
  let pinned = false;
  let nextFocus = 0;
  let lastDraw = 0;
  let frame = 0;
  let ready = false;
  let departing = false;
  let leadPressed = false;

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

  function measure(item) {
    const { word, canvas, source, ink } = item;
    const style = getComputedStyle(word);
    const box = word.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const size = parseFloat(style.fontSize);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const pad = Math.ceil(Math.max(7, size * .11));
    canvas.width = source.width = Math.ceil((box.width + 2 * pad) * ratio);
    canvas.height = source.height = Math.ceil((box.height + 2 * pad) * ratio);
    word.style.setProperty('--fuzzy-padding', pad + 'px');
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
    ink.fillStyle = style.color;
    const plain = word.querySelector('.fuzzy-ink').textContent;
    const text = style.textTransform === 'uppercase' ? plain.toUpperCase() : plain;
    const metrics = ink.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent ?? size * .8;
    const descent = metrics.fontBoundingBoxDescent ?? size * .2;
    const baseline = pad + (box.height + ascent - descent) / 2;
    ink.translate(pad, baseline);
    ink.scale(box.width / Math.max(1, metrics.width), 1);
    ink.fillText(text, 0, 0);
    item.strip = Math.max(1, Math.round(ratio * (touchScreen.matches ? 2.5 : item.lead ? 2 : 1.35)));
    item.amount = ratio * (item.lead ? Math.min(3.4, size * .034) : Math.min(1.25, size * .033));
  }

  function draw(item) {
    const { word, canvas, source, context, amount, strip, lead } = item;
    if (!strip) return;
    const boost = lead && (touchScreen.matches ? leadPressed : word.matches(':hover'));
    const range = amount * (boost ? 3.9 : 1);
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < canvas.height; row += strip) {
      const height = Math.min(strip, canvas.height - row);
      const offset = Math.round((Math.random() * 2 - 1) * range);
      context.drawImage(source, 0, row, canvas.width, height, offset, row, canvas.width, height);
    }
    if (!word.hasAttribute('data-fuzzy-ready')) word.setAttribute('data-fuzzy-ready', '');
  }

  function tick(now) {
    frame = 0;
    if (motion.matches || departing || document.hidden) return;
    if (!pinned && now >= nextFocus) setFocus((current + 1) % focusWords.length);
    if (now - lastDraw >= (touchScreen.matches ? 66 : 34)) {
      words.forEach(draw);
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
    words.forEach(measure);
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

  const lead = words.find(item => item.lead);
  lead?.word.addEventListener('pointerdown', event => {
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
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    departing = false;
    leadPressed = false;
    refresh();
  });

  const observer = new ResizeObserver(refresh);
  observer.observe(focusTitle);
  words.forEach(({ word }) => observer.observe(word));
  document.fonts.ready.then(() => {
    ready = true;
    refresh();
  });
})();
