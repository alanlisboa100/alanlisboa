/* probe.js - Mede a altura/alcance máximo de pulo do player. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function noop() {}
const ctx = new Proxy({}, { get: () => noop, set: () => true });
const document = { readyState: 'complete', getElementById: () => ({ getContext: () => ctx, clientWidth: 900, clientHeight: 500, width: 0, height: 0, classList: { add: noop, remove: noop }, addEventListener: noop, textContent: '', innerHTML: '', style: {} }), querySelector: () => ({ classList: { add: noop, remove: noop }, addEventListener: noop, textContent: '', innerHTML: '' }), createElement: () => ({ width: 0, height: 0, getContext: () => ctx }), addEventListener: noop };
const sandbox = { console, Math, Date, JSON, performance: { now: () => 0 }, requestAnimationFrame: noop, setTimeout: (f) => f && f(), clearTimeout: noop, setInterval: () => 0, clearInterval: noop, document, parseInt, parseFloat, Array, Object, Number, String };
sandbox.window = sandbox; sandbox.window.devicePixelRatio = 1; sandbox.window.addEventListener = noop; sandbox.window.AudioContext = undefined;
vm.createContext(sandbox);
const base = path.join(__dirname, '..', 'www', 'src');
['audio.js', 'input.js', 'sprites.js', 'entities.js', 'levels.js', 'game.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), sandbox, { filename: f }));
const E = sandbox.window.Entities, Input = sandbox.window.Input;

// mundo de teste: chão sólido na linha 13
const fakeGame = {
  level: { cols: 400, rows: 15, grid: [], pixelHeight: 240, pixelWidth: 6400, flagCol: 9999, items: {} },
  entities: [], isSolid(c, r) { return r >= 13; }, edgeAhead() { return false; },
  spawn() {}, addScore() {}, collectCoin() {}, flash() {}, onPlayerDeath() {}, hitBlockFromBelow() {}
};

function measure(power, hold) {
  const p = new E.Player(100, 13 * 16 - (power >= 1 ? 26 : 14));
  p.power = power; p.setSize(); p.x = 100; p.y = 13 * 16 - p.h;
  Input.reset(); Input.right = true; Input.run = true;
  const startBottom = p.y + p.h;
  let minTop = p.y, maxX = p.x, jumped = false, framesAir = 0;
  for (let f = 0; f < 200; f++) {
    Input.jump = !jumped || (f < hold);
    Input.update();
    p.update(fakeGame);
    if (!jumped && !p.onGround) jumped = true;
    if (jumped && !p.onGround) framesAir++;
    if (p.y < minTop) minTop = p.y;
    if (p.x > maxX) maxX = p.x;
    if (jumped && p.onGround && f > 5) break;
  }
  return { heightPx: Math.round(startBottom - minTop - p.h), distPx: Math.round(maxX - 100), air: framesAir };
}

for (const power of [0, 1]) {
  const full = measure(power, 200);
  console.log('Power ' + power + ' (segurando pulo TODO o tempo): altura=' + full.heightPx + 'px (' + (full.heightPx / 16).toFixed(1) + ' tiles), distância horizontal=' + full.distPx + 'px (' + (full.distPx / 16).toFixed(1) + ' tiles), frames no ar=' + full.air);
  const tap = measure(power, 4);
  console.log('Power ' + power + ' (toque rápido 4f): altura=' + tap.heightPx + 'px (' + (tap.heightPx / 16).toFixed(1) + ' tiles)');
}
