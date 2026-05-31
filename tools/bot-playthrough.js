/* bot-playthrough.js - Bot heurístico que joga sozinho para validar que as fases são vencíveis.
   Use DEBUG=1 para ver onde ele trava: DEBUG=1 node tools/bot-playthrough.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DEBUG = !!process.env.DEBUG;

function noop() {}
function makeCtx() {
  return new Proxy({ globalAlpha: 1, imageSmoothingEnabled: false },
    { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (k === 'measureText' ? () => ({ width: 10 }) : noop))), set: (t, k, v) => { t[k] = v; return true; } });
}
function makeCanvas(w, h) { return { width: w || 0, height: h || 0, clientWidth: 900, clientHeight: 500, getContext: () => makeCtx(), style: {} }; }
function makeEl() {
  const cl = { _s: {}, add() {}, remove() {}, contains() { return false; }, toggle() {} };
  return { textContent: '', innerHTML: '', classList: cl, style: {}, addEventListener: noop, removeEventListener: noop };
}
const els = {};
const document = {
  readyState: 'complete',
  getElementById: (id) => (els[id] || (els[id] = id === 'game' ? makeCanvas() : makeEl())),
  querySelector: () => makeEl(), createElement: (t) => (t === 'canvas' ? makeCanvas() : makeEl()),
  addEventListener: noop, removeEventListener: noop, hidden: false
};
const sandbox = {
  console, Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number,
  performance: { now: () => Date.now() }, requestAnimationFrame: noop,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; }, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  document
};
sandbox.window = sandbox;
sandbox.window.devicePixelRatio = 1;
sandbox.window.addEventListener = noop;
sandbox.window.AudioContext = undefined;
vm.createContext(sandbox);

const base = path.join(__dirname, '..', 'www', 'src');
['audio.js', 'input.js', 'sprites.js', 'entities.js', 'levels.js', 'game.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), sandbox, { filename: f });
});

const Game = sandbox.window.Game;
const Input = sandbox.window.Input;
const Levels = sandbox.window.Levels;
const TILE = 16;

Game.init(document.getElementById('game'));
Game.start();
Game.lives = 99; // generoso: queremos testar vencibilidade, não perfeição

function solid(c, r) { return Game.isSolid(c, r, Game.player); }

let jumpHold = 0, stuckX = 0, stuckFrames = 0;

function step() {
  const p = Game.player;
  Input.left = false; Input.right = true; Input.run = true;

  const footRow = Math.floor((p.y + p.h + 2) / TILE);
  const midRow = Math.floor((p.y + p.h / 2) / TILE);
  const headRow = Math.floor(p.y / TILE);
  const colL = Math.floor(p.x / TILE);
  const colR = Math.floor((p.x + p.w) / TILE);
  const aheadCol = Math.floor((p.x + p.w + 2) / TILE);
  const ahead2 = Math.floor((p.x + p.w + 14) / TILE);
  // parede/cano/degrau à frente -> pulo cheio
  let wall = solid(aheadCol, midRow) || solid(aheadCol, footRow - 1) || solid(ahead2, midRow);

  // distância (em tiles) até o próximo buraco à frente, no nível do chão
  let pitDist = 999;
  if (p.onGround) {
    for (let d = 1; d <= 8; d++) {
      if (!solid(Math.floor((p.x + p.w + d * TILE) / TILE), footRow)) { pitDist = d; break; }
    }
  }
  const needBig = wall || pitDist <= 2;       // buraco na beira -> pula agora
  const pitFar = pitDist >= 3 && pitDist <= 8; // buraco à frente -> anda até a beira

  // teto baixo logo acima? (plataforma de tijolos) -> não dar pulo cheio
  const ceil = solid(colL, headRow - 1) || solid(colR, headRow - 1) ||
    solid(colL, headRow - 2) || solid(colR, headRow - 2) || solid(aheadCol, headRow - 1);

  // inimigo mais próximo à frente
  let edx = 999;
  for (const e of Game.entities) {
    if ((e.type === 'enemy') && !e.dead && !e.flat) {
      const dx = e.x - (p.x + p.w);
      if (dx > -6 && dx < edx && Math.abs(e.y - (p.y + p.h)) < 30) edx = dx;
    }
  }
  const enemyClose = (edx >= 2 && edx < 34);

  if (p.onGround && jumpHold === 0) {
    if (needBig) jumpHold = 17;               // buraco na beira / parede: pulo cheio
    else if (enemyClose) jumpHold = ceil ? 5 : 9; // pisar inimigo
    else if (pitFar) jumpHold = 0;            // anda até a beira do buraco
    else if (ceil) jumpHold = 0;              // anda sob os tijolos
    else jumpHold = 13;                       // quica em céu aberto
  }
  if (jumpHold > 0) { Input.jump = true; jumpHold--; } else Input.jump = false;

  // anti-travamento
  if (Math.abs(p.x - stuckX) < 1.0) stuckFrames++; else { stuckFrames = 0; stuckX = p.x; }
  if (stuckFrames > 40) { jumpHold = 17; stuckFrames = 0; }

  Game.update();
}

let failures = 0, cleared = 0;
for (let lvl = 0; lvl < Levels.count; lvl++) {
  const targetName = Game.level.name;
  const startIdx = Game.levelIndex;
  let frames = 0, ok = false, maxX = 0, wasDying = false; const deaths = [];
  while (frames < 12000) {
    const p = Game.player;
    if (p.x > maxX) maxX = p.x;
    if (p.dying && !wasDying) deaths.push(Math.round(p.x / TILE));
    wasDying = p.dying;
    step(); frames++;
    if (Game.levelIndex > startIdx || Game.state === 'win') { ok = true; break; }
    if (Game.state === 'gameover') break;
  }
  console.log((ok ? '\u2714' : '\u2718') + ' Fase ' + targetName + ' - ' + (ok ? 'vencida' : 'NÃO concluída') +
    ' em ' + frames + ' frames (vidas: ' + Game.lives + ')' +
    (DEBUG ? ' | maxCol=' + Math.round(maxX / TILE) + ' flagCol=' + Game.level.flagCol + ' mortes=' + JSON.stringify(deaths) : ''));
  if (ok) cleared++; else { failures++; break; }
  if (Game.state === 'win') break;
}

console.log('\nProbe do bot (heurístico): ' + cleared + '/' + Levels.count + ' fases concluídas automaticamente | Pontuação: ' + Game.score);
console.log('Obs.: este bot e um explorador reativo (corre sempre em frente). Pontos onde ele falha');
console.log('costumam ser triviais para um humano (esperar, mirar o pulo, recuar). Use como sonda, nao como nota.');
process.exit(0);
