/* entities.js - Entidades do jogo + física de colisão com tiles */
(function () {
  'use strict';

  var TILE = 16;
  var GRAVITY = 0.45;
  var MAX_FALL = 9;

  /* ---------- util de desenho ---------- */
  function drawImg(ctx, img, x, y, flip, w, h) {
    w = w || img.width; h = h || img.height;
    if (flip) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
  }

  /* ---------- colisão com o mapa de tiles ---------- */
  // Move no eixo X e resolve, depois no eixo Y e resolve. Atualiza onGround.
  function moveAndCollide(e, game) {
    // --- Eixo X ---
    e.x += e.vx;
    var box = e;
    var c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + e.w - 1) / TILE);
    var r0 = Math.floor(e.y / TILE), r1 = Math.floor((e.y + e.h - 1) / TILE);
    var col, row;
    if (e.vx > 0) {
      for (row = r0; row <= r1; row++) {
        if (game.isSolid(c1, row, e)) { e.x = c1 * TILE - e.w; e.vx = 0; e.hitWallRight = true; break; }
      }
    } else if (e.vx < 0) {
      for (row = r0; row <= r1; row++) {
        if (game.isSolid(c0, row, e)) { e.x = (c0 + 1) * TILE; e.vx = 0; e.hitWallLeft = true; break; }
      }
    }

    // --- Eixo Y ---
    e.vy += GRAVITY;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    e.y += e.vy;
    e.onGround = false;
    c0 = Math.floor(e.x / TILE); c1 = Math.floor((e.x + e.w - 1) / TILE);
    r0 = Math.floor(e.y / TILE); r1 = Math.floor((e.y + e.h - 1) / TILE);
    if (e.vy > 0) {
      for (col = c0; col <= c1; col++) {
        if (game.isSolid(col, r1, e)) { e.y = r1 * TILE - e.h; e.vy = 0; e.onGround = true; break; }
      }
    } else if (e.vy < 0) {
      for (col = c0; col <= c1; col++) {
        if (game.isSolid(col, r0, e)) {
          e.y = (r0 + 1) * TILE; e.vy = 0;
          if (e.onHeadBump) e.onHeadBump(col, r0, game);
          break;
        }
      }
    }
  }

  /* ===================================================== */
  /* PLAYER                                                */
  /* ===================================================== */
  function Player(x, y) {
    this.type = 'player';
    this.x = x; this.y = y;
    this.w = 12; this.h = 14;
    this.vx = 0; this.vy = 0;
    this.dir = 1;
    this.onGround = false;
    this.power = 0;          // 0 pequeno, 1 grande, 2 fogo
    this.anim = 0;
    this.frame = 'idle';
    this.invuln = 0;         // frames de invencibilidade após dano
    this.starTime = 0;       // tempo de estrela
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.holdingJump = false;
    this.fireCooldown = 0;
    this._runWas = false;
    this.dead = false;
    this.dying = false;
    this.dieTimer = 0;
    this.finished = false;
  }
  Player.prototype.setSize = function () {
    var tall = this.power >= 1;
    var newH = tall ? 26 : 14;
    if (newH !== this.h) {
      this.y -= (newH - this.h); // mantém os pés no chão ao crescer
      this.h = newH;
    }
    this.w = 12;
  };
  Player.prototype.update = function (game) {
    var IN = window.Input;
    if (this.dying) { this.updateDying(game); return; }
    if (this.finished) { this.vx = 0; return; }

    var accel = 0.22, friction = 0.18;
    var running = IN.run;
    var maxSpeed = running ? 2.9 : 1.7;

    if (IN.left) { this.vx -= accel; this.dir = -1; }
    else if (IN.right) { this.vx += accel; this.dir = 1; }
    else {
      if (this.vx > 0) { this.vx -= friction; if (this.vx < 0) this.vx = 0; }
      else if (this.vx < 0) { this.vx += friction; if (this.vx > 0) this.vx = 0; }
    }
    if (this.vx > maxSpeed) this.vx = maxSpeed;
    if (this.vx < -maxSpeed) this.vx = -maxSpeed;

    // Pulo com buffer + coyote time + altura variável
    if (this.onGround) this.coyote = 6; else if (this.coyote > 0) this.coyote--;
    if (IN.jumpPressed) this.jumpBuffer = 6; else if (this.jumpBuffer > 0) this.jumpBuffer--;

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = running ? -8.6 : -8.0;
      this.onGround = false;
      this.coyote = 0; this.jumpBuffer = 0;
      if (this.power >= 1) window.Sfx.bigJump(); else window.Sfx.jump();
    }
    // altura variável: soltar o botão enquanto sobe limita o impulso (pulo curto)
    if (!IN.jump && this.vy < -4.5) this.vy = -4.5;

    // Lançar bola de fogo (forma fogo): toque em B (borda de subida)
    if (this.power === 2 && IN.run && !this._runWas && this.fireCooldown <= 0) {
      game.spawn(new Fireball(this.dir > 0 ? this.x + this.w : this.x - 6, this.y + 6, this.dir));
      window.Sfx.kick();
      this.fireCooldown = 18;
    }
    this._runWas = IN.run;
    if (this.fireCooldown > 0) this.fireCooldown--;

    this.hitWallLeft = this.hitWallRight = false;
    moveAndCollide(this, game);

    // animação
    if (!this.onGround) this.frame = 'jump';
    else if (Math.abs(this.vx) > 0.3) {
      this.anim += Math.abs(this.vx) * 0.12;
      this.frame = (Math.floor(this.anim) % 2 === 0) ? 'walk1' : 'walk2';
    } else this.frame = 'idle';

    if (this.invuln > 0) this.invuln--;
    if (this.starTime > 0) { this.starTime--; if (this.starTime === 0) window.Sfx.startMusic(); }

    // caiu num buraco
    if (this.y > game.level.pixelHeight + 40) this.die(game);
  };
  Player.prototype.onHeadBump = function (col, row, game) {
    game.hitBlockFromBelow(col, row, this);
  };
  Player.prototype.stomp = function () {
    this.vy = window.Input.jump ? -8.0 : -5.5; // pulo maior se segurar
    this.holdingJump = window.Input.jump;
  };
  Player.prototype.grow = function (game) {
    if (this.power === 0) { this.power = 1; this.setSize(); window.Sfx.powerup(); game.flash(); }
    else window.Sfx.coin();
  };
  Player.prototype.fire = function (game) {
    this.power = 2; this.setSize(); window.Sfx.powerup(); game.flash();
  };
  Player.prototype.starPower = function () {
    this.starTime = 600; window.Sfx.powerup();
  };
  Player.prototype.hit = function (game) {
    if (this.invuln > 0 || this.starTime > 0 || this.dying) return;
    if (this.power >= 1) {
      this.power = 0; this.setSize(); this.invuln = 90; window.Sfx.powerdown();
    } else {
      this.die(game);
    }
  };
  Player.prototype.die = function (game) {
    if (this.dying) return;
    this.dying = true; this.dieTimer = 0; this.vy = -8; this.vx = 0;
    window.Sfx.die();
    game.onPlayerDeath();
  };
  Player.prototype.updateDying = function (game) {
    this.dieTimer++;
    if (this.dieTimer > 24) { this.vy += GRAVITY; this.y += this.vy; }
  };
  Player.prototype.draw = function (ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0 && !this.dying) return; // pisca
    var set = this.power === 2 ? window.Sprites.heroFire : (this.power === 1 ? window.Sprites.heroBig : window.Sprites.heroSmall);
    var img = set[this.frame] || set.idle;
    // estrela: tonaliza
    if (this.starTime > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.starTime * 0.6);
    var ox = (img.width - this.w) / 2;
    drawImg(ctx, img, this.x - ox, this.y - (img.height - this.h), this.dir < 0);
    ctx.globalAlpha = 1;
  };

  /* ===================================================== */
  /* GOOMBA                                                */
  /* ===================================================== */
  function Goomba(x, y) {
    this.type = 'enemy'; this.kind = 'goomba';
    this.x = x; this.y = y; this.w = 14; this.h = 14;
    this.vx = -0.5; this.vy = 0;
    this.anim = 0; this.dead = false; this.flat = false; this.flatTimer = 0;
    this.remove = false; this.onGround = false;
  }
  Goomba.prototype.update = function (game) {
    if (this.flat) { this.flatTimer--; if (this.flatTimer <= 0) this.remove = true; return; }
    if (this.dead) { // virou de cabeça pra baixo e cai
      this.vy += GRAVITY; this.y += this.vy; this.x += this.vx;
      if (this.y > game.level.pixelHeight + 40) this.remove = true;
      return;
    }
    this.hitWallLeft = this.hitWallRight = false;
    moveAndCollide(this, game);
    if (this.hitWallLeft) this.vx = 0.5;
    if (this.hitWallRight) this.vx = -0.5;
    // vira na beirada de plataforma
    if (this.onGround && game.edgeAhead(this)) this.vx = -this.vx;
    this.anim += 0.1;
  };
  Goomba.prototype.stompedBy = function (player, game) {
    this.flat = true; this.flatTimer = 30; this.h = 6; this.y += 8;
    window.Sfx.stomp(); game.addScore(100, this.x, this.y);
  };
  Goomba.prototype.draw = function (ctx) {
    if (this.flat) { drawImg(ctx, window.Sprites.img.goombaFlat, this.x - 1, this.y - 2); return; }
    var img = window.Sprites.img.goomba[Math.floor(this.anim) % 2];
    ctx.save();
    if (this.dead) { ctx.translate(this.x, this.y + this.h); ctx.scale(1, -1); ctx.drawImage(img, -1, 0); ctx.restore(); return; }
    ctx.restore();
    drawImg(ctx, img, this.x - 1, this.y - 1);
  };

  /* ===================================================== */
  /* KOOPA                                                 */
  /* ===================================================== */
  function Koopa(x, y) {
    this.type = 'enemy'; this.kind = 'koopa';
    this.x = x; this.y = y; this.w = 14; this.h = 22;
    this.vx = -0.5; this.vy = 0;
    this.anim = 0; this.dead = false; this.remove = false;
    this.shell = false; this.sliding = false; this.onGround = false;
    this.wakeTimer = 0; this.justKicked = 0;
  }
  Koopa.prototype.update = function (game) {
    if (this.justKicked > 0) this.justKicked--;
    this.hitWallLeft = this.hitWallRight = false;
    moveAndCollide(this, game);
    if (this.hitWallLeft) this.vx = Math.abs(this.vx) || 0.5;
    if (this.hitWallRight) this.vx = -(Math.abs(this.vx) || 0.5);

    if (this.shell && !this.sliding) {
      this.wakeTimer--;
      if (this.wakeTimer <= 0) { // acorda
        this.shell = false; this.h = 22; this.y -= 8; this.vx = -0.5;
      }
    } else if (!this.shell) {
      if (this.onGround && game.edgeAhead(this)) this.vx = -this.vx;
      this.anim += 0.1;
    }
    if (this.sliding) {
      // mata inimigos no caminho
      var arr = game.entities;
      for (var i = 0; i < arr.length; i++) {
        var o = arr[i];
        if (o !== this && o.type === 'enemy' && o.kind !== 'boss' && !o.remove && !o.dead && this.intersects(o)) {
          if (o.die) o.die(game); else { o.dead = true; o.vy = -4; o.vx = this.vx > 0 ? 1 : -1; }
          window.Sfx.kick(); game.addScore(200, o.x, o.y);
        }
      }
    }
  };
  Koopa.prototype.intersects = function (o) {
    return this.x < o.x + o.w && this.x + this.w > o.x && this.y < o.y + o.h && this.y + this.h > o.y;
  };
  Koopa.prototype.stompedBy = function (player, game) {
    if (!this.shell) {
      this.shell = true; this.sliding = false; this.h = 14; this.y += 8;
      this.vx = 0; this.wakeTimer = 360;
      window.Sfx.stomp(); game.addScore(100, this.x, this.y);
    } else if (this.sliding) {
      this.sliding = false; this.vx = 0; this.wakeTimer = 360;
      window.Sfx.stomp();
    } else {
      this.kickShell(player, game);
    }
  };
  Koopa.prototype.kickShell = function (player, game) {
    this.sliding = true;
    this.vx = (player.x < this.x) ? 4 : -4;
    this.wakeTimer = 0;
    this.justKicked = 12; // não machuca quem chutou por alguns frames
    window.Sfx.kick(); game.addScore(400, this.x, this.y);
  };
  Koopa.prototype.die = function () { this.dead = true; this.vy = -4; };
  Koopa.prototype.draw = function (ctx) {
    var img;
    if (this.shell) img = window.Sprites.img.koopaShell;
    else img = window.Sprites.img.koopa[Math.floor(this.anim) % 2];
    if (this.dead) {
      ctx.save(); ctx.translate(this.x, this.y + this.h); ctx.scale(1, -1);
      ctx.drawImage(img, -1, 0); ctx.restore(); return;
    }
    // arte olha para a direita; espelha quando anda para a esquerda
    drawImg(ctx, img, this.x - 1, this.y - (img.height - this.h), this.vx < 0);
  };

  /* ===================================================== */
  /* MOEDA (estática no mapa)                              */
  /* ===================================================== */
  function Coin(x, y) {
    this.type = 'coin'; this.x = x + 2; this.y = y; this.w = 12; this.h = 16;
    this.anim = Math.random() * 4; this.remove = false;
  }
  Coin.prototype.update = function () { this.anim += 0.15; };
  Coin.prototype.collect = function (game) {
    this.remove = true; game.collectCoin(this.x, this.y);
  };
  Coin.prototype.draw = function (ctx) {
    var img = window.Sprites.img.coin[Math.floor(this.anim) % 4];
    ctx.drawImage(img, this.x - 2, this.y);
  };

  /* ===================================================== */
  /* POWER-UP (cogumelo / flor / estrela) em movimento     */
  /* ===================================================== */
  function PowerUp(x, y, kind) {
    this.type = 'powerup'; this.kind = kind || 'mushroom';
    this.x = x; this.y = y; this.w = 14; this.h = 16;
    this.vx = (this.kind === 'mushroom' || this.kind === 'star') ? 1.2 : 0;
    this.vy = 0; this.onGround = false; this.remove = false;
    this.emerge = 16; // sobe do bloco
  }
  PowerUp.prototype.update = function (game) {
    if (this.emerge > 0) { this.emerge--; this.y -= 1; return; }
    this.hitWallLeft = this.hitWallRight = false;
    if (this.kind === 'fireFlower') { moveAndCollideStatic(this, game); return; }
    moveAndCollide(this, game);
    if (this.hitWallLeft) this.vx = Math.abs(this.vx);
    if (this.hitWallRight) this.vx = -Math.abs(this.vx);
    if (this.kind === 'star' && this.onGround) this.vy = -5; // estrela quica
  };
  PowerUp.prototype.apply = function (player, game) {
    this.remove = true;
    if (this.kind === 'mushroom') { player.grow(game); game.addScore(1000, this.x, this.y); }
    else if (this.kind === 'fireFlower') {
      if (player.power === 0) player.grow(game); else player.fire(game);
      game.addScore(1000, this.x, this.y);
    } else if (this.kind === 'star') { player.starPower(); game.addScore(1000, this.x, this.y); }
  };
  PowerUp.prototype.draw = function (ctx) {
    var img = this.kind === 'fireFlower' ? window.Sprites.img.fireFlower
      : this.kind === 'star' ? window.Sprites.img.star : window.Sprites.img.mushroom;
    ctx.drawImage(img, this.x - 1, this.y);
  };
  function moveAndCollideStatic(e, game) {
    e.vy += GRAVITY; if (e.vy > MAX_FALL) e.vy = MAX_FALL; e.y += e.vy;
    var c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + e.w - 1) / TILE);
    var r1 = Math.floor((e.y + e.h - 1) / TILE), col;
    e.onGround = false;
    if (e.vy > 0) for (col = c0; col <= c1; col++) if (game.isSolid(col, r1, e)) { e.y = r1 * TILE - e.h; e.vy = 0; e.onGround = true; break; }
  }

  /* ===================================================== */
  /* BOLA DE FOGO (projétil do player)                     */
  /* ===================================================== */
  function Fireball(x, y, dir) {
    this.type = 'fireball'; this.x = x; this.y = y; this.w = 6; this.h = 6;
    this.vx = dir * 4; this.vy = 2; this.remove = false; this.life = 200; this.anim = 0;
  }
  Fireball.prototype.update = function (game) {
    this.life--; if (this.life <= 0) { this.remove = true; return; }
    this.hitWallLeft = this.hitWallRight = false;
    moveAndCollide(this, game);
    if (this.onGround) this.vy = -3.4;          // quica
    if (this.hitWallLeft || this.hitWallRight) { this.boom(game); return; }
    this.anim += 0.4;
    var arr = game.entities;
    for (var i = 0; i < arr.length; i++) {
      var o = arr[i];
      if (o.type === 'enemy' && !o.remove && !o.dead && this.hits(o)) {
        if (o.kind === 'boss') { o.hurt(game); }
        else if (o.die) { o.die(game); }
        else { o.dead = true; o.vy = -4; }
        window.Sfx.kick(); game.addScore(200, o.x, o.y); this.boom(game); return;
      }
    }
  };
  Fireball.prototype.hits = function (o) {
    return this.x < o.x + o.w && this.x + this.w > o.x && this.y < o.y + o.h && this.y + this.h > o.y;
  };
  Fireball.prototype.boom = function (game) {
    this.remove = true;
    game.spawn(new Particle(this.x, this.y, '#ffd23f', 6));
  };
  Fireball.prototype.draw = function (ctx) {
    ctx.fillStyle = (Math.floor(this.anim) % 2 === 0) ? '#ff7b29' : '#ffd23f';
    ctx.beginPath();
    ctx.arc(this.x + 3, this.y + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  /* ===================================================== */
  /* CHEFE (BOSS)                                          */
  /* ===================================================== */
  function Boss(x, y, hp) {
    this.type = 'enemy'; this.kind = 'boss';
    this.x = x; this.y = y; this.w = 26; this.h = 26;
    this.vx = -0.7; this.vy = 0;
    this.hp = hp || 3; this.maxHp = this.hp;
    this.invuln = 0; this.onGround = false;
    this.anim = 0; this.dead = false; this.remove = false; this.defeated = false;
    this.jumpTimer = 70 + Math.floor(Math.random() * 60);
    this.fireTimer = 90 + Math.floor(Math.random() * 60);
    this.dieTimer = 0;
  }
  Boss.prototype.update = function (game) {
    if (this.defeated) {
      this.dieTimer++; this.vy += GRAVITY; this.y += this.vy; this.x += this.vx * 0.3;
      if (this.dieTimer > 70) this.remove = true;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    var p = game.player;

    this.hitWallLeft = this.hitWallRight = false;
    moveAndCollide(this, game);
    if (this.hitWallLeft) this.vx = Math.abs(this.vx) || 0.7;
    if (this.hitWallRight) this.vx = -(Math.abs(this.vx) || 0.7);

    if (this.onGround) {
      // segue o jogador de vez em quando, e não cai das bordas
      if (Math.random() < 0.012) this.vx = (p.x < this.x ? -1 : 1) * (0.6 + Math.random() * 0.6);
      if (game.edgeAhead(this)) this.vx = -this.vx;
      // pulo periódico
      this.jumpTimer--;
      if (this.jumpTimer <= 0) { this.vy = -7; this.jumpTimer = 80 + Math.floor(Math.random() * 80); }
    }
    // ataque de fogo
    this.fireTimer--;
    if (this.fireTimer <= 0) {
      var dir = p.x < this.x ? -1 : 1;
      game.spawn(new BossFire(dir > 0 ? this.x + this.w : this.x - 8, this.y + 6, dir));
      window.Sfx.kick();
      this.fireTimer = 100 + Math.floor(Math.random() * 70);
    }
    this.anim += Math.abs(this.vx) * 0.1 + 0.03;
  };
  Boss.prototype.hurt = function (game) {
    if (this.invuln > 0 || this.defeated) return;
    this.hp--; this.invuln = 70; window.Sfx.powerdown();
    game.spawn(new Particle(this.x + this.w / 2, this.y + 6, '#fff1c0', 8));
    if (this.hp <= 0) this.defeat(game);
  };
  Boss.prototype.defeat = function (game) {
    this.defeated = true; this.dead = true;
    this.vy = -6; this.vx = (game.player.x < this.x ? 1.6 : -1.6);
    window.Sfx.die(); game.addScore(5000, this.x, this.y);
    game.spawn(new Particle(this.x + this.w / 2, this.y + this.h / 2, '#ffd23f', 16));
    game.spawn(new Particle(this.x + this.w / 2, this.y + this.h / 2, '#ff5a3c', 10));
  };
  Boss.prototype.stompedBy = function (player, game) { this.hurt(game); };
  Boss.prototype.draw = function (ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0 && !this.defeated) return; // pisca
    var img = window.Sprites.img.boss[Math.floor(this.anim) % 2];
    if (this.defeated) {
      ctx.save(); ctx.translate(this.x - 2, this.y + this.h); ctx.scale(1, -1); ctx.drawImage(img, 0, 0); ctx.restore(); return;
    }
    drawImg(ctx, img, this.x - 2, this.y - (img.height - this.h), this.vx < 0);
  };

  /* ===================================================== */
  /* PROJÉTIL DO CHEFE (perigo)                            */
  /* ===================================================== */
  function BossFire(x, y, dir) {
    this.type = 'hazard'; this.x = x; this.y = y; this.w = 8; this.h = 8;
    this.vx = dir * 2.4; this.vy = -1.4; this.remove = false; this.life = 220; this.anim = 0;
  }
  BossFire.prototype.update = function (game) {
    this.life--; if (this.life <= 0) { this.remove = true; return; }
    this.vy += 0.2; if (this.vy > 4) this.vy = 4;
    this.x += this.vx; this.y += this.vy;
    var col = Math.floor((this.x + this.w / 2) / TILE), row = Math.floor((this.y + this.h) / TILE);
    if (game.isSolid(col, row, this)) { this.y = row * TILE - this.h; this.vy = -3; } // quica no chão
    var cam = game.camera.x;
    if (this.x < cam - 60 || this.x > cam + window.VIEW.W + 60) this.remove = true;
    this.anim += 0.3;
  };
  BossFire.prototype.draw = function (ctx) {
    ctx.fillStyle = (Math.floor(this.anim) % 2 === 0) ? '#ff5a3c' : '#ffd23f';
    ctx.beginPath(); ctx.arc(this.x + 4, this.y + 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(this.x + 2, this.y + 2, 2, 2);
  };

  /* ===================================================== */
  /* PRINCESA                                              */
  /* ===================================================== */
  function Princess(x, y) {
    this.type = 'princess'; this.x = x; this.y = y; this.w = 12; this.h = 22;
    this.baseY = y; this.anim = Math.random() * 6; this.remove = false;
  }
  Princess.prototype.update = function () { this.anim += 0.08; this.y = this.baseY + Math.sin(this.anim) * 1.5; };
  Princess.prototype.draw = function (ctx) {
    drawImg(ctx, window.Sprites.img.princess, this.x - 1, this.y - (window.Sprites.img.princess.height - this.h));
  };

  /* ===================================================== */
  /* PARTÍCULAS / popups de pontuação                      */
  /* ===================================================== */
  function Particle(x, y, color, count) {
    this.type = 'fx'; this.x = x; this.y = y; this.remove = false; this.life = 30;
    this.bits = [];
    for (var i = 0; i < (count || 5); i++) {
      this.bits.push({ x: x, y: y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1, c: color });
    }
  }
  Particle.prototype.update = function () {
    this.life--; if (this.life <= 0) this.remove = true;
    for (var i = 0; i < this.bits.length; i++) {
      var b = this.bits[i]; b.vy += 0.3; b.x += b.vx; b.y += b.vy;
    }
  };
  Particle.prototype.draw = function (ctx) {
    for (var i = 0; i < this.bits.length; i++) {
      var b = this.bits[i]; ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, 2, 2);
    }
  };

  function ScorePop(x, y, text) {
    this.type = 'fx'; this.x = x; this.y = y; this.text = text; this.life = 40; this.remove = false;
  }
  ScorePop.prototype.update = function () { this.y -= 0.6; this.life--; if (this.life <= 0) this.remove = true; };
  ScorePop.prototype.draw = function (ctx) {
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.textAlign = 'left';
  };

  /* exporta */
  window.Entities = {
    Player: Player, Goomba: Goomba, Koopa: Koopa, Coin: Coin,
    PowerUp: PowerUp, Fireball: Fireball, Particle: Particle, ScorePop: ScorePop,
    Boss: Boss, BossFire: BossFire, Princess: Princess,
    moveAndCollide: moveAndCollide, drawImg: drawImg, TILE: TILE, GRAVITY: GRAVITY
  };
})();
