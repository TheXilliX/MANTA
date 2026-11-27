(() => {
  const scene = document.querySelector('.hero-scene');
  if (scene) {
    const motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame;
    const reset = () => {
      cancelAnimationFrame(frame);
      scene.style.removeProperty('--hero-x');
      scene.style.removeProperty('--hero-y');
    };

    document.body.addEventListener('pointermove', (event) => {
      if (!motion.matches || event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        scene.style.setProperty('--hero-x', ((event.clientX / window.innerWidth - .5) * 24).toFixed(1) + 'px');
        scene.style.setProperty('--hero-y', ((event.clientY / window.innerHeight - .5) * 16).toFixed(1) + 'px');
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

