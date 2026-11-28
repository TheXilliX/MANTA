(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'manta-course-wave';
  let pending;
  let timer;

  function setOrigin({ x, y, width, start }) {
    const cx = width === innerWidth ? x : x * innerWidth / width;
    const cy = y;
    const radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    root.style.setProperty('--course-wave-x', cx + 'px');
    root.style.setProperty('--course-wave-y', cy + 'px');
    root.style.setProperty('--course-wave-start', start + 'px');
    root.style.setProperty('--course-wave-end', Math.ceil(radius + 112) + 'px');
  }

  function alignFallbackMask() {
    const box = document.querySelector('main')?.getBoundingClientRect();
    if (!box) return;
    root.style.setProperty('--course-wave-main-x', box.left + 'px');
    root.style.setProperty('--course-wave-main-y', box.top + 'px');
  }

  function closeWave() {
    clearTimeout(timer);
    pending = undefined;
    delete root.dataset.waveMode;
    delete root.dataset.waveSource;
    for (const name of ['x', 'y', 'start', 'end', 'main-x', 'main-y']) root.style.removeProperty('--course-wave-' + name);
    window.dispatchEvent(new Event('course-wave-end'));
  }

  function readWave() {
    try {
      const wave = JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.removeItem(key);
      if (wave?.path === location.pathname && Date.now() - wave.time < 8000 &&
          Number.isFinite(wave.x) && Number.isFinite(wave.y) && Number.isFinite(wave.start) && wave.width > 0) return wave;
    } catch {
      // Storage can be unavailable in embedded previews.
    }
  }

  const incoming = readWave();
  if (incoming && !motion.matches) {
    setOrigin(incoming);
    if (incoming.fromSlider) root.dataset.waveSource = 'slider';
    root.dataset.waveMode = 'fallback';
    document.addEventListener('DOMContentLoaded', alignFallbackMask, { once: true });
    window.addEventListener('pagereveal', event => {
      const view = event.viewTransition;
      if (!view) return;
      root.dataset.waveMode = 'native';
      view.ready.catch(() => {
        alignFallbackMask();
        root.dataset.waveMode = 'fallback';
      });
      const finishNative = () => {
        if (root.dataset.waveMode === 'native') closeWave();
      };
      view.finished.then(finishNative, finishNative);
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
    view.finished.catch(() => {});
    const targetUrl = event.activation?.entry?.url;
    if (!pending || !targetUrl || new URL(targetUrl).pathname !== pending.path) view.skipTransition();
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', event => { if (event.persisted) closeWave(); });

  window.openCoursePage = (link, { fromSlider = false, delay = 0 } = {}) => {
    if (pending) return;
    if (motion.matches) {
      location.assign(link.href);
      return;
    }
    const url = new URL(link.href);
    const box = link.getBoundingClientRect();
    const start = Math.round(Math.min(86, box.height * (fromSlider ? .92 : .78)));
    pending = {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      width: innerWidth,
      start,
      fromSlider,
      path: url.pathname,
      time: 0,
    };
    window.dispatchEvent(new Event('course-wave-start'));
    function navigate() {
      try {
        pending.time = Date.now();
        sessionStorage.setItem(key, JSON.stringify(pending));
      } catch {
        // The standard link navigation still works.
      }
      location.assign(url.href);
    }
    if (delay > 0) timer = setTimeout(navigate, delay);
    else navigate();
  };
})();
