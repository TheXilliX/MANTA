(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'manta-course-wave';
  let pending;
  let timer;

  function setOrigin({ x, y, start }) {
    const cx = x * innerWidth;
    const cy = y * innerHeight;
    const radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    root.style.setProperty('--course-wave-x', cx + 'px');
    root.style.setProperty('--course-wave-y', cy + 'px');
    root.style.setProperty('--course-wave-start', start + 'px');
    root.style.setProperty('--course-wave-end', Math.ceil(radius + 112) + 'px');
  }

  function closeWave() {
    clearTimeout(timer);
    pending = undefined;
    delete root.dataset.waveMode;
    for (const name of ['x', 'y', 'start', 'end']) root.style.removeProperty('--course-wave-' + name);
  }

  function readWave() {
    try {
      const wave = JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.removeItem(key);
      if (wave?.path === location.pathname && Date.now() - wave.time < 8000 &&
          Number.isFinite(wave.x) && Number.isFinite(wave.y) && Number.isFinite(wave.start)) return wave;
    } catch {
      // Storage can be unavailable in embedded previews.
    }
  }

  const incoming = readWave();
  if (incoming && !motion.matches) {
    setOrigin(incoming);
    root.dataset.waveMode = 'fallback';
    window.addEventListener('pagereveal', event => {
      const view = event.viewTransition;
      if (!view) return;
      root.dataset.waveMode = 'native';
      view.ready.catch(() => {
        root.dataset.waveMode = 'fallback';
      });
      view.finished.then(() => {
        if (root.dataset.waveMode === 'native') closeWave();
      }, closeWave);
    }, { once: true });
    window.addEventListener('animationend', event => {
      if (event.animationName === 'course-open' && event.target.matches?.('main') &&
          root.dataset.waveMode === 'fallback') closeWave();
    });
  }

  window.addEventListener('pageswap', event => {
    const view = event.viewTransition;
    if (!view) return;
    view.ready.catch(() => {});
    const targetUrl = event.activation?.entry?.url;
    if (!pending || !targetUrl || new URL(targetUrl).pathname !== pending.path) view.skipTransition();
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', event => { if (event.persisted) closeWave(); });

  window.openCoursePage = (link, confirmation = false) => {
    if (pending) return;
    if (motion.matches) {
      location.assign(link.href);
      return;
    }
    const url = new URL(link.href);
    const box = link.getBoundingClientRect();
    const start = Math.round(Math.min(86, box.height * (confirmation ? 1.26 : .78)));
    pending = {
      x: (box.left + box.width / 2) / innerWidth,
      y: (box.top + box.height / 2) / innerHeight,
      start,
      path: url.pathname,
      time: 0,
    };
    setOrigin(pending);
    root.dataset.waveMode = 'outgoing';
    timer = setTimeout(() => {
      try {
        pending.time = Date.now();
        sessionStorage.setItem(key, JSON.stringify(pending));
      } catch {
        // The standard link navigation still works.
      }
      location.assign(url.href);
    }, confirmation ? 360 : 165);
  };
})();
