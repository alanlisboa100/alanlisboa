/* main.js - Inicialização e loop principal (timestep fixo 60fps) */
(function () {
  'use strict';

  function boot() {
    var canvas = document.getElementById('game');
    var Game = window.Game;
    Game.init(canvas);

    // Botão da tela inicial / reinício
    var startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', function () {
      window.Sfx.resume();
      if (Game.state === 'paused') { Game.togglePause(); return; }
      Game.start();
    });

    // Botão de pausa
    var pauseBtn = document.getElementById('pause-btn');
    pauseBtn.addEventListener('click', function () { Game.togglePause(); });

    // Garante retomada do áudio no primeiro toque (políticas mobile)
    var resumeOnce = function () { window.Sfx.resume(); };
    document.addEventListener('touchstart', resumeOnce, { once: false });
    document.addEventListener('pointerdown', resumeOnce, { once: false });

    // Pausa ao perder o foco
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && Game.state === 'playing') Game.togglePause();
    });

    /* ---- Loop com timestep fixo ---- */
    var STEP = 1000 / 60;
    var last = performance.now();
    var acc = 0;

    function frame(now) {
      var dt = now - last;
      last = now;
      if (dt > 250) dt = 250; // evita saltos enormes
      acc += dt;
      var guard = 0;
      while (acc >= STEP && guard < 5) {
        Game.update();
        acc -= STEP;
        guard++;
      }
      Game.render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
