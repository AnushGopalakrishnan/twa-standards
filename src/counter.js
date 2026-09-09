import 'number-flow';

/** Accessible count; the decorative animation respects reduced motion. */
export function updateCounter(count, value, total, {trend = 1, animated = true} = {}) {
  count.setAttribute('aria-label', String(value) + ' / ' + String(total));
  let flow = count.querySelector('number-flow');
  if (!flow) {
    count.textContent = '';
    flow = document.createElement('number-flow');
    flow.setAttribute('aria-hidden', 'true');
    flow.format = {useGrouping:false};
    flow.transformTiming = {duration:220,easing:'cubic-bezier(.22,1,.36,1)'};
    flow.spinTiming = {duration:220,easing:'cubic-bezier(.22,1,.36,1)'};
    flow.opacityTiming = {duration:120,easing:'ease-out'};
    const suffix = document.createElement('span');
    suffix.className = 'lightbox-count-suffix';
    suffix.setAttribute('aria-hidden','true');
    count.append(flow, suffix);
  }
  count.querySelector('.lightbox-count-suffix').textContent = ' / ' + String(total);
  flow.trend = trend;
  flow.animated = animated && !matchMedia('(prefers-reduced-motion:reduce)').matches;
  flow.update(value);
}
