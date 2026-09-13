// Only the containing documentation manages sizing and palette. Frames have no scripts.
export function mountStaticReferences() {
  const frames = [...document.querySelectorAll("iframe[data-reference]")];
  const palette = () => {
    for (const frame of frames) {
      const root = frame.contentDocument?.documentElement;
      if (root)
        root.dataset.theme =
          frame.dataset.fixedTheme ||
          document.documentElement.dataset.theme ||
          "dark";
    }
  };
  const resize = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const frame = entry.target.querySelector("iframe");
      const scale = Math.min(
        1,
        entry.contentRect.width / Number(frame.dataset.width),
      );
      frame.style.width = frame.dataset.viewport + "px";
      frame.style.height = frame.dataset.height + "px";
      frame.style.transform = `scale(${scale})`;
    }
  });
  for (const frame of frames) {
    frame.addEventListener("load", palette);
    resize.observe(frame.parentElement);
  }
  palette();
  window.addEventListener("twa:theme", palette);
  return () => {
    resize.disconnect();
    window.removeEventListener("twa:theme", palette);
    for (const frame of frames) frame.removeEventListener("load", palette);
  };
}
