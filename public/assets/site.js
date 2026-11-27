(() => {
  const slide = document.querySelector('.home .hero-action a.slide-commit');
  const handle = slide?.querySelector('.slide-commit__handle');
  if (handle && typeof slide.setPointerCapture === 'function') {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const hasModifier = (event) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    let drag;
    let suppressPointerClick = false;
    let navigationTimer;
    let lightFrame = 0;
    let lightX;
    let lightY;

    function clearLight() {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      slide.removeAttribute('data-slide-lit');
      slide.style.removeProperty('--slide-light-x');
      slide.style.removeProperty('--slide-light-y');
    }

    function trackLight(event) {
      if (event.pointerType !== 'mouse' || motion.matches || !hover.matches || slide.hasAttribute('data-slide-done')) return;
      lightX = event.clientX;
      lightY = event.clientY;
      if (lightFrame) return;

      lightFrame = requestAnimationFrame(() => {
        lightFrame = 0;
        const { left, top, width, height } = slide.getBoundingClientRect();
        const x = lightX - left;
        const y = lightY - top;
        const reach = 28;
        if (x < -reach || x > width + reach || y < -reach || y > height + reach) {
          if (slide.hasAttribute('data-slide-lit')) clearLight();
          return;
        }

        slide.style.setProperty('--slide-light-x', x + 'px');
        slide.style.setProperty('--slide-light-y', y + 'px');
        slide.setAttribute('data-slide-lit', '');
      });
    }

    function openProgram() {
      if (slide.hasAttribute('data-slide-done')) return;
      drag = undefined;
      clearLight();
      slide.removeAttribute('data-slide-held');
      slide.style.setProperty('--slide-progress', '1');
      slide.setAttribute('data-slide-done', '');
      // Leave the confirmation on screen briefly before the native page transition.
      navigationTimer = window.setTimeout(() => location.assign(slide.href), motion.matches ? 32 : 120);
    }

    function trackDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const distance = event.clientX - drag.x;
      if (Math.abs(distance) >= 6 || Math.abs(event.clientY - drag.y) >= 6) suppressPointerClick = true;
      const progress = Math.max(0, Math.min(1, distance / drag.travel));
      if (suppressPointerClick) slide.style.setProperty('--slide-progress', String(progress));
      if (progress >= 0.92) openProgram();
    }

    function releaseDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (event.type !== 'pointerup') suppressPointerClick = true;
      drag = undefined;
      slide.removeAttribute('data-slide-held');
      slide.style.removeProperty('--slide-progress');
    }

    slide.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || hasModifier(event) || drag || slide.hasAttribute('data-slide-done')) return;
      const inset = Number.parseFloat(getComputedStyle(slide).paddingInlineStart) || 0;
      const maxTravel = slide.clientWidth - handle.offsetWidth - 2 * inset;
      if (maxTravel <= 0) return;
      const endCenter = slide.getBoundingClientRect().right - inset - handle.offsetWidth / 2;
      const travel = Math.min(maxTravel, Math.max(maxTravel / 4, endCenter - event.clientX));
      suppressPointerClick = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, travel };
      slide.setAttribute('data-slide-held', '');
      slide.setPointerCapture(event.pointerId);
    });
    slide.addEventListener('pointermove', trackDrag);
    slide.addEventListener('pointerup', (event) => {
      trackDrag(event);
      releaseDrag(event);
    });
    slide.addEventListener('pointercancel', releaseDrag);
    slide.addEventListener('lostpointercapture', releaseDrag);
    slide.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || hasModifier(event)) return;
      event.preventDefault();
      if (event.detail === 0 || !suppressPointerClick) openProgram();
    });
    slide.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.key !== ' ' || hasModifier(event)) return;
      event.preventDefault();
      openProgram();
    });
    document.addEventListener('pointermove', trackLight, { passive: true });
    document.documentElement.addEventListener('pointerleave', clearLight);
    window.addEventListener('blur', clearLight);
    hover.addEventListener('change', clearLight);
    motion.addEventListener('change', clearLight);
    window.addEventListener('pagehide', () => {
      clearTimeout(navigationTimer);
      clearLight();
    });
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      drag = undefined;
      suppressPointerClick = false;
      slide.removeAttribute('data-slide-done');
      slide.removeAttribute('data-slide-held');
      slide.style.removeProperty('--slide-progress');
    });
    slide.setAttribute('aria-label', 'Двигай, чтобы открыть программу курса');
    slide.setAttribute('data-slide-ready', '');
  }

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

