(() => {
  "use strict";

  const FRAME_COUNT = 100;
  const CYCLES = 1;
  const SCREENS_PER_CYCLE = 2;
  const PLAYBACK_FPS = 120;
  const INERTIA_MS = 220;

  const image = document.getElementById("frame");
  const space = document.getElementById("scroll-space");
  if (!image || !space) {
    return;
  }


  const sources = Array.from({ length: FRAME_COUNT }, (_, index) => {
    const img = new Image();
    img.src = `animation/${String(index + 1).padStart(4, "0")}.webp`;
    if (typeof img.decode === "function") {
      img.decode().catch(() => {});
    }
    return img.src;
  });

  let maxScroll = 1;
  let cyclePx = 1;
  let displayFrame = 0;
  let shownIndex = -1;
  let running = false;
  let lastTime = 0;
  let resizeRaf = 0;
  let wrapping = false;


  function layout() {
    const oldMax = maxScroll;
    const ratio = oldMax > 1 ? Math.min(window.scrollY / oldMax, 1) : 0;

    const needed = window.innerHeight * SCREENS_PER_CYCLE * CYCLES;
    space.style.height = `${Math.max(needed, window.innerHeight + 100)}px`;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    cyclePx = maxScroll / CYCLES;

    if (oldMax > 1 && window.scrollY > 0) {
      window.scrollTo(0, Math.round(ratio * maxScroll));
    }

    displayFrame = frameForScroll(window.scrollY);
    render();
  }


  function frameForScroll(y) {
    const progress = Math.max(0, Math.min(y / cyclePx, CYCLES));


    if (progress >= CYCLES - 1e-6) {
      return FRAME_COUNT - 1;
    }

    const index = Math.floor((progress % 1) * FRAME_COUNT);
    return Math.min(Math.max(index, 0), FRAME_COUNT - 1);
  }

  function render() {
    const index = Math.min(
      Math.max(Math.round(displayFrame), 0),
      FRAME_COUNT - 1
    );

    if (index !== shownIndex) {
      shownIndex = index;
      image.src = sources[index];
    }
  }


  function beginWrap(dir) {
    if (wrapping) {
      return;
    }
    wrapping = true;

    const target = dir < 0 ? maxScroll : 0;
    window.scrollTo(0, target);
    displayFrame = dir < 0 ? FRAME_COUNT - 1 : 0;
    render();

    wrapping = false;
  }



  function tick(now) {
    if (!running) {
      return;
    }

    const dt = lastTime ? Math.min(now - lastTime, 100) : 16.7;
    lastTime = now;

    const target = frameForScroll(window.scrollY);
    const maxStep = Math.min(1, dt / (1000 / PLAYBACK_FPS));
    const easing = 1 - Math.exp(-dt / INERTIA_MS);
    const diff = target - displayFrame;

    if (Math.abs(diff) < 0.01) {
      displayFrame = target;
    } else {
      const step = Math.min(Math.abs(diff) * easing, maxStep);
      displayFrame += Math.sign(diff) * step;
    }

    render();

    if (displayFrame !== target) {
      requestAnimationFrame(tick);
      return;
    }

    running = false;
    lastTime = 0;
  }

  function start() {
    if (running) {
      return;
    }
    running = true;
    lastTime = 0;
    requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", start, { passive: true });


  window.addEventListener(
    "wheel",
    (event) => {
      const canWrapDown =
        event.deltaY > 0 &&
        window.scrollY >= maxScroll - 2 &&
        shownIndex === FRAME_COUNT - 1;
      const canWrapUp =
        event.deltaY < 0 && window.scrollY <= 2 && shownIndex === 0;

      if (canWrapDown) {
        beginWrap(1);
      } else if (canWrapUp) {
        beginWrap(-1);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "resize",
    () => {
      if (resizeRaf) {
        return;
      }
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        layout();
        start();
      });
    },
    { passive: true }
  );

  layout();
})();
