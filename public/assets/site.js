(() => {
  function clearEdgeGlow(control) {
    control.removeAttribute('data-edge-lit');
    control.style.removeProperty('--edge-light-x');
    control.style.removeProperty('--edge-light-y');
  }

  const slide = document.querySelector('.home .hero-action a.slide-commit');
  const handle = slide?.querySelector('.slide-commit__handle');
  if (handle && typeof slide.setPointerCapture === 'function') {
    const hasModifier = (event) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    let drag;
    let navigationTimer;

    function openProgram() {
      if (slide.hasAttribute('data-slide-done')) return;
      drag = undefined;
      clearEdgeGlow(slide);
      slide.removeAttribute('data-slide-held');
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
      if (event.type === 'pointerup' && progress === 1) openProgram();
    }

    function releaseDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      drag = undefined;
      slide.removeAttribute('data-slide-held');
      slide.style.removeProperty('--slide-progress');
    }

    slide.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || hasModifier(event) || drag || slide.hasAttribute('data-slide-done')) return;
      if (!handle.contains(event.target)) return;
      const style = getComputedStyle(slide);
      const inset = Number.parseFloat(style.paddingInlineStart) || 0;
      const handleWidth = Number.parseFloat(style.getPropertyValue('--slide-handle'));
      const travel = slide.getBoundingClientRect().width - handleWidth - 2 * inset;
      if (travel <= 0) return;
      clearEdgeGlow(slide);
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
    window.addEventListener('pagehide', () => clearTimeout(navigationTimer));
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      drag = undefined;
      slide.removeAttribute('data-slide-done');
      slide.removeAttribute('data-slide-held');
      slide.style.removeProperty('--slide-progress');
    });
    slide.setAttribute('aria-label', 'Двигай, чтобы открыть разделы курса');
    slide.setAttribute('data-slide-ready', '');
  }

  const edgeControls = [...document.querySelectorAll('.edge-button, .slide-commit[data-slide-ready]')];
  if (edgeControls.length) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    let lightFrame = 0;
    let lightX;
    let lightY;

    function clearLighting() {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      edgeControls.forEach(clearEdgeGlow);
    }

    function updateLighting() {
      lightFrame = 0;
      const bounds = edgeControls.map(control => control.getBoundingClientRect());
      edgeControls.forEach((control, index) => {
        const { left, top, width, height } = bounds[index];
        const x = Math.max(0, Math.min(width, lightX - left));
        const y = Math.max(0, Math.min(height, lightY - top));
        const distance = Math.hypot(lightX - left - x, lightY - top - y);
        if (control.matches('[data-slide-held], [data-slide-done]') ||
            (control !== slide && distance > 64)) {
          if (control.hasAttribute('data-edge-lit')) clearEdgeGlow(control);
          return;
        }
        control.style.setProperty('--edge-light-x', x + 'px');
        control.style.setProperty('--edge-light-y', y + 'px');
        control.setAttribute('data-edge-lit', '');
      });
    }

    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motion.matches || !hover.matches) return;
      lightX = event.clientX;
      lightY = event.clientY;
      if (!lightFrame) lightFrame = requestAnimationFrame(updateLighting);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clearLighting);
    window.addEventListener('blur', clearLighting);
    window.addEventListener('pagehide', clearLighting);
    hover.addEventListener('change', clearLighting);
    motion.addEventListener('change', clearLighting);
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
