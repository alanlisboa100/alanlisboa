/* input.js - Entrada unificada: teclado + botões de toque */
(function () {
  'use strict';

  var Input = {
    left: false,
    right: false,
    jump: false,        // estado contínuo (segurando)
    jumpPressed: false, // borda de subida (apenas o frame que apertou)
    run: false,
    _jumpWasDown: false,

    init: function () {
      var self = this;

      /* ---------- Teclado ---------- */
      var keymap = {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'jump',
        ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run'
      };

      window.addEventListener('keydown', function (e) {
        var a = keymap[e.code];
        if (a) { self[a] = true; e.preventDefault(); }
        if (e.code === 'KeyP' || e.code === 'Escape') {
          if (self.onPause) self.onPause();
        }
      }, { passive: false });

      window.addEventListener('keyup', function (e) {
        var a = keymap[e.code];
        if (a) { self[a] = false; e.preventDefault(); }
      }, { passive: false });

      /* ---------- Botões de toque ---------- */
      this.bindButton('btn-left', 'left');
      this.bindButton('btn-right', 'right');
      this.bindButton('btn-jump', 'jump');
      this.bindButton('btn-run', 'run');

      // Evita scroll/zoom por toque na área do jogo
      document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    },

    bindButton: function (id, action) {
      var el = document.getElementById(id);
      if (!el) return;
      var self = this;
      var press = function (e) {
        e.preventDefault();
        self[action] = true;
        el.classList.add('active');
      };
      var release = function (e) {
        if (e) e.preventDefault();
        self[action] = false;
        el.classList.remove('active');
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
      // Suporte a mouse (testar no desktop)
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', function () { if (self[action]) release(); });
    },

    // Chamado a cada frame ANTES da lógica: calcula a borda de subida do pulo
    update: function () {
      this.jumpPressed = this.jump && !this._jumpWasDown;
      this._jumpWasDown = this.jump;
    },

    reset: function () {
      this.left = this.right = this.jump = this.run = false;
      this.jumpPressed = false;
      this._jumpWasDown = false;
    }
  };

  window.Input = Input;
})();
