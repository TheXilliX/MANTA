(() => {
  const transitionLink = document.querySelector('.home .hero-action .primary-button, .program .site-header .wordmark');
  if (transitionLink) {
    const target = new URL(transitionLink.href);
    window.addEventListener('pageswap', ({ activation, viewTransition }) => {
      if (!viewTransition) return;
      // The departing transition's ready promise rejects when skipped or hidden.
      viewTransition.ready.catch(() => {});
      const url = activation?.entry?.url;
      if (!url || new URL(url).pathname !== target.pathname) viewTransition.skipTransition();
    });
  }

  const grid = document.querySelector('.hero-grid');
  if (grid) {
    const motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame;
    const reset = () => {
      cancelAnimationFrame(frame);
      grid.style.removeProperty('--grid-x');
      grid.style.removeProperty('--grid-y');
    };

    document.body.addEventListener('pointermove', (event) => {
      if (!motion.matches || event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        grid.style.setProperty('--grid-x', ((event.clientX / window.innerWidth - .5) * 18).toFixed(1) + 'px');
        grid.style.setProperty('--grid-y', ((event.clientY / window.innerHeight - .5) * 12).toFixed(1) + 'px');
      });
    }, { passive: true });
    document.body.addEventListener('pointerleave', reset);
    motion.addEventListener('change', reset);
  }

  const drawer = document.querySelector('.drawer');
  let lastTrigger;
  if (drawer && typeof drawer.showModal === 'function') {
    document.querySelectorAll('[data-program]').forEach((link) => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        lastTrigger = link;
        drawer.showModal();
      });
    });
    drawer.addEventListener('click', (event) => {
      if (event.target !== drawer) return;
      const {left, right, top, bottom} = drawer.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) drawer.close();
    });
    drawer.addEventListener('close', () => lastTrigger?.focus({ preventScroll: true }));
  }

  for (const button of document.querySelectorAll('[data-copy]')) {
    if (!navigator.clipboard?.writeText) continue;
    button.hidden = false;
    const template = button.closest('.template');
    const source = template.querySelector('[data-template]');
    const message = template.querySelector('.copy-status');
    const label = button.querySelector('span');
    let reset;
    button.addEventListener('click', async () => {
      clearTimeout(reset);
      try {
        await navigator.clipboard.writeText(source.textContent);
        message.textContent = 'Шаблон скопирован';
        label.textContent = 'Скопировано';
        reset = setTimeout(() => { label.textContent = 'Скопировать'; message.textContent = ''; }, 2500);
      } catch {
        label.textContent = 'Скопировать';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(source);
        selection?.removeAllRanges();
        selection?.addRange(range);
        message.textContent = 'Текст выделен. Скопируй его обычным способом.';
      }
    });
  }
})();

