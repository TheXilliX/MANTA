(() => {
  const slide = document.querySelector('.home .hero-action a.slide-commit');
  const handle = slide?.querySelector('.slide-commit__handle');
  if (handle && typeof slide.setPointerCapture === 'function') {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const hasModifier = (event) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    let drag;
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
        const x = Math.max(0, Math.min(width, lightX - left));
        const y = Math.max(0, Math.min(height, lightY - top));

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
      slide.removeAttribute('data-slide-full');
      slide.style.setProperty('--slide-progress', '1');
      slide.setAttribute('data-slide-done', '');
      // Leave the confirmation on screen briefly before the native page transition.
      navigationTimer = window.setTimeout(() => location.assign(slide.href), 700);
    }

    function trackDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const distance = event.clientX - drag.x;
      const progress = Math.max(0, Math.min(1, distance / drag.travel));
      slide.style.setProperty('--slide-progress', String(progress));
      slide.toggleAttribute('data-slide-full', progress === 1);
      if (event.type === 'pointerup' && distance >= drag.travel - 1) openProgram();
    }

    function releaseDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      drag = undefined;
      slide.removeAttribute('data-slide-held');
      slide.removeAttribute('data-slide-full');
      slide.style.removeProperty('--slide-progress');
    }

    slide.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || hasModifier(event) || drag || slide.hasAttribute('data-slide-done')) return;
      const style = getComputedStyle(slide);
      const inset = Number.parseFloat(style.paddingInlineStart) || 0;
      const handleWidth = Number.parseFloat(style.getPropertyValue('--slide-handle'));
      const maxTravel = slide.clientWidth - handleWidth - 2 * inset;
      if (maxTravel <= 0) return;
      const endCenter = slide.getBoundingClientRect().right - inset - handleWidth / 2;
      const travel = Math.min(maxTravel, Math.max(maxTravel / 4, endCenter - event.clientX));
      drag = { id: event.pointerId, x: event.clientX, travel };
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
      if (event.detail === 0) openProgram();
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
      slide.removeAttribute('data-slide-done');
      slide.removeAttribute('data-slide-held');
      slide.removeAttribute('data-slide-full');
      slide.style.removeProperty('--slide-progress');
    });
    slide.setAttribute('aria-label', 'Двигай, чтобы открыть оглавление');
    slide.setAttribute('data-slide-ready', '');
  }

  const transitionLink = document.querySelector('.home .hero-action .primary-button');
  if (transitionLink || document.body.classList.contains('program')) {
    const target = transitionLink ? new URL(transitionLink.href) : null;
    window.addEventListener('pageswap', ({ activation, viewTransition }) => {
      if (!viewTransition) return;
      // The departing transition's ready promise rejects when skipped or hidden.
      viewTransition.ready.catch(() => {});
      const url = activation?.entry?.url;
      if (!url || new URL(url).pathname !== target?.pathname) viewTransition.skipTransition();
    });
  }

})();
