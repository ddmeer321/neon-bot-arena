export function createFPSCounter() {
  let lastTime = performance.now();
  let frames = 0;
  let fps = 0;

  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.top = "10px";
  el.style.right = "10px";
  el.style.padding = "6px 10px";
  el.style.background = "rgba(0,0,0,0.6)";
  el.style.color = "#b7ff4a";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "14px";
  el.style.zIndex = "9999";
  el.style.borderRadius = "6px";
  el.textContent = "FPS: ...";

  document.body.appendChild(el);

  function update() {
    frames++;
    const now = performance.now();

    if (now - lastTime >= 1000) {
      fps = frames;
      frames = 0;
      lastTime = now;
      el.textContent = `FPS: ${fps}`;
    }

    requestAnimationFrame(update);
  }

  update();

  return {
    getFPS: () => fps
  };
}