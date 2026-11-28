(() => {
  for (const type of ['selectstart', 'copy', 'cut']) {
    document.addEventListener(type, event => event.preventDefault());
  }
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') event.preventDefault();
  });

  function clearEdgeGlow(control) {
    control.removeAttribute('data-edge-lit');
    control.style.removeProperty('--edge-light-x');
    control.style.removeProperty('--edge-light-y');
    control.style.removeProperty('--edge-light-opacity');
  }

  const slide = document.querySelector('.home .hero-action a.slide-commit');
  const touchScreen = matchMedia('(pointer: coarse)');
  const handle = slide?.querySelector('.slide-commit__handle');
  if (handle && typeof slide.setPointerCapture === 'function') {
    const hasModifier = (event) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    let drag;

    function openProgram() {
      if (slide.hasAttribute('data-slide-done')) return;
      drag = undefined;
      clearEdgeGlow(slide);
      slide.removeAttribute('data-slide-held');
      slide.style.setProperty('--slide-progress', '1');
      slide.setAttribute('data-slide-done', '');
      window.openCoursePage(slide, { fromSlider: true, delay: touchScreen.matches ? 58 : 150 });
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
    let pointer;

    function clearLighting() {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      pointer = undefined;
      edgeControls.forEach(clearEdgeGlow);
    }

    function updateLighting() {
      lightFrame = 0;
      const bounds = edgeControls.map(control => control.getBoundingClientRect());
      edgeControls.forEach((control, index) => {
        const { left, top, width, height } = bounds[index];
        const [px, py] = pointer;
        const x = Math.max(0, Math.min(width, px - left));
        const y = Math.max(0, Math.min(height, py - top));
        const distance = Math.hypot(px - left - x, py - top - y);
        const lesson = control.closest('.contents-lessons');
        if (control.matches('[data-slide-held], [data-slide-done]') ||
            (control !== slide && !lesson && distance > 64)) {
          if (control.hasAttribute('data-edge-lit')) clearEdgeGlow(control);
          return;
        }
        control.style.setProperty('--edge-light-x', x + 'px');
        control.style.setProperty('--edge-light-y', y + 'px');
        if (lesson) control.style.setProperty('--edge-light-opacity', String(.24 + .76 * Math.exp(-distance / 132)));
        control.setAttribute('data-edge-lit', '');
      });
    }

    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motion.matches || !hover.matches) return;
      pointer = [event.clientX, event.clientY];
      if (!lightFrame) lightFrame = requestAnimationFrame(updateLighting);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clearLighting);
    window.addEventListener('blur', clearLighting);
    window.addEventListener('pagehide', clearLighting);
    hover.addEventListener('change', clearLighting);
    motion.addEventListener('change', clearLighting);
  }

  let openingLesson;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('.contents-lessons a.edge-button, .lesson-placeholder a.edge-button');
    if (!link) return;
    event.preventDefault();
    if (!link.closest('.contents-lessons') || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.openCoursePage(link);
      return;
    }
    if (openingLesson) return;
    openingLesson = link;
    link.setAttribute('data-edge-commit', '');
    window.openCoursePage(link);
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || !openingLesson) return;
    openingLesson.removeAttribute('data-edge-commit');
    openingLesson = undefined;
  });
})();
