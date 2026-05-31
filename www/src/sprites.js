/* sprites.js - Pixel art procedural desenhada em canvas (sem assets externos) */
(function () {
  'use strict';

  var TILE = 16; // resolução nativa de um tile

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function ctxOf(c) {
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return x;
  }
  // Desenha "pixel" (retângulo) no grid nativo
  function p(x, rx, ry, rw, rh, color) {
    x.fillStyle = color;
    x.fillRect(rx, ry, rw, rh);
  }

  /* ---------- Paletas ---------- */
  var COL = {
    red: '#e23636', redD: '#9c1f1f',
    skin: '#ffc28a', skinD: '#d98a52',
    brown: '#7a4a22', brownD: '#522f12',
    blue: '#3556c8', blueD: '#22357f',
    yellow: '#ffd23f', dark: '#201509', white: '#ffffff',
    green: '#3fa34d', greenD: '#1f7a35', greenL: '#7bd35a',
    grass: '#46c24a', grassL: '#7be07b',
    dirt: '#c2691c', dirtD: '#8a3f0d',
    brick: '#c8500f', brickD: '#7a2e06',
    qb: '#f6a821', qbD: '#a85e08', qbL: '#ffd56b'
  };

  /* ---------- Herói (Mario-like) composto por retângulos ---------- */
  // opt: {tall, frame, shirt, overalls, hat, skin}
  // opt: {tall, frame, fire} - aventureiro encapuzado com cachecol
  function drawHero(x, opt) {
    var f = opt.frame || 'idle';
    var tall = !!opt.tall;
    var fire = !!opt.fire;
    var O = '#171022';                                  // contorno/sombra forte
    var G = fire ? '#f2f2f7' : '#2fa84f';               // capuz/túnica
    var GD = fire ? '#b7c0cb' : '#1b7a37';
    var GL = fire ? '#ffffff' : '#62d27e';
    var SC = fire ? '#e23636' : '#ff7a2f';              // cachecol
    var SCD = fire ? '#9c1f1f' : '#d9531a';
    var SK = '#ffce9e', SKD = '#d98a52';
    var BO = '#5a3a20', BOD = '#3a2412';                // botas / cinto
    var PA = '#34364c';                                 // calça
    var YE = '#ffd23f', W = '#ffffff';

    // ---------- Cabeça (capuz) ----------
    p(x, 4, 0, 8, 1, O);
    p(x, 3, 1, 10, 6, G);
    p(x, 3, 5, 10, 2, GD);          // sombra inferior
    p(x, 11, 1, 2, 5, GD);          // sombra lateral
    p(x, 4, 1, 3, 1, GL);           // brilho topo
    p(x, 4, 2, 1, 3, GL);           // brilho lateral
    p(x, 3, 0, 1, 1, O); p(x, 12, 0, 1, 1, O);
    // rosto
    p(x, 5, 3, 6, 4, SK);
    p(x, 5, 6, 6, 1, SKD);          // queixo
    p(x, 4, 3, 1, 3, GD); p(x, 11, 3, 1, 3, GD); // moldura do capuz
    // olhos
    p(x, 6, 4, 2, 2, W); p(x, 9, 4, 2, 2, W);
    p(x, 7, 4, 1, 2, O); p(x, 10, 4, 1, 2, O);

    // ---------- Cachecol ----------
    p(x, 3, 7, 9, 2, SC);
    p(x, 3, 8, 9, 1, SCD);
    var flut = (f === 'walk2') ? 1 : (f === 'jump' ? -1 : 0);
    p(x, 1, 7, 3, 1, SC);
    p(x, 0, 8 + flut, 2, 1, SCD);   // ponta esvoaçante

    if (tall) {
      // ---------- Corpo grande (16x28) ----------
      p(x, 3, 9, 10, 9, G);
      p(x, 3, 14, 10, 4, GD);
      p(x, 4, 9, 1, 5, GL);
      p(x, 3, 17, 10, 2, BO);       // cinto
      p(x, 7, 17, 2, 2, YE);        // fivela
      if (f === 'jump') {
        p(x, 2, 8, 2, 4, G); p(x, 12, 8, 2, 4, G);
        p(x, 2, 7, 2, 1, SK); p(x, 12, 7, 2, 1, SK);
      } else {
        p(x, 2, 10, 2, 5, G); p(x, 12, 10, 2, 5, G);
        p(x, 2, 15, 2, 2, SK); p(x, 12, 15, 2, 2, SK);
      }
      if (f === 'crouch') {
        p(x, 3, 19, 10, 3, PA);
        p(x, 3, 22, 5, 2, BO); p(x, 8, 22, 5, 2, BO);
        return;
      }
      p(x, 4, 19, 3, 3, PA); p(x, 9, 19, 3, 3, PA);
      if (f === 'walk1') { p(x, 3, 22, 4, 2, BO); p(x, 10, 21, 4, 2, BO); }
      else if (f === 'walk2') { p(x, 3, 21, 4, 2, BO); p(x, 10, 22, 4, 2, BO); }
      else { p(x, 4, 22, 4, 2, BO); p(x, 9, 22, 4, 2, BO); }
      p(x, 4, 23, 3, 1, BOD); p(x, 9, 23, 3, 1, BOD);
    } else {
      // ---------- Corpo pequeno (16x16) ----------
      p(x, 4, 9, 8, 3, G);
      p(x, 4, 11, 8, 1, GD);
      p(x, 4, 9, 1, 2, GL);
      p(x, 4, 12, 8, 1, BO);        // cinto
      p(x, 7, 12, 2, 1, YE);
      if (f === 'jump') {
        p(x, 3, 8, 1, 2, G); p(x, 12, 8, 1, 2, G);
        p(x, 3, 8, 1, 1, SK); p(x, 12, 8, 1, 1, SK);
      } else {
        p(x, 3, 9, 1, 3, G); p(x, 12, 9, 1, 3, G);
        p(x, 3, 11, 1, 1, SK); p(x, 12, 11, 1, 1, SK);
      }
      if (f === 'walk1') { p(x, 4, 13, 4, 2, BO); p(x, 9, 13, 3, 2, BO); }
      else if (f === 'walk2') { p(x, 4, 13, 3, 2, BO); p(x, 9, 13, 4, 2, BO); }
      else { p(x, 4, 13, 3, 2, BO); p(x, 9, 13, 3, 2, BO); }
      p(x, 4, 14, 8, 1, BOD);       // solas
    }
  }

  function heroSprite(opt) {
    var h = opt.tall ? 28 : 16;
    var c = cv(16, h);
    drawHero(ctxOf(c), opt);
    return c;
  }

  /* ---------- Goomba ---------- */
  function goomba(frame) {
    var c = cv(16, 16), x = ctxOf(c);
    var br = COL.brown, brd = COL.brownD;
    // Domo com sombreamento
    p(x, 5, 1, 6, 1, '#a8702f');
    p(x, 3, 2, 10, 2, '#9a6630');
    p(x, 2, 4, 12, 4, br);
    p(x, 1, 6, 14, 4, br);
    p(x, 2, 9, 12, 1, brd);
    p(x, 4, 2, 3, 1, '#bb834a');     // brilho
    // Focinho claro
    p(x, 3, 10, 10, 2, '#f0d2a0');
    // Olhos com brilho
    p(x, 3, 5, 4, 4, COL.white);
    p(x, 9, 5, 4, 4, COL.white);
    p(x, 5, 6, 2, 3, COL.dark);
    p(x, 9, 6, 2, 3, COL.dark);
    p(x, 5, 6, 1, 1, COL.white);
    p(x, 9, 6, 1, 1, COL.white);
    // Sobrancelhas bravas
    p(x, 3, 4, 4, 1, COL.dark);
    p(x, 9, 4, 4, 1, COL.dark);
    // Pés
    if (frame === 1) { p(x, 1, 12, 5, 3, brd); p(x, 11, 12, 4, 3, brd); }
    else { p(x, 2, 12, 4, 3, brd); p(x, 10, 12, 5, 3, brd); }
    p(x, 1, 14, 14, 1, '#3a2410');   // sola
    return c;
  }
  function goombaFlat() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 1, 11, 14, 4, COL.brown);
    p(x, 2, 10, 12, 1, COL.brownD);
    p(x, 4, 12, 3, 2, COL.dark);
    p(x, 9, 12, 3, 2, COL.dark);
    return c;
  }

  /* ---------- Koopa (tartaruga) ---------- */
  function koopa(frame) {
    var c = cv(16, 18), x = ctxOf(c);
    var G = COL.green, GD = COL.greenD, GL = COL.greenL, Y = COL.yellow, D = COL.dark, W = COL.white, sk = '#ffd86b', skd = '#e0b53f';
    // Cabeça
    p(x, 10, 1, 4, 4, sk);
    p(x, 11, 2, 4, 4, skd);
    p(x, 10, 1, 3, 1, '#fff0b8');     // brilho
    p(x, 12, 2, 2, 2, W);             // olho (branco)
    p(x, 13, 2, 1, 2, D);             // pupila
    // Pescoço
    p(x, 9, 5, 4, 3, sk);
    // Casco
    p(x, 2, 5, 11, 8, G);
    p(x, 3, 4, 9, 2, GD);
    p(x, 3, 6, 9, 1, GL);             // brilho do casco
    p(x, 4, 7, 6, 4, Y);              // barriga
    p(x, 4, 7, 6, 1, '#fff0a0');
    p(x, 5, 5, 1, 1, GD); p(x, 8, 5, 1, 1, GD); // escamas
    p(x, 2, 12, 11, 1, GD);           // sombra base
    // Pés
    if (frame === 1) { p(x, 2, 13, 4, 3, sk); p(x, 9, 14, 4, 2, sk); }
    else { p(x, 2, 14, 4, 2, sk); p(x, 9, 13, 4, 3, sk); }
    p(x, 2, 15, 4, 1, skd); p(x, 9, 15, 4, 1, skd);
    return c;
  }
  function koopaShell() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 2, 5, 12, 9, COL.green);
    p(x, 3, 4, 10, 2, COL.greenD);
    p(x, 4, 7, 8, 5, COL.yellow);
    p(x, 3, 6, 10, 1, COL.greenL);
    p(x, 2, 13, 12, 1, COL.greenD);
    return c;
  }

  /* ---------- Moeda (animação de giro) ---------- */
  function coin(w) {
    var c = cv(16, 16), x = ctxOf(c);
    var cx = 8;
    p(x, cx - w, 1, w * 2, 14, COL.yellow);
    p(x, cx - w, 0, w * 2, 1, COL.qbD);
    p(x, cx - w, 15, w * 2, 1, COL.qbD);
    if (w >= 2) {
      p(x, cx - 1, 4, 2, 8, '#fff1a8'); // brilho central
      p(x, cx - (w), 3, 1, 10, COL.qbL);
    }
    return c;
  }

  /* ---------- Power-ups ---------- */
  function mushroom() {
    var c = cv(16, 16), x = ctxOf(c);
    // Cabeça vermelha
    p(x, 3, 2, 10, 6, COL.red);
    p(x, 2, 4, 12, 4, COL.red);
    p(x, 4, 1, 8, 1, COL.redD);
    // Pintas brancas
    p(x, 4, 3, 3, 3, COL.white);
    p(x, 9, 3, 3, 3, COL.white);
    p(x, 7, 5, 2, 2, COL.white);
    // Caule
    p(x, 4, 8, 8, 6, '#ffe9c8');
    // Olhos
    p(x, 5, 10, 2, 3, COL.dark);
    p(x, 9, 10, 2, 3, COL.dark);
    return c;
  }
  function fireFlower() {
    var c = cv(16, 16), x = ctxOf(c);
    // Pétalas
    p(x, 5, 1, 6, 2, '#ff7b29');
    p(x, 3, 2, 10, 4, '#ffa53f');
    p(x, 5, 3, 6, 2, '#ffe14a');
    p(x, 6, 3, 4, 2, COL.white);
    p(x, 7, 4, 2, 1, COL.dark);
    // Caule e folhas
    p(x, 7, 6, 2, 8, COL.green);
    p(x, 3, 9, 4, 2, COL.greenL);
    p(x, 9, 11, 4, 2, COL.greenL);
    return c;
  }
  function star() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 7, 1, 2, 14, COL.yellow);
    p(x, 2, 6, 12, 3, COL.yellow);
    p(x, 4, 4, 8, 8, COL.yellow);
    p(x, 3, 11, 3, 3, COL.yellow);
    p(x, 10, 11, 3, 3, COL.yellow);
    p(x, 5, 6, 2, 2, COL.dark);
    p(x, 9, 6, 2, 2, COL.dark);
    p(x, 5, 9, 6, 1, COL.qbD);
    return c;
  }

  /* ---------- Blocos (tiles 16x16) ---------- */
  function ground() {
    var c = cv(16, 16), x = ctxOf(c);
    // terra com gradiente
    p(x, 0, 0, 16, 16, COL.dirt);
    p(x, 0, 10, 16, 6, COL.dirtD);          // base escura
    p(x, 2, 8, 2, 2, '#d98a4a');            // pedrinhas claras
    p(x, 10, 9, 2, 2, '#d98a4a');
    p(x, 6, 12, 2, 2, COL.dirtD);
    p(x, 12, 6, 1, 2, COL.dirtD);
    // grama no topo
    p(x, 0, 0, 16, 4, COL.grass);
    p(x, 0, 0, 16, 1, COL.grassL);
    // lâminas de grama
    p(x, 1, 4, 1, 2, COL.grass); p(x, 4, 4, 1, 3, COL.grass);
    p(x, 7, 4, 1, 2, COL.grass); p(x, 10, 4, 1, 3, COL.grass);
    p(x, 13, 4, 1, 2, COL.grass);
    p(x, 3, 1, 2, 1, COL.grassL); p(x, 9, 1, 2, 1, COL.grassL);
    p(x, 0, 15, 16, 1, COL.dirtD);
    return c;
  }
  function brick() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, COL.brick);
    p(x, 0, 0, 16, 1, '#e8742a');
    // argamassa
    p(x, 0, 7, 16, 1, COL.brickD);
    p(x, 0, 15, 16, 1, COL.brickD);
    p(x, 7, 0, 1, 7, COL.brickD);
    p(x, 3, 8, 1, 7, COL.brickD);
    p(x, 11, 8, 1, 7, COL.brickD);
    return c;
  }
  function qblock(bright) {
    var c = cv(16, 16), x = ctxOf(c);
    var base = bright ? COL.qbL : COL.qb;
    p(x, 0, 0, 16, 16, COL.qbD);
    p(x, 1, 1, 14, 14, base);
    p(x, 1, 1, 14, 2, COL.qbL);
    // rebites
    p(x, 1, 1, 2, 2, COL.dark); p(x, 13, 1, 2, 2, COL.dark);
    p(x, 1, 13, 2, 2, COL.dark); p(x, 13, 13, 2, 2, COL.dark);
    // ponto de interrogação
    p(x, 6, 4, 4, 1, COL.dark);
    p(x, 9, 4, 1, 3, COL.dark);
    p(x, 7, 6, 3, 1, COL.dark);
    p(x, 7, 7, 1, 2, COL.dark);
    p(x, 7, 10, 1, 2, COL.dark); // ponto
    return c;
  }
  function usedBlock() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, COL.brownD);
    p(x, 1, 1, 14, 14, '#a86a2e');
    p(x, 1, 1, 14, 2, '#c98b46');
    p(x, 1, 1, 2, 2, COL.dark); p(x, 13, 1, 2, 2, COL.dark);
    p(x, 1, 13, 2, 2, COL.dark); p(x, 13, 13, 2, 2, COL.dark);
    return c;
  }
  function stone() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, '#8a8a8a');
    p(x, 0, 0, 16, 2, '#b5b5b5');
    p(x, 0, 14, 16, 2, '#666');
    p(x, 4, 5, 3, 2, '#6f6f6f');
    p(x, 9, 9, 3, 2, '#6f6f6f');
    return c;
  }

  /* ---------- Cano (top 32x16, corpo 32x16) ---------- */
  function pipeTop() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 0, 0, 32, 16, COL.green);
    p(x, 0, 0, 32, 4, COL.greenL);
    p(x, 0, 4, 32, 1, COL.greenD);
    p(x, 0, 0, 4, 16, COL.greenL);
    p(x, 28, 0, 4, 16, COL.greenD);
    p(x, 0, 15, 32, 1, COL.greenD);
    return c;
  }
  function pipeBody() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 2, 0, 28, 16, COL.green);
    p(x, 2, 0, 4, 16, COL.greenL);
    p(x, 26, 0, 4, 16, COL.greenD);
    return c;
  }

  /* ---------- Bandeira / mastro ---------- */
  function flagPole() {
    var c = cv(8, 16), x = ctxOf(c);
    p(x, 3, 0, 2, 16, '#cfcfcf');
    p(x, 3, 0, 1, 16, '#ffffff');
    return c;
  }
  function flagTop() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 3, 0, 2, 16, '#cfcfcf');
    p(x, 1, 0, 6, 2, '#2bb32b');
    // bandeira triangular
    p(x, 5, 2, 9, 2, COL.green);
    p(x, 5, 4, 7, 2, COL.green);
    p(x, 5, 6, 5, 2, COL.green);
    p(x, 5, 8, 3, 2, COL.green);
    return c;
  }

  /* ---------- Decoração de fundo ---------- */
  function cloud() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 6, 6, 20, 8, COL.white);
    p(x, 10, 3, 12, 6, COL.white);
    p(x, 4, 9, 24, 5, COL.white);
    p(x, 6, 13, 20, 2, '#cfe0ff');
    return c;
  }
  function bush() {
    var c = cv(48, 16), x = ctxOf(c);
    p(x, 4, 8, 40, 8, COL.green);
    p(x, 8, 5, 12, 6, COL.greenL);
    p(x, 20, 3, 12, 8, COL.greenL);
    p(x, 30, 6, 12, 5, COL.green);
    p(x, 4, 14, 40, 2, COL.greenD);
    return c;
  }
  function hill() {
    var c = cv(64, 32), x = ctxOf(c);
    for (var i = 0; i < 32; i++) {
      var w = Math.round((i / 32) * 60);
      p(x, 32 - w, 32 - i, w * 2, 1, COL.greenD);
    }
    p(x, 14, 22, 4, 3, COL.green);
    p(x, 44, 20, 4, 3, COL.green);
    p(x, 28, 14, 4, 3, COL.green);
    return c;
  }
  function castle() {
    var c = cv(80, 80), x = ctxOf(c);
    var br = '#c0c0c0', brd = '#8a8a8a', dk = '#3a3a3a';
    p(x, 0, 30, 80, 50, br);
    // torres
    p(x, 0, 18, 16, 62, br); p(x, 64, 18, 16, 62, br);
    p(x, 32, 8, 16, 72, br);
    // ameias
    for (var i = 0; i < 80; i += 8) p(x, i, 14, 4, 4, br);
    // porta
    p(x, 32, 52, 16, 28, dk);
    p(x, 36, 56, 8, 20, '#111');
    // janelas
    p(x, 6, 40, 4, 6, dk); p(x, 70, 40, 4, 6, dk);
    p(x, 36, 24, 8, 8, dk);
    // sombras
    p(x, 0, 76, 80, 4, brd);
    return c;
  }

  /* ---------- Chefe (rei tartaruga) 30x28 ---------- */
  function boss(frame) {
    var c = cv(30, 28), x = ctxOf(c);
    var G = COL.green, GD = COL.greenD, GL = COL.greenL, bone = '#fff1c0', belly = '#f4d08a', D = COL.dark, RE = '#e23636';
    // Casco / corpo
    p(x, 3, 9, 18, 15, G);
    p(x, 5, 7, 14, 3, GD);
    p(x, 4, 11, 16, 2, GL);
    // Espinhos do casco (osso)
    p(x, 5, 4, 3, 4, bone); p(x, 11, 3, 3, 5, bone); p(x, 16, 4, 3, 4, bone);
    p(x, 6, 2, 1, 2, bone); p(x, 12, 1, 1, 2, bone); p(x, 17, 2, 1, 2, bone);
    // Barriga
    p(x, 9, 15, 12, 9, belly);
    p(x, 10, 17, 10, 1, bone); p(x, 10, 20, 10, 1, bone);
    // Cabeça
    p(x, 20, 5, 9, 9, G);
    p(x, 21, 4, 7, 2, GD);
    // Chifres
    p(x, 20, 2, 2, 3, bone); p(x, 26, 2, 2, 3, bone);
    // Olho bravo
    p(x, 21, 6, 4, 1, D);          // sobrancelha
    p(x, 22, 7, 3, 3, COL.white);
    p(x, 23, 8, 2, 2, RE);
    // Focinho
    p(x, 27, 9, 3, 4, belly);
    p(x, 28, 10, 1, 1, D);
    // Boca / dentes
    p(x, 23, 12, 6, 1, D);
    p(x, 24, 12, 1, 1, COL.white); p(x, 27, 12, 1, 1, COL.white);
    // Braço e garra
    p(x, 19, 16, 4, 5, G);
    p(x, 18, 19, 2, 2, bone);
    // Pernas (anima)
    if (frame === 1) {
      p(x, 6, 23, 5, 4, GD); p(x, 14, 24, 5, 3, GD);
    } else {
      p(x, 6, 24, 5, 3, GD); p(x, 14, 23, 5, 4, GD);
    }
    p(x, 6, 26, 5, 1, bone); p(x, 14, 26, 5, 1, bone);
    return c;
  }

  /* ---------- Princesa 14x24 ---------- */
  function princess() {
    var c = cv(14, 24), x = ctxOf(c);
    var pink = '#ff8fcf', pinkD = '#d24e98', pinkL = '#ffc6e8',
        hair = '#ffe07a', hairD = '#e0b53f', hairL = '#fff4bf',
        sk = '#ffdcb6', skd = '#e7a87c', Y = '#ffd23f', W = '#ffffff',
        D = '#3a2630', rose = '#ff9bbf';
    // Coroa
    p(x, 3, 0, 2, 2, Y); p(x, 6, 0, 2, 2, Y); p(x, 9, 0, 2, 2, Y);
    p(x, 3, 2, 8, 1, Y);
    p(x, 3, 2, 4, 1, '#fff0a8');           // brilho
    p(x, 6, 1, 2, 1, '#ff4d6d');           // joia
    // Cabelo (moldura + mechas longas)
    p(x, 3, 3, 8, 3, hair);
    p(x, 4, 3, 3, 1, hairL);
    p(x, 2, 5, 2, 12, hair); p(x, 10, 5, 2, 12, hair);
    p(x, 2, 5, 1, 12, hairD); p(x, 11, 5, 1, 12, hairD);
    p(x, 2, 16, 2, 2, hairD); p(x, 10, 16, 2, 2, hairD);
    // Rosto
    p(x, 4, 5, 6, 4, sk);
    p(x, 5, 8, 4, 1, skd);
    p(x, 4, 6, 1, 1, rose); p(x, 9, 6, 1, 1, rose);   // bochechas
    p(x, 5, 5, 1, 1, D); p(x, 8, 5, 1, 1, D);         // cílios
    p(x, 5, 6, 1, 2, D); p(x, 8, 6, 1, 2, D);         // olhos
    p(x, 6, 8, 2, 1, '#d2548a');                      // sorriso
    // Pescoço + colar
    p(x, 6, 9, 2, 1, sk);
    p(x, 6, 10, 2, 1, '#7fd3ff');
    // Corpete
    p(x, 4, 10, 6, 3, pink);
    p(x, 4, 10, 1, 3, pinkL); p(x, 9, 10, 1, 3, pinkD);
    p(x, 3, 13, 8, 1, W);                              // cintura
    // Mangas / braços
    p(x, 2, 11, 2, 3, pink); p(x, 10, 11, 2, 3, pink);
    p(x, 2, 14, 2, 1, sk); p(x, 10, 14, 2, 1, sk);
    // Saia
    p(x, 3, 14, 8, 3, pink);
    p(x, 2, 17, 10, 3, pink);
    p(x, 3, 14, 1, 6, pinkL); p(x, 10, 17, 1, 3, pinkD);
    p(x, 5, 15, 1, 5, pinkD); p(x, 8, 15, 1, 5, pinkD); // dobras
    p(x, 2, 20, 10, 1, pinkD);                          // barra
    // Sapatos
    p(x, 4, 21, 2, 2, W); p(x, 8, 21, 2, 2, W);
    return c;
  }

  /* ---------- Mulher loira (vira bruxa) 14x24 ---------- */
  function woman() {
    var c = cv(14, 24), x = ctxOf(c);
    var h = '#ffe07a', hd = '#e0b53f', hl = '#fff4bf', sk = '#ffdcb6', skd = '#e7a87c',
        dr = '#e23b5a', drd = '#a82038', drl = '#ff7088', D = '#3a2630', lip = '#d12a52', rose = '#ff9bbf', W = '#ffffff';
    // cabelo longo
    p(x, 3, 1, 8, 4, h); p(x, 4, 1, 3, 1, hl);
    p(x, 2, 4, 2, 15, h); p(x, 10, 4, 2, 15, h);
    p(x, 2, 4, 1, 15, hd); p(x, 11, 4, 1, 15, hd);
    p(x, 2, 18, 2, 2, hd); p(x, 10, 18, 2, 2, hd);
    p(x, 3, 2, 2, 2, dr); p(x, 3, 2, 1, 1, drl);   // flor no cabelo
    // rosto
    p(x, 4, 5, 6, 4, sk); p(x, 5, 9, 4, 1, skd);
    p(x, 4, 6, 1, 1, rose); p(x, 9, 6, 1, 1, rose);
    p(x, 5, 5, 1, 1, D); p(x, 8, 5, 1, 1, D);
    p(x, 5, 6, 1, 2, D); p(x, 8, 6, 1, 2, D);
    p(x, 6, 8, 2, 1, lip);
    // vestido elegante
    p(x, 6, 9, 2, 1, sk);
    p(x, 4, 10, 6, 3, dr); p(x, 4, 10, 1, 3, drl); p(x, 9, 10, 1, 3, drd);
    p(x, 3, 13, 8, 1, W);
    p(x, 2, 11, 2, 3, dr); p(x, 10, 11, 2, 3, dr);
    p(x, 2, 14, 2, 1, sk); p(x, 10, 14, 2, 1, sk);
    p(x, 3, 14, 8, 3, dr); p(x, 2, 17, 10, 3, dr);
    p(x, 3, 14, 1, 6, drl); p(x, 10, 17, 1, 3, drd);
    p(x, 5, 15, 1, 5, drd); p(x, 8, 15, 1, 5, drd);
    p(x, 2, 20, 10, 1, drd);
    p(x, 4, 21, 2, 2, D); p(x, 8, 21, 2, 2, D);
    return c;
  }

  /* ---------- Bruxa na vassoura 20x18 ---------- */
  function witch() {
    var c = cv(20, 18), x = ctxOf(c);
    var blk = '#1a1426', blk2 = '#0e0a18', pur = '#6a3fae', purL = '#9b6fe0',
        gr = '#6fae3a', grd = '#4a7a26', straw = '#d8a84a', strawD = '#a87a2a', brown = '#6a4422', Y = '#ffd23f', D = '#0e0a18', W = '#ffffff';
    // vassoura
    p(x, 0, 12, 4, 5, straw); p(x, 0, 12, 4, 1, strawD); p(x, 1, 13, 1, 4, strawD); p(x, 2, 13, 1, 4, strawD);
    p(x, 3, 14, 15, 2, brown); p(x, 3, 14, 15, 1, '#8a5a2e');
    // corpo / capa
    p(x, 7, 8, 9, 6, blk); p(x, 7, 12, 9, 2, blk2); p(x, 8, 7, 7, 2, blk);
    p(x, 6, 10, 2, 3, blk);
    p(x, 14, 10, 2, 2, gr);
    // rosto verde
    p(x, 9, 4, 6, 4, gr); p(x, 9, 7, 6, 1, grd);
    p(x, 15, 5, 3, 2, gr); p(x, 16, 5, 2, 2, grd);  // nariz pontudo
    p(x, 16, 4, 2, 1, gr);
    p(x, 11, 5, 2, 2, Y); p(x, 12, 5, 1, 1, D);      // olho
    p(x, 10, 4, 3, 1, D);                            // sobrancelha
    p(x, 11, 7, 3, 1, D); p(x, 12, 7, 1, 1, W);      // boca/dente
    // chapéu
    p(x, 7, 3, 9, 1, blk);
    p(x, 8, 3, 7, 1, pur);
    p(x, 9, 1, 5, 2, blk);
    p(x, 10, 0, 3, 1, blk);
    p(x, 11, 3, 2, 1, Y);                            // fivela
    p(x, 9, 1, 1, 1, purL);
    return c;
  }

  /* ---------- Inicialização: pré-renderiza tudo ---------- */
  var Sprites = {
    TILE: TILE,
    img: {},
    heroSmall: {}, heroBig: {}, heroFire: {},
    init: function () {
      var frames = ['idle', 'walk1', 'walk2', 'jump'];
      var self = this;
      frames.concat(['crouch']).forEach(function (f) {
        self.heroSmall[f] = heroSprite({ tall: false, frame: f });
        self.heroBig[f] = heroSprite({ tall: true, frame: f });
        self.heroFire[f] = heroSprite({ tall: true, frame: f, fire: true });
      });

      this.img.goomba = [goomba(0), goomba(1)];
      this.img.goombaFlat = goombaFlat();
      this.img.koopa = [koopa(0), koopa(1)];
      this.img.koopaShell = koopaShell();
      this.img.boss = [boss(0), boss(1)];
      this.img.princess = princess();
      this.img.woman = woman();
      this.img.witch = witch();
      this.img.coin = [coin(7), coin(5), coin(2), coin(5)];
      this.img.mushroom = mushroom();
      this.img.fireFlower = fireFlower();
      this.img.star = star();

      this.img.ground = ground();
      this.img.brick = brick();
      this.img.qblock = [qblock(false), qblock(true)];
      this.img.used = usedBlock();
      this.img.stone = stone();

      this.img.pipeTop = pipeTop();
      this.img.pipeBody = pipeBody();

      this.img.flagPole = flagPole();
      this.img.flagTop = flagTop();

      this.img.cloud = cloud();
      this.img.bush = bush();
      this.img.hill = hill();
      this.img.castle = castle();
    }
  };

  window.Sprites = Sprites;
  window.COL = COL;
})();
