/* levels.js - Definição das fases via construtor de grid */
(function () {
  'use strict';

  // Códigos de tile (1 caractere cada)
  var T = {
    EMPTY: ' ', GROUND: 'G', BRICK: 'B',
    QCOIN: '?', QPOW: 'M', QSTAR: '*', USED: 'u',
    STONE: 'X',
    PIPE_TL: '[', PIPE_TR: ']', PIPE_BL: '{', PIPE_BR: '}',
    POLE: '|', POLETOP: 'T'
  };
  var SOLID = {
    'G': 1, 'B': 1, '?': 1, 'M': 1, '*': 1, 'u': 1, 'X': 1,
    '[': 1, ']': 1, '{': 1, '}': 1
  };

  var ROWS = 15;
  var FLOOR = 13; // linha de topo do chão (linhas 13 e 14 = chão sólido)

  function makeGrid(cols) {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(T.EMPTY);
      g.push(row);
    }
    return g;
  }

  // ---- API de construção ----
  function Builder(cols, opts) {
    this.cols = cols; this.rows = ROWS;
    this.grid = makeGrid(cols);
    this.spawns = [];
    this.decor = [];
    this.items = {};
    this.flagCol = cols - 12;
    this.castleCol = cols - 6;
    this.theme = (opts && opts.theme) || 'day';
    this.name = (opts && opts.name) || '1-1';
    this.time = (opts && opts.time) || 400;
    this.startX = 2 * 16;
    this.startY = (FLOOR - 1) * 16;
  }
  var B = Builder.prototype;
  B.set = function (c, r, t) { if (r >= 0 && r < ROWS && c >= 0 && c < this.cols) this.grid[r][c] = t; };
  B.floor = function (c0, c1) { for (var c = c0; c <= c1; c++) { this.set(c, FLOOR, T.GROUND); this.set(c, FLOOR + 1, T.GROUND); } };
  B.fillCol = function (c, r0, r1, t) { for (var r = r0; r <= r1; r++) this.set(c, r, t); };
  B.bricks = function (c0, c1, r) { for (var c = c0; c <= c1; c++) this.set(c, r, T.BRICK); };
  B.qcoin = function (c, r) { this.set(c, r, T.QCOIN); };
  B.qpow = function (c, r) { this.set(c, r, T.QPOW); };
  B.qstar = function (c, r) { this.set(c, r, T.QSTAR); };
  B.coinBrick = function (c, r) { this.set(c, r, T.BRICK); this.items[r * this.cols + c] = 'coin'; };
  B.coin = function (c, r) { this.spawns.push({ kind: 'coin', x: c * 16, y: r * 16 }); };
  B.coinRow = function (c0, c1, r) { for (var c = c0; c <= c1; c++) this.coin(c, r); };
  B.coinArc = function (c0, r, n) { for (var i = 0; i < n; i++) this.coin(c0 + i, r - Math.round(Math.sin((i / (n - 1)) * Math.PI) * 3)); };
  B.pipe = function (c, height) {
    var topRow = FLOOR - height;
    this.set(c, topRow, T.PIPE_TL); this.set(c + 1, topRow, T.PIPE_TR);
    for (var r = topRow + 1; r < FLOOR; r++) { this.set(c, r, T.PIPE_BL); this.set(c + 1, r, T.PIPE_BR); }
  };
  B.stairs = function (c0, size, dir) {
    // dir 1 = sobe para a direita, -1 = desce
    for (var i = 0; i < size; i++) {
      var h = i + 1;
      var c = dir > 0 ? c0 + i : c0 + (size - 1 - i);
      for (var r = FLOOR - h; r < FLOOR; r++) this.set(c, r, T.STONE);
    }
  };
  B.block = function (c0, c1, r0, r1, t) { for (var c = c0; c <= c1; c++) for (var r = r0; r <= r1; r++) this.set(c, r, t || T.STONE); };
  B.goomba = function (c, groundRow) { this.spawns.push({ kind: 'goomba', x: c * 16, y: (groundRow) * 16 - 14 }); };
  B.koopa = function (c, groundRow) { this.spawns.push({ kind: 'koopa', x: c * 16, y: (groundRow) * 16 - 22 }); };
  B.flag = function (c) {
    this.flagCol = c;
    this.set(c, 2, T.POLETOP);
    for (var r = 3; r < FLOOR; r++) this.set(c, r, T.POLE);
    this.set(c, FLOOR, T.STONE);
  };
  B.floorStone = function (c0, c1) { for (var c = c0; c <= c1; c++) { this.set(c, FLOOR, T.STONE); this.set(c, FLOOR + 1, T.STONE); } };
  B.wall = function (c) { for (var r = 0; r <= FLOOR + 1; r++) this.set(c, r, T.STONE); };
  B.bossArena = function () { this.hasBoss = true; this.flagCol = this.cols + 99; };
  B.boss = function (c, hp) { this.bossArena(); this.spawns.push({ kind: 'boss', x: c * 16, y: (FLOOR) * 16 - 26, hp: hp || 3 }); };
  B.princess = function (c) { this.hasPrincess = true; this.spawns.push({ kind: 'princess', x: c * 16, y: (FLOOR) * 16 - 22 }); };
  B.cloud = function (c, r) { this.decor.push({ kind: 'cloud', x: c * 16, y: r * 16 }); };
  B.hill = function (c, r) { this.decor.push({ kind: 'hill', x: c * 16, y: r * 16 }); };
  B.bush = function (c, r) { this.decor.push({ kind: 'bush', x: c * 16, y: r * 16 }); };
  B.finalize = function () {
    this.pixelWidth = this.cols * 16;
    this.pixelHeight = this.rows * 16;
    this.castleCol = this.flagCol + 6;
    return this;
  };

  function scatterDecor(b) {
    for (var i = 0; i < b.cols; i += 18) { b.cloud(i + 3, 2 + (i % 3)); b.cloud(i + 11, 3); }
    for (var h = 0; h < b.cols; h += 24) b.hill(h, FLOOR - 2);
    for (var s = 6; s < b.cols; s += 14) b.bush(s, FLOOR - 1);
  }

  /* ============== FASE 1-1 ============== */
  function level1() {
    var b = new Builder(214, { name: '1-1', time: 400, theme: 'day' });
    // chão com buracos
    b.floor(0, 68); b.floor(71, 86); b.floor(89, 152); b.floor(155, 213);
    scatterDecor(b);

    // Primeiros blocos
    b.qcoin(16, 9);
    b.bricks(20, 20, 9);
    b.qpow(21, 9);       // cogumelo / flor
    b.coinBrick(22, 9);
    b.qcoin(23, 9);
    b.bricks(24, 24, 9);
    b.qcoin(22, 5);      // bloco alto

    // Canos
    b.pipe(28, 2);
    b.pipe(38, 3);
    b.pipe(46, 4);
    b.pipe(57, 4);

    // Inimigos iniciais
    b.goomba(24, FLOOR); b.goomba(40, FLOOR); b.goomba(51, FLOOR); b.goomba(52, FLOOR);
    b.koopa(63, FLOOR);

    // Após o primeiro buraco
    b.coinArc(72, FLOOR - 2, 6);
    b.qstar(78, 9);      // estrela!
    b.goomba(78, FLOOR); b.goomba(80, FLOOR);

    // Bloco flutuante com moedas
    b.bricks(91, 92, 9);
    b.qcoin(93, 9);
    b.bricks(94, 95, 9);
    b.coinRow(91, 95, 5);
    b.goomba(100, FLOOR); b.goomba(101, FLOOR);
    b.koopa(110, FLOOR);

    // Plataforma elevada de tijolos
    b.bricks(118, 124, 9);
    b.qpow(121, 9);
    b.coinRow(118, 124, 7);
    b.goomba(120, 9); b.goomba(123, 9);

    // Canos finais (sem inimigo espremido entre eles)
    b.pipe(130, 2); b.pipe(138, 3);
    b.goomba(147, FLOOR); b.goomba(149, FLOOR);

    // Escadaria-pirâmide antes da bandeira (sobe e desce conectadas)
    b.stairs(170, 4, 1);
    b.stairs(174, 4, -1);
    b.bricks(188, 191, 9);
    b.coinRow(188, 191, 7);

    // Bandeira e castelo
    b.flag(200);

    return b.finalize();
  }

  /* ============== FASE 1-2 ============== */
  function level2() {
    var b = new Builder(220, { name: '1-2', time: 400, theme: 'day' });
    b.floor(0, 40); b.floor(44, 92); b.floor(96, 150); b.floor(154, 219);
    scatterDecor(b);

    // Cogumelo logo no início
    b.qpow(8, 9);
    b.bricks(12, 16, 9);
    b.coinRow(12, 16, 7);
    b.goomba(20, FLOOR); b.koopa(25, FLOOR);

    // Aproximação livre até o cano, depois um buraco
    b.pipe(33, 3);
    // Buraco - precisa pular (cols 41-43)
    b.qcoin(46, 9); b.qcoin(48, 9); b.qcoin(50, 9);
    b.koopa(52, FLOOR);
    b.goomba(56, FLOOR); b.goomba(57, FLOOR);

    // Plataformas escalonadas
    b.block(60, 62, 10, 10, T.STONE);
    b.block(66, 68, 8, 8, T.STONE);
    b.coinRow(66, 68, 6);
    b.block(72, 74, 6, 6, T.STONE);
    b.qstar(73, 4);
    b.koopa(80, FLOOR); b.goomba(84, FLOOR); b.goomba(85, FLOOR);

    // Sequência de tijolos com surpresa
    b.bricks(100, 100, 9);
    b.qpow(101, 9);
    b.bricks(102, 104, 9);
    b.coinBrick(103, 5);
    b.goomba(110, FLOOR); b.koopa(115, FLOOR); b.goomba(120, FLOOR);

    // Canos (sem inimigos espremidos entre eles)
    b.pipe(124, 3); b.pipe(132, 4); b.pipe(140, 2);

    // Plataforma flutuante longa com moedas
    b.bricks(158, 168, 8);
    b.coinRow(158, 168, 6);
    b.goomba(160, 8); b.goomba(165, 8);

    // Escada-pirâmide final (conectada)
    b.stairs(176, 4, 1);
    b.stairs(180, 4, -1);
    b.koopa(195, FLOOR);

    b.flag(206);
    return b.finalize();
  }

  /* ============== FASE 1-3 (mais difícil) ============== */
  function level3() {
    var b = new Builder(230, { name: '1-3', time: 350, theme: 'dusk' });
    b.floor(0, 24); b.floor(28, 40); b.floor(44, 60); b.floor(64, 110);
    b.floor(114, 160); b.floor(164, 229);
    scatterDecor(b);

    b.qpow(6, 9);
    b.koopa(14, FLOOR); b.goomba(18, FLOOR); b.goomba(19, FLOOR);

    // Plataformas isoladas (saltos precisos)
    b.block(30, 31, 10, 10, T.STONE);
    b.coin(30, 8); b.coin(31, 8);
    b.block(36, 38, 8, 8, T.STONE);
    b.qcoin(37, 6);

    b.koopa(50, FLOOR); b.goomba(54, FLOOR);
    b.qstar(56, 9);

    // Corredor com tijolos e inimigos
    b.bricks(66, 78, 9);
    b.coinRow(66, 78, 7);
    b.qpow(70, 9); b.coinBrick(74, 9);
    b.goomba(68, 9); b.goomba(72, 9); b.koopa(76, 9);
    b.goomba(85, FLOOR); b.goomba(86, FLOOR); b.koopa(95, FLOOR);

    // Canos altos seguidos (sem inimigo espremido entre eles)
    b.pipe(100, 4); b.pipe(106, 4);

    // Pirâmide com topo maciço (conectada, transponível)
    b.stairs(118, 4, 1);                 // sobe 118-121 até h4 (topo na row 9)
    b.block(122, 128, 9, 12, T.STONE);   // topo maciço no mesmo nível
    b.coinRow(122, 128, 7);
    b.goomba(124, 9); b.koopa(127, 9);   // sobre o topo
    b.stairs(129, 4, -1);                // desce 129-132

    b.goomba(142, FLOOR); b.goomba(143, FLOOR); b.koopa(150, FLOOR); b.goomba(156, FLOOR);

    // Trecho final exigente
    b.pipe(168, 3); b.pipe(176, 4);
    b.bricks(184, 190, 9);
    b.qpow(187, 9);
    b.coinRow(184, 190, 7);
    b.koopa(186, 9);
    b.stairs(199, 5, 1);

    b.flag(216);
    return b.finalize();
  }

  /* ============== FASE 1-4 (noite) ============== */
  function level4() {
    var b = new Builder(200, { name: '1-4', time: 380, theme: 'night' });
    b.floor(0, 52); b.floor(56, 104); b.floor(108, 150); b.floor(154, 199);
    scatterDecor(b);

    b.qpow(9, 9);
    b.bricks(14, 18, 9); b.coinRow(14, 18, 7); b.qcoin(16, 9);
    b.goomba(24, FLOOR); b.koopa(30, FLOOR); b.goomba(36, FLOOR);
    b.pipe(42, 3);
    // buraco 53-55
    b.coinArc(57, FLOOR - 2, 5);
    b.goomba(64, FLOOR); b.goomba(66, FLOOR);
    b.bricks(72, 76, 9); b.qpow(74, 9); b.coinRow(72, 76, 7);
    b.koopa(82, FLOOR); b.goomba(88, FLOOR);
    b.pipe(94, 4);
    // buraco 105-107
    b.qstar(112, 9);
    b.bricks(116, 120, 8); b.coinRow(116, 120, 6);
    b.goomba(124, FLOOR); b.koopa(130, FLOOR); b.goomba(134, FLOOR);
    b.pipe(140, 3);
    // buraco 151-153
    b.bricks(158, 164, 9); b.coinRow(158, 164, 7); b.qcoin(161, 9);
    b.koopa(170, FLOOR);
    b.stairs(178, 4, 1); b.stairs(182, 4, -1);
    b.flag(192);
    return b.finalize();
  }

  /* ============== FASE CASTELO 1 (chefe) ============== */
  function level5() {
    var b = new Builder(56, { name: 'CASTELO 1', time: 300, theme: 'castle' });
    b.floorStone(0, 55);
    b.wall(0); b.wall(55);
    // plataformas para desviar do fogo
    b.block(14, 17, 9, 9, T.STONE);
    b.block(30, 33, 7, 7, T.STONE);
    b.coinRow(14, 17, 7);
    b.qpow(8, 9);          // power-up de ajuda
    b.boss(40, 3);         // CHEFE: 3 de vida
    return b.finalize();
  }

  /* ============== FASE 2-1 ============== */
  function level6() {
    var b = new Builder(210, { name: '2-1', time: 400, theme: 'day' });
    b.floor(0, 60); b.floor(64, 120); b.floor(124, 170); b.floor(174, 209);
    scatterDecor(b);

    b.qpow(8, 9);
    b.goomba(16, FLOOR); b.goomba(17, FLOOR);
    b.pipe(24, 2); b.pipe(32, 3); b.pipe(40, 4);
    b.koopa(48, FLOOR); b.goomba(54, FLOOR);
    // buraco 61-63
    b.bricks(66, 72, 9); b.qpow(69, 9); b.coinRow(66, 72, 7);
    b.goomba(78, FLOOR); b.koopa(84, FLOOR); b.goomba(90, FLOOR); b.goomba(91, FLOOR);
    b.qstar(96, 9);
    b.bricks(100, 104, 8); b.coinRow(100, 104, 6);
    b.block(110, 113, 10, 10, T.STONE);
    // buraco 121-123
    b.coinArc(125, FLOOR - 2, 6);
    b.koopa(132, FLOOR); b.goomba(138, FLOOR);
    b.pipe(144, 3); b.pipe(152, 4);
    b.goomba(162, FLOOR);
    // buraco 171-173
    b.bricks(178, 184, 9); b.coinRow(178, 184, 7);
    b.stairs(190, 5, 1); b.stairs(195, 5, -1);
    b.flag(204);
    return b.finalize();
  }

  /* ============== FASE 2-2 (caverna) ============== */
  function level7() {
    var b = new Builder(200, { name: '2-2', time: 360, theme: 'cave' });
    b.floor(0, 30); b.floor(34, 70); b.floor(74, 130); b.floor(134, 170); b.floor(174, 199);

    b.qpow(6, 9);
    b.koopa(12, FLOOR); b.goomba(16, FLOOR);
    b.bricks(20, 24, 9); b.coinRow(20, 24, 7); b.qcoin(22, 9);
    // buraco 31-33
    b.goomba(38, FLOOR); b.goomba(40, FLOOR);
    b.block(46, 48, 10, 10, T.STONE); b.coin(46, 8); b.coin(48, 8);
    b.block(54, 56, 8, 8, T.STONE); b.qcoin(55, 6);
    b.koopa(62, FLOOR);
    // buraco 71-73
    b.bricks(78, 86, 9); b.qpow(80, 9); b.coinBrick(84, 9); b.coinRow(78, 86, 7);
    b.goomba(78, 9); b.koopa(84, 9);
    b.goomba(92, FLOOR); b.goomba(93, FLOOR); b.koopa(100, FLOOR);
    b.pipe(106, 3); b.pipe(114, 4);
    b.qstar(122, 9);
    // buraco 131-133
    b.bricks(138, 144, 8); b.coinRow(138, 144, 6);
    b.koopa(150, FLOOR); b.goomba(156, FLOOR);
    // buraco 171-173
    b.stairs(178, 4, 1); b.stairs(182, 4, -1);
    b.flag(192);
    return b.finalize();
  }

  /* ============== FASE 2-3 (entardecer) ============== */
  function level8() {
    var b = new Builder(215, { name: '2-3', time: 360, theme: 'dusk' });
    b.floor(0, 40); b.floor(44, 58); b.floor(62, 110); b.floor(114, 160); b.floor(164, 214);
    scatterDecor(b);

    b.qpow(8, 9);
    b.goomba(16, FLOOR); b.koopa(22, FLOOR); b.goomba(28, FLOOR);
    b.pipe(34, 4);
    // buraco 41-43
    b.coinArc(45, FLOOR - 2, 5);
    b.koopa(50, FLOOR); b.goomba(54, FLOOR);
    b.qstar(56, 9);
    // buraco 59-61
    b.bricks(66, 72, 9); b.qpow(69, 9); b.coinRow(66, 72, 7);
    b.goomba(78, FLOOR); b.goomba(79, FLOOR); b.koopa(86, FLOOR); b.goomba(92, FLOOR);
    b.pipe(98, 3); b.pipe(106, 2);
    // buraco 111-113
    b.bricks(118, 124, 8); b.coinRow(118, 124, 6);
    b.koopa(130, FLOOR); b.goomba(136, FLOOR); b.goomba(137, FLOOR);
    b.block(142, 145, 10, 10, T.STONE);
    b.pipe(150, 4);
    // buraco 161-163
    b.coinArc(165, FLOOR - 2, 6);
    b.koopa(172, FLOOR); b.goomba(178, FLOOR);
    b.bricks(184, 190, 9); b.coinRow(184, 190, 7);
    b.stairs(196, 5, 1); b.stairs(201, 5, -1);
    b.flag(210);
    return b.finalize();
  }

  /* ============== FASE 2-4 (noite, difícil) ============== */
  function level9() {
    var b = new Builder(220, { name: '2-4', time: 340, theme: 'night' });
    b.floor(0, 26); b.floor(30, 42); b.floor(46, 62); b.floor(66, 112); b.floor(116, 158); b.floor(162, 219);
    scatterDecor(b);

    b.qpow(6, 9);
    b.koopa(12, FLOOR); b.goomba(16, FLOOR); b.goomba(17, FLOOR);
    // ilha 30-42
    b.block(32, 34, 10, 10, T.STONE); b.coinRow(32, 34, 8);
    b.goomba(38, FLOOR);
    // ilha 46-62
    b.qstar(50, 9);
    b.koopa(54, FLOOR); b.goomba(58, FLOOR);
    // buraco 63-65
    b.bricks(70, 80, 9); b.qpow(72, 9); b.coinBrick(76, 9); b.coinRow(70, 80, 7);
    b.goomba(70, 9); b.koopa(76, 9); b.goomba(80, 9);
    b.goomba(88, FLOOR); b.goomba(89, FLOOR); b.koopa(98, FLOOR);
    b.pipe(104, 4);
    // buraco 113-115
    b.bricks(120, 126, 8); b.coinRow(120, 126, 6);
    b.koopa(132, FLOOR); b.goomba(138, FLOOR); b.goomba(139, FLOOR);
    b.pipe(144, 3); b.pipe(152, 4);
    // buraco 159-161
    b.coinArc(163, FLOOR - 2, 6);
    b.koopa(170, FLOOR); b.goomba(176, FLOOR); b.goomba(177, FLOOR);
    b.bricks(184, 190, 9); b.qpow(187, 9); b.coinRow(184, 190, 7);
    b.stairs(198, 5, 1); b.stairs(203, 5, -1);
    b.flag(212);
    return b.finalize();
  }

  /* ============== FASE CASTELO FINAL (chefe + princesa) ============== */
  function level10() {
    var b = new Builder(64, { name: 'CASTELO FINAL', time: 350, theme: 'castle' });
    b.floorStone(0, 63);
    b.wall(0); b.wall(63);
    b.block(12, 15, 9, 9, T.STONE);
    b.block(24, 27, 7, 7, T.STONE);
    b.block(40, 43, 9, 9, T.STONE);
    b.coinRow(24, 27, 5);
    b.qpow(7, 9); b.qpow(9, 9);   // ajuda (cogumelo/flor)
    b.boss(46, 5);                // CHEFE FINAL: 5 de vida
    b.princess(58);               // resgate ao derrotar o chefe
    return b.finalize();
  }

  var BUILDERS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

  window.Levels = {
    T: T, SOLID: SOLID, ROWS: ROWS, FLOOR: FLOOR,
    count: BUILDERS.length,
    load: function (i) { return BUILDERS[((i % BUILDERS.length) + BUILDERS.length) % BUILDERS.length](); }
  };
})();
