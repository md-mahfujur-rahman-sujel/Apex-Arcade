/* menu-kit.js — additive, DOM-first menu system for Apex Arcade.
   M1-1: config validation, screen routing, and keyboard focus management.
   M1-3: Banner Frame panel treatment and end-cap button skin.
   No dependency on Arcade, UI, Save, Fx, Music, or a framework. */
(function (global) {
  'use strict';

  var Menu = (global.Menu = global.Menu || {});
  var ARCHETYPES = {
    banner: true, neon: true, crt: true, machine: true, glass: true,
    storybook: true, table: true, paper: true, scoreboard: true, cards: true
  };
  var PALETTE_KEYS = ['bg', 'panel', 'accent', 'button', 'buttonText', 'text', 'danger'];
  var ITEM_LABELS = {
    play: 'Play', continue: 'Continue', modes: 'Modes', customize: 'Customize',
    options: 'Options', about: 'About', stats: 'Stats', more: 'More', exit: 'Exit'
  };
  var instanceCount = 0;
  var SCRIPT_URL = (function () {
    var script = global.document && global.document.currentScript;
    return script && script.src || global.document.baseURI;
  }());
  var MENU_CSS_URL = (function () {
    try { return new URL('menu-kit.css', SCRIPT_URL).href; }
    catch (error) { return 'menu-kit.css'; }
  }());
  var BUILD_INFO_URL = (function () {
    try { return new URL('../../build-info.json', SCRIPT_URL).href; }
    catch (error) { return 'build-info.json'; }
  }());
  // Inside the theater the host owns the pause screen. Game pages keep their
  // standalone menu behavior unless they were loaded through an embedded frame.
  var THEATER_EMBEDDED = (function () {
    try {
      if (!global.document || !global.parent || global.parent === global) return false;
      return new global.URLSearchParams(global.location.search || '').get('embed') === 'theater';
    } catch (error) { return false; }
  }());
  if (THEATER_EMBEDDED) {
    global.__apexTheaterEmbedded = true;
    if (global.document && global.document.documentElement) global.document.documentElement.setAttribute('data-apex-embed', 'theater');
  }

  function isObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function validate(config) {
    var errors = [], theme, palette, seen = {};
    if (!isObject(config)) return { valid: false, errors: ['config must be an object'] };
    if (typeof config.gameId !== 'string' || !config.gameId.trim()) errors.push('gameId must be a non-empty string');
    if (typeof config.title !== 'string' || !config.title.trim()) errors.push('title must be a non-empty string');
    if (config.tagline != null && typeof config.tagline !== 'string') errors.push('tagline must be a string');
    if (typeof config.onPlay !== 'function') errors.push('onPlay must be a function');

    if (!ARCHETYPES[config.archetype]) errors.push('archetype must be a supported archetype');
    theme = config.theme;
    if (!isObject(theme)) {
      errors.push('theme must be an object');
    } else {
      palette = theme.palette;
      if (!isObject(palette)) {
        errors.push('theme.palette must be an object');
      } else {
        PALETTE_KEYS.forEach(function (key) {
          if (palette[key] != null && typeof palette[key] !== 'string') errors.push('theme.palette.' + key + ' must be a CSS color string');
        });
        ['bg', 'panel', 'accent', 'button', 'buttonText', 'text'].forEach(function (key) {
          if (typeof palette[key] !== 'string' || !palette[key].trim()) errors.push('theme.palette.' + key + ' is required');
        });
      }
      if (!isObject(theme.type) || typeof theme.type.title !== 'string' || typeof theme.type.body !== 'string') {
        errors.push('theme.type must provide title and body font stacks');
      }
      if (typeof theme.frame !== 'string' || !theme.frame.trim()) errors.push('theme.frame must be a non-empty string');
      if (typeof theme.button !== 'string' || !theme.button.trim()) errors.push('theme.button must be a non-empty string');
      if (theme.scene != null && typeof theme.scene !== 'function') errors.push('theme.scene must be a function when provided');
      if (theme.sceneFallback != null && typeof theme.sceneFallback !== 'function') errors.push('theme.sceneFallback must be a function when provided');
      if (theme.motion != null && !isObject(theme.motion)) errors.push('theme.motion must be an object when provided');
      if (theme.sfx != null && !isObject(theme.sfx)) errors.push('theme.sfx must be an object when provided');
      if (theme.music != null && theme.music !== false && typeof theme.music !== 'string' && !isObject(theme.music)) errors.push('theme.music must be a config object, a theme name, or false');
    }

    if (!Array.isArray(config.items) || config.items.length < 1 || config.items.length > 7) {
      errors.push('items must contain between 1 and 7 menu actions');
    } else {
      config.items.forEach(function (item, index) {
        var id = typeof item === 'string' ? item : isObject(item) ? item.id : '';
        if (!ITEM_LABELS[id]) errors.push('items[' + index + '] has an unsupported action');
        else if (seen[id]) errors.push('items must not repeat action "' + id + '"');
        else seen[id] = true;
        if (isObject(item) && item.label != null && typeof item.label !== 'string') errors.push('items[' + index + '].label must be a string');
        if (isObject(item) && item.action != null && typeof item.action !== 'function') errors.push('items[' + index + '].action must be a function');
      });
    }
    if (config.screens != null && !isObject(config.screens)) errors.push('screens must be an object when provided');
    return { valid: errors.length === 0, errors: errors };
  }

  function createRouter(initial, onChange) {
    var current = initial || 'main', history = [];
    return {
      current: function () { return current; },
      go: function (next, data) {
        if (typeof next !== 'string' || !next) return false;
        if (next !== current) history.push(current);
        current = next;
        if (typeof onChange === 'function') onChange(current, data || {});
        return true;
      },
      back: function () {
        if (!history.length) return false;
        current = history.pop();
        if (typeof onChange === 'function') onChange(current, { back: true });
        return true;
      },
      reset: function (next) { history.length = 0; current = next || 'main'; if (typeof onChange === 'function') onChange(current, { reset: true }); },
      history: function () { return history.slice(); }
    };
  }

  function createFocusManager(root) {
    var selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function items() { return Array.prototype.slice.call(root.querySelectorAll(selector)).filter(function (el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }); }
    return {
      focus: function (index) {
        var all = items();
        if (!all.length) return false;
        var at = ((index % all.length) + all.length) % all.length;
        all[at].focus();
        return true;
      },
      move: function (delta) {
        var all = items(), active = root.ownerDocument.activeElement, at = all.indexOf(active);
        return this.focus((at < 0 ? 0 : at + delta));
      },
      first: function () { return this.focus(0); },
      last: function () { var all = items(); return this.focus(all.length - 1); },
      elements: items
    };
  }

  function injectStyles(doc) {
    var link = doc.getElementById('apex-menu-kit-styles');
    if (link) return link;
    link = doc.createElement('link');
    link.id = 'apex-menu-kit-styles';
    link.rel = 'stylesheet';
    link.href = MENU_CSS_URL;
    doc.head.appendChild(link);
    return link;
  }

  function mount(config, options) {
    var result = validate(config);
    if (!result.valid) throw new Error('Menu config is invalid:\n- ' + result.errors.join('\n- '));
    if (!global.document) throw new Error('Menu.mount requires a browser document');
    options = options || {};
    var doc = options.document || global.document, host = options.root || doc.body;
    if (!host || !host.appendChild) throw new Error('Menu.mount requires a DOM root');
    var styles = injectStyles(doc);
    instanceCount += 1;

    var root = doc.createElement('section');
    root.className = 'apex-menu-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    if (styles && !styles.sheet) {
      root.style.visibility = 'hidden';
      var revealRoot = function () { root.style.visibility = ''; };
      styles.addEventListener('load', revealRoot, { once: true });
      styles.addEventListener('error', revealRoot, { once: true });
      if (styles.sheet) revealRoot();
    }
    root.setAttribute('aria-label', config.title + ' main menu');
    root.setAttribute('data-menu-game', config.gameId);
    root.setAttribute('data-menu-archetype', config.archetype);
    root.setAttribute('data-menu-frame', config.theme.frame);
    root.setAttribute('data-menu-button-skin', config.theme.button);
    global.ApexMenuActive = true;
    root.hidden = false;
    root.style.setProperty('--menu-bg', config.theme.palette.bg);
    root.style.setProperty('--menu-panel', config.theme.palette.panel);
    root.style.setProperty('--menu-accent', config.theme.palette.accent);
    root.style.setProperty('--menu-button', config.theme.palette.button);
    root.style.setProperty('--menu-button-text', config.theme.palette.buttonText);
    root.style.setProperty('--menu-text', config.theme.palette.text);
    root.style.setProperty('--menu-title', config.theme.type.title);
    root.style.setProperty('--menu-body', config.theme.type.body);

    var panel = doc.createElement('div');
    panel.className = 'apex-menu-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-live', 'polite');
    root.appendChild(panel);
    host.appendChild(root);

    var versionLine = doc.createElement('p');
    versionLine.className = 'apex-menu-version';
    versionLine.setAttribute('aria-label', 'Build version');
    versionLine.textContent = 'Version ' + Menu.version + ' · development build';
    root.appendChild(versionLine);
    if (typeof global.fetch === 'function' && global.location && global.location.origin && global.location.origin !== 'null') {
      global.fetch(BUILD_INFO_URL, { credentials: 'same-origin', cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error('Build information is unavailable');
        return response.json();
      }).then(function (info) {
        if (!destroyed && info && typeof info.version === 'string' && typeof info.buildId === 'string') {
          versionLine.textContent = 'Version ' + info.version + ' · ' + info.buildId;
        }
      }).catch(function () {});
    }

    function postHostMessage(type, detail) {
      if (!global.parent || global.parent === global || !global.location || !global.location.origin) return false;
      try {
        global.parent.postMessage(Object.assign({ type: type, gameId: config.gameId }, detail || {}), global.location.origin);
        return true;
      } catch (e) { return false; }
    }

    var router, focus, sceneController = null, destroyed = false, currentViewData = {};
    var gamepadRaf = 0, previousGamepad = {};
    var hostPaused = false;
    var soundUnlocked = false, suppressFocusSound = false, lastUiSoundAt = 0;
    var screens = config.screens || {};
    var optionState = readSettings(config.gameId, config.options || {});
    var optionsTab = 'audio';
    root.style.setProperty('--menu-scale', String(Math.max(0.85, Math.min(1.4, Number(optionState.textScale) || 1))));
    if (optionState.reduceMotion) root.setAttribute('data-reduced-motion', 'true');
    if (optionState.colorblind && optionState.colorblind !== 'none') root.setAttribute('data-colorblind', optionState.colorblind);
    if (global.Arcade && typeof optionState.sfxVol === 'number') global.Arcade.sfxVolume = optionState.sfxVol;
    if (global.Board && typeof global.Board.setSfxVolume === 'function') global.Board.setSfxVolume(optionState.sfxVol);
    function menuMusicConfig() {
      var setting = config.theme.music;
      if (!setting) return null;
      if (isObject(setting)) return Object.assign({}, setting, { gameId: config.gameId });
      var hash = 0, i;
      for (i = 0; i < config.gameId.length; i++) hash = (hash * 31 + config.gameId.charCodeAt(i)) >>> 0;
      return {
        gameId: config.gameId, tempo: 88 + hash % 21, root: 45 + (hash >>> 5) % 8,
        scale: (hash & 1) ? 'minor' : 'pentatonic', layers: ['bass', 'pad', 'lead', 'drums']
      };
    }
    var musicConfig = menuMusicConfig();

    function playUiSound(kind) {
      if (!soundUnlocked) return;
      var now = Date.now();
      if (now - lastUiSoundAt < 45) return;
      lastUiSoundAt = now;
      var configured = config.theme.sfx && config.theme.sfx[kind];
      var sound = typeof configured === 'string' ? configured : (kind === 'hover' ? 'tick' : kind === 'back' ? 'blip' : 'select');
      if (global.Arcade && typeof global.Arcade.sfx === 'function') global.Arcade.sfx(sound);
      else if (global.Board && typeof global.Board.sfx === 'function') global.Board.sfx(sound);
    }
    function unlockMenuSound() { soundUnlocked = true; }
    function onPointerDown() { unlockMenuSound(); }
    function onMenuPointerOver(event) {
      var target = event.target && event.target.closest && event.target.closest('.apex-menu-action,.apex-menu-back,.apex-menu-control-button,.apex-menu-tab');
      if (target && root.contains(target) && (!event.relatedTarget || !target.contains(event.relatedTarget))) playUiSound('hover');
    }
    function onMenuFocus(event) {
      if (suppressFocusSound) return;
      var target = event.target;
      if (target && target.matches && target.matches('.apex-menu-action,.apex-menu-back,.apex-menu-control-button,.apex-menu-tab')) playUiSound('hover');
    }
    function onMenuClick(event) {
      var target = event.target && event.target.closest && event.target.closest('.apex-menu-action,.apex-menu-back,.apex-menu-control-button,.apex-menu-tab');
      if (!target || !root.contains(target)) return;
      playUiSound(target.hasAttribute('data-menu-back') ? 'back' : 'select');
    }
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('keydown', unlockMenuSound);
    root.addEventListener('pointerover', onMenuPointerOver);
    root.addEventListener('focusin', onMenuFocus);
    root.addEventListener('click', onMenuClick);
    if (global.Perf && typeof global.Perf.setTier === 'function' && optionState.performanceTier && optionState.performanceTier !== 'auto') global.Perf.setTier(optionState.performanceTier);
    if (typeof config.theme.scene === 'function' && global.Fx && typeof global.Fx.menuScene === 'function') {
      var sceneCanvas = doc.createElement('canvas');
      sceneCanvas.className = 'apex-menu-scene';
      sceneCanvas.setAttribute('aria-hidden', 'true');
      sceneCanvas.style.cssText = 'position:absolute;inset:0;z-index:0;width:100%;height:100%;pointer-events:none;';
      root.insertBefore(sceneCanvas, panel);
      try {
        sceneController = global.Fx.menuScene(sceneCanvas, config.theme.scene, {
          gameId: config.gameId, palette: config.theme.palette, fallback: config.theme.sceneFallback,
          motionElement: root, onError: config.onSceneError
        });
      } catch (error) {
        if (typeof config.onSceneError === 'function') config.onSceneError(error);
      }
    }

    function readSettings(gameId, defaults) {
      var saved = {};
      try { if (global.Save && typeof global.Save.load === 'function') saved = global.Save.load(gameId).settings || {}; } catch (e) {}
      return Object.assign({
        musicVol: 0.8, sfxVol: 0.8, reduceMotion: false, colorblind: 'none',
        textScale: 1, difficulty: 'normal', bindings: {}, performanceTier: 'auto'
      }, defaults || {}, saved);
    }

    function saveSetting(key, value) {
      optionState[key] = value;
      var patch = { settings: {} };
      patch.settings[key] = value;
      try { if (global.Save && typeof global.Save.update === 'function') global.Save.update(config.gameId, patch); } catch (e) {}
      if (key === 'reduceMotion') {
        if (value) root.setAttribute('data-reduced-motion', 'true');
        else root.removeAttribute('data-reduced-motion');
        if (sceneController) sceneController.setReducedMotion(value);
        if (global.parent && global.parent !== global) {
          try { global.parent.postMessage({ type: 'APEX_REDUCED_MOTION_CHANGED', reducedMotion: !!value, gameId: config.gameId }, global.location.origin); } catch (e) {}
        }
      } else if (key === 'sfxVol' && global.Arcade) {
        global.Arcade.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
      } else if (key === 'sfxVol' && global.Board && typeof global.Board.setSfxVolume === 'function') {
        global.Board.setSfxVolume(Math.max(0, Math.min(1, Number(value) || 0)));
      } else if (key === 'performanceTier' && global.Perf && typeof global.Perf.setTier === 'function') {
        global.Perf.setTier(value === 'auto' ? null : value);
      }
      if (key === 'colorblind') root.setAttribute('data-colorblind', value);
      if (key === 'textScale') root.style.setProperty('--menu-scale', String(Math.max(0.85, Math.min(1.4, Number(value) || 1))));
      if (typeof config.onSettingChange === 'function') config.onSettingChange(key, value);
    }

    function renderOptionsContent(container) {
      var tabs = [
        { id: 'audio', label: 'Audio' }, { id: 'video', label: 'Video' },
        { id: 'controls', label: 'Controls' }, { id: 'accessibility', label: 'Accessibility' },
        { id: 'gameplay', label: 'Gameplay' }
      ];
      var tabbar = widgets.tabs(doc, { label: 'Options sections', items: tabs, active: optionsTab, onChange: function (id) { optionsTab = id; render(router.current(), currentViewData); } });
      container.appendChild(tabbar.element);
      var body = doc.createElement('div');
      body.setAttribute('role', 'tabpanel');
      body.setAttribute('aria-label', tabs.filter(function (tab) { return tab.id === optionsTab; })[0].label + ' options');
      body.id = 'apex-menu-options-panel-' + instanceCount;
      tabbar.setPanelId(body.id);
      container.appendChild(body);

      function addSlider(label, key, min, max, step) {
        body.appendChild(widgets.slider(doc, { label: label, value: optionState[key], min: min, max: max, step: step, onChange: function (value) { saveSetting(key, value); } }).element);
      }
      function addToggle(label, key) {
        body.appendChild(widgets.toggle(doc, { label: label, checked: !!optionState[key], onChange: function (value) { saveSetting(key, value); } }).element);
      }
      function addSelect(label, key, options) {
        var row = doc.createElement('label'); row.className = 'apex-menu-widget';
        var title = doc.createElement('span'); title.className = 'apex-menu-widget-label'; title.textContent = label; row.appendChild(title);
        var select = doc.createElement('select'); select.className = 'apex-menu-control-button'; select.setAttribute('aria-label', label);
        options.forEach(function (option) { var el = doc.createElement('option'); el.value = option.value; el.textContent = option.label; select.appendChild(el); });
        select.value = optionState[key]; select.addEventListener('change', function () { saveSetting(key, select.value); });
        row.appendChild(select); body.appendChild(row);
      }
      if (optionsTab === 'audio') {
        addSlider('Music volume', 'musicVol', 0, 1, 0.01);
        addSlider('Sound effects', 'sfxVol', 0, 1, 0.01);
      } else if (optionsTab === 'video') {
        addSelect('Performance profile', 'performanceTier', [
          { value: 'auto', label: 'Auto' }, { value: 'lite', label: 'Lite' },
          { value: 'standard', label: 'Standard' }, { value: 'ultra', label: 'Ultra' }
        ]);
      } else if (optionsTab === 'controls') {
        var bindings = optionState.bindings || (optionState.bindings = {});
        ['up', 'down', 'select', 'back'].forEach(function (action) {
          var row = widgets.keybind(doc, { label: action.charAt(0).toUpperCase() + action.slice(1), value: bindings[action] || ({ up: 'ArrowUp', down: 'ArrowDown', select: 'Enter', back: 'Escape' })[action] });
          row.onRequestChange(function () { openBindingDialog(action, row); });
          body.appendChild(row.element);
        });
      } else if (optionsTab === 'accessibility') {
        addToggle('Reduce motion', 'reduceMotion');
        addSelect('Colour assistance', 'colorblind', [
          { value: 'none', label: 'Default' }, { value: 'protan', label: 'Protanopia' },
          { value: 'deutan', label: 'Deuteranopia' }, { value: 'tritan', label: 'Tritanopia' }
        ]);
        addSlider('Menu text size', 'textScale', 0.85, 1.4, 0.05);
      } else {
        addSelect('Difficulty', 'difficulty', [
          { value: 'easy', label: 'Easy' }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard' }
        ]);
      }
    }

    function openBindingDialog(action, row) {
      var dialog = widgets.modal(doc, { title: 'Set ' + action + ' key', message: 'Press a key to assign it. Escape cancels.', root: root });
      dialog.open();
      function capture(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); global.removeEventListener('keydown', capture, true); dialog.close(); return; }
        if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return;
        event.preventDefault(); event.stopImmediatePropagation();
        var bindings = Object.assign({}, optionState.bindings || {});
        bindings[action] = event.code || event.key;
        saveSetting('bindings', bindings);
        row.setValue(bindings[action]);
        global.removeEventListener('keydown', capture, true);
        dialog.close();
      }
      global.addEventListener('keydown', capture, true);
      dialog.onClose(function () { global.removeEventListener('keydown', capture, true); });
    }

    function makeButton(label, className, action) {
      var button = doc.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', action);
      return button;
    }

    function render(screen, data) {
      if (destroyed) return;
      currentViewData = data || {};
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      var custom = screens[screen];
      if (typeof custom === 'function') {
        custom({ root: root, panel: panel, screen: screen, data: currentViewData, go: api.go, back: api.back, refresh: api.refresh, config: config });
        focus = createFocusManager(panel);
        focus.first();
        return;
      }

      var kicker = doc.createElement('p');
      kicker.className = 'apex-menu-kicker';
      kicker.textContent = screen === 'main' ? (config.archetype + ' · ' + config.gameId) : config.title;
      panel.appendChild(kicker);
      var heading = doc.createElement('h1');
      heading.className = 'apex-menu-title';
      heading.textContent = screen === 'main' ? config.title : (screen.charAt(0).toUpperCase() + screen.slice(1));
      panel.appendChild(heading);

      if (screen === 'main') {
        if (config.tagline) {
          var tagline = doc.createElement('p');
          tagline.className = 'apex-menu-tagline';
          tagline.textContent = config.tagline;
          panel.appendChild(tagline);
        }
        var actions = doc.createElement('nav');
        actions.className = 'apex-menu-actions';
        actions.setAttribute('aria-label', 'Main menu');
        config.items.forEach(function (item) {
          var id = typeof item === 'string' ? item : item.id;
          var label = (typeof item === 'object' && item.label) || ITEM_LABELS[id];
          var action = typeof item === 'object' && item.action;
          var button = makeButton(label, 'apex-menu-action', function () {
            if (typeof action === 'function') { action({ go: api.go, back: api.back, config: config }); return; }
            if (id === 'play' || id === 'continue') {
              if (sceneController) sceneController.pause();
              if (global.Music && typeof global.Music.stop === 'function') global.Music.stop(0.35);
              hostPaused = false;
              // Clear the ready-screen pause before onPlay resets the game's own
              // paused flag; otherwise adapters can leave the native clock frozen.
              pauseNativeGame(false);
              postHostMessage('MENU_PLAY');
              if (typeof config.onPlay === 'function') config.onPlay({ action: id, config: config });
              if (!destroyed) api.hide();
              return;
            }
            if (id === 'exit') {
              postHostMessage('MENU_EXIT');
              if (typeof config.onExit === 'function') config.onExit();
              return;
            }
            api.go(id);
          });
          button.setAttribute('data-menu-action', id);
          actions.appendChild(button);
        });
        panel.appendChild(actions);
        var caption = doc.createElement('p');
        caption.className = 'apex-menu-caption';
        caption.textContent = 'Use ↑ and ↓ to navigate · Enter to select';
        panel.appendChild(caption);
      } else if (screen === 'pause') {
        var pauseCopy = doc.createElement('p');
        pauseCopy.className = 'apex-menu-tagline';
        pauseCopy.textContent = 'Your progress is safe. Take a breath, then jump back in.';
        panel.appendChild(pauseCopy);
        var pauseActions = doc.createElement('nav');
        pauseActions.className = 'apex-menu-actions';
        pauseActions.setAttribute('aria-label', 'Pause menu');
        [
          { label: 'Resume game', run: function () { api.resume(); } },
          { label: 'Restart game', run: function () { restartNativeGame(); global.ApexGamePaused = false; api.hide(); postHostMessage('MENU_RESUME'); } },
          { label: 'Options', run: function () { api.go('options'); } },
          { label: 'How to play', run: function () { api.go('about'); } },
          { label: 'Exit game', run: function () { postHostMessage('MENU_EXIT'); if (typeof config.onExit === 'function') config.onExit(); } }
        ].forEach(function (item) { pauseActions.appendChild(makeButton(item.label, 'apex-menu-action', item.run)); });
        panel.appendChild(pauseActions);
      } else if (screen === 'options') {
        var backOptions = makeButton('Back', 'apex-menu-back', function () { api.back(); });
        backOptions.setAttribute('data-menu-back', 'true');
        panel.insertBefore(backOptions, kicker);
        renderOptionsContent(panel);
      } else {
        var content = doc.createElement('p');
        content.className = 'apex-menu-tagline';
        content.textContent = currentViewData.message || ('The ' + screen + ' screen is ready to be configured for this game.');
        panel.appendChild(content);
        var back = makeButton('Back', 'apex-menu-back', function () { api.back(); });
        back.setAttribute('data-menu-back', 'true');
        panel.insertBefore(back, kicker);
      }
      focus = createFocusManager(panel);
      suppressFocusSound = true;
      focus.first();
      suppressFocusSound = false;
    }

    router = createRouter('main', render);
    var api = {
      root: root,
      config: config,
      hide: function () {
        if (destroyed) return;
        var returningFromPause = router.current() === 'pause';
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        global.ApexMenuActive = false;
        global.ApexGamePaused = false;
        if (sceneController) sceneController.pause();
        if (pauseButton) {
          pauseButton.hidden = false;
          if (returningFromPause && typeof pauseButton.focus === 'function') pauseButton.focus({ preventScroll: true });
        }
      },
      showPause: function () {
        if (destroyed) return;
        if (THEATER_EMBEDDED) { requestHostPause(); return; }
        root.hidden = false;
        root.removeAttribute('aria-hidden');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', config.title + ' pause menu');
        global.ApexMenuActive = true;
        if (pauseButton) pauseButton.hidden = true;
        router.go('pause');
        if (sceneController) sceneController.resume();
      },
      resume: function () {
        if (destroyed) return;
        if (THEATER_EMBEDDED) { postHostMessage('MENU_RESUME'); return; }
        pauseNativeGame(false);
        if (typeof config.onResume === 'function') config.onResume({ config: config });
        api.hide();
        postHostMessage('MENU_RESUME');
      },
      go: function (screen, data) { return router.go(screen, data); },
      refresh: function (data) { return render(router.current(), data || currentViewData); },
      back: function () { return router.back(); },
      currentScreen: function () { return router.current(); },
      history: function () { return router.history(); },
      getSettings: function () { return Object.assign({}, optionState, { bindings: Object.assign({}, optionState.bindings || {}) }); },
      resumeScene: function () { if (sceneController) sceneController.resume(); },
      focus: function (direction) { return focus ? focus.move(direction) : false; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (gamepadRaf && typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(gamepadRaf);
        gamepadRaf = 0;
        global.removeEventListener('keydown', onMenuKeyDownCapture, true);
        global.removeEventListener('keydown', onGamePauseKeyDown, true);
        global.removeEventListener('message', onHostPauseMessage);
        global.ApexMenuActive = false;
        if (pauseButton && pauseButton.parentNode) pauseButton.parentNode.removeChild(pauseButton);
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('keydown', unlockMenuSound);
        root.removeEventListener('pointerover', onMenuPointerOver);
        root.removeEventListener('focusin', onMenuFocus);
        root.removeEventListener('click', onMenuClick);
        if (sceneController) sceneController.destroy();
        if (global.Music && typeof global.Music.stop === 'function') global.Music.stop(0.12);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };

    function onKeyDown(event) {
      if (destroyed) return;
      unlockMenuSound();
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var active = doc.activeElement, bindings = optionState.bindings || {};
      if (event.key === 'Tab') {
        event.preventDefault();
        if (!root.contains(active)) { if (event.shiftKey) focus.last(); else focus.first(); }
        else focus.move(event.shiftKey ? -1 : 1);
        return;
      }
      if (!root.contains(active)) return;
      var textControl = active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);
      if (textControl && (/^Arrow/.test(event.key) || event.code === 'KeyW' || event.code === 'KeyS')) return;
      function matches(action, fallback) {
        var value = bindings[action] || fallback;
        return event.code === value || event.key.toLowerCase() === String(value).toLowerCase();
      }
      if (matches('down', 'ArrowDown') || matches('right', 'ArrowRight') || !textControl && (event.code === 'KeyS' || event.key.toLowerCase() === 's')) { event.preventDefault(); api.focus(1); }
      else if (matches('up', 'ArrowUp') || matches('left', 'ArrowLeft') || !textControl && (event.code === 'KeyW' || event.key.toLowerCase() === 'w')) { event.preventDefault(); api.focus(-1); }
      else if (matches('back', 'Escape') && api.currentScreen() === 'pause') { event.preventDefault(); event.stopPropagation(); playUiSound('back'); api.resume(); }
      else if (matches('back', 'Escape') && api.currentScreen() !== 'main') { event.preventDefault(); event.stopPropagation(); playUiSound('back'); api.back(); }
      else if (matches('select', 'Enter') && active && active.tagName === 'BUTTON') { event.preventDefault(); active.click(); }
    }

    function onMenuKeyDownCapture(event) {
      if (destroyed || root.hidden) return;
      // Let the active dialog's later capture listeners handle Escape, Tab, and
      // key assignment. stopPropagation still shields the game behind the menu,
      // while allowing the other listeners on this window to run.
      if (root.querySelector('[data-menu-modal="true"]')) {
        event.stopPropagation();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        // Modifier shortcuts should not activate controls in the game under the menu.
        event.stopImmediatePropagation();
        return;
      }
      onKeyDown(event);
      // Keep legacy game handlers from seeing menu navigation or starting play behind the overlay.
      event.stopImmediatePropagation();
    }

    var pauseButton = null;
    if (!THEATER_EMBEDDED) {
      pauseButton = doc.createElement('button');
      pauseButton.type = 'button';
      pauseButton.className = 'apex-pause-trigger';
      pauseButton.setAttribute('aria-label', 'Open pause menu');
      pauseButton.title = 'Pause game (P or Escape)';
      pauseButton.textContent = 'Ⅱ';
      pauseButton.hidden = true;
      pauseButton.addEventListener('click', openPauseMenu);
      doc.body.appendChild(pauseButton);
    }

    function pauseNativeGame(paused) {
      global.ApexGamePaused = !!paused;
      if (typeof config.onPause === 'function') { config.onPause(paused); return; }
      if (global.Arcade && global.Arcade.G && typeof global.Arcade.G.pauseToggle === 'function') {
        var gameState = global.Arcade.G.state;
        if ((paused && gameState === 'playing') || (!paused && gameState === 'paused')) global.Arcade.G.pauseToggle();
        return;
      }
      if (typeof global.ApexPauseGame === 'function') global.ApexPauseGame(paused);
      else if (global.ApexGameMenuActions && typeof global.ApexGameMenuActions.pause === 'function') global.ApexGameMenuActions.pause(!!paused);
      else {
        var nativePause = doc.getElementById('pause') || doc.querySelector('[data-a="pause"]');
        if (nativePause && typeof nativePause.click === 'function') nativePause.click();
      }
      global.dispatchEvent(new global.CustomEvent('apex:game-pause', { detail: { paused: paused, gameId: config.gameId } }));
    }

    function restartNativeGame() {
      if (typeof config.onRestart === 'function') { config.onRestart(); return; }
      if (global.Arcade && global.Arcade.G && typeof global.Arcade.G.restart === 'function') { global.Arcade.G.restart(true); return; }
      if (global.ApexGameMenuActions && typeof global.ApexGameMenuActions.restart === 'function') { global.ApexGameMenuActions.restart(); return; }
      var restartControl = doc.querySelector('[data-a="restart"]') || doc.getElementById('restart') || doc.getElementById('new');
      if (restartControl && typeof restartControl.click === 'function') restartControl.click();
    }

    function requestHostPause() {
      postHostMessage(hostPaused ? 'MENU_RESUME' : 'MENU_PAUSE');
    }

    function openPauseMenu() {
      if (destroyed || !root.hidden) return;
      if (THEATER_EMBEDDED) { requestHostPause(); return; }
      pauseNativeGame(true);
      api.showPause();
      postHostMessage('MENU_PAUSE');
    }

    function onGamePauseKeyDown(event) {
      if (destroyed || !root.hidden || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.code === 'KeyP' || event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (THEATER_EMBEDDED) { requestHostPause(); return; }
        openPauseMenu();
      }
    }

    function onHostPauseMessage(event) {
      if (destroyed || !THEATER_EMBEDDED) return;
      var data = event.data;
      if (!data || data.type !== 'SET_PAUSED') return;
      if (event.source !== global.parent) return;
      if (event.origin && global.location.origin && event.origin !== global.location.origin) return;
      var paused = !!data.paused;
      // The host can request a resume before Play was chosen while the ready
      // menu is still visible; never reveal or unpause a game behind it.
      if (!paused && !root.hidden) return;
      hostPaused = paused;
      pauseNativeGame(paused);
      if (global.Music) {
        if (paused && typeof global.Music.pause === 'function') global.Music.pause();
        else if (!paused && typeof global.Music.resume === 'function') global.Music.resume();
      }
      if (sceneController) {
        if (paused) sceneController.pause();
        else sceneController.resume();
      }
      postHostMessage('PAUSE_STATE', { paused: paused });
    }

    global.addEventListener('message', onHostPauseMessage);

    function gamepadButton(pad, index) { return !!(pad.buttons && pad.buttons[index] && pad.buttons[index].pressed); }
    function adjustGamepadControl(active, direction) {
      if (!active) return false;
      if (active.tagName === 'INPUT' && active.type === 'range') {
        var step = Number(active.step) || 1, min = Number(active.min) || 0, max = Number(active.max) || 1;
        var next = Math.max(min, Math.min(max, Number(active.value) + direction * step));
        if (next === Number(active.value)) return true;
        active.value = String(next);
        active.dispatchEvent(new global.Event('input', { bubbles: true }));
        active.dispatchEvent(new global.Event('change', { bubbles: true }));
        return true;
      }
      if (active.tagName === 'SELECT') {
        var index = active.selectedIndex + direction;
        if (index >= 0 && index < active.options.length) {
          active.selectedIndex = index;
          active.dispatchEvent(new global.Event('change', { bubbles: true }));
        }
        return true;
      }
      return false;
    }
    function pollGamepad() {
      gamepadRaf = 0;
      if (destroyed) return;
      var pads = [], pad = null;
      try { pads = global.navigator && typeof global.navigator.getGamepads === 'function' ? global.navigator.getGamepads() : []; } catch (error) {}
      if (pads) for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
      if (pad && root.contains(doc.activeElement)) {
        var axes = pad.axes || [], horizontal = Number(axes[0]) || 0, vertical = Number(axes[1]) || 0;
        var current = {
          up: gamepadButton(pad, 12) || vertical < -0.55,
          down: gamepadButton(pad, 13) || vertical > 0.55,
          left: gamepadButton(pad, 14) || horizontal < -0.55,
          right: gamepadButton(pad, 15) || horizontal > 0.55,
          select: gamepadButton(pad, 0), back: gamepadButton(pad, 1)
        };
        var active = doc.activeElement;
        var activeModal = root.querySelector('[data-menu-modal="true"]');
        if (!activeModal) {
          if ((current.up && !previousGamepad.up) || (current.left && !previousGamepad.left)) {
            var adjustedLeft = current.left && !current.up && adjustGamepadControl(active, -1);
            if (!adjustedLeft) api.focus(-1);
          } else if ((current.down && !previousGamepad.down) || (current.right && !previousGamepad.right)) {
            var adjustedRight = current.right && !current.down && adjustGamepadControl(active, 1);
            if (!adjustedRight) api.focus(1);
          }
          if (current.select && !previousGamepad.select && active && typeof active.click === 'function') active.click();
          if (!destroyed && current.back && !previousGamepad.back && api.currentScreen() !== 'main') { playUiSound('back'); api.back(); }
        } else if (current.back && !previousGamepad.back) {
          var cancelButton = activeModal.querySelector('button:not([disabled])');
          if (cancelButton) { playUiSound('back'); cancelButton.click(); }
        } else if (current.select && !previousGamepad.select && active && activeModal.contains(active) && typeof active.click === 'function') {
          active.click();
        }
        previousGamepad = current;
      } else previousGamepad = {};
      if (!destroyed && typeof global.requestAnimationFrame === 'function') gamepadRaf = global.requestAnimationFrame(pollGamepad);
    }
    global.addEventListener('keydown', onMenuKeyDownCapture, true);
    global.addEventListener('keydown', onGamePauseKeyDown, true);
    postHostMessage('MENU_OPEN');
    render('main', {});
    // Treat the opening menu as a paused state too; ready Arcade games remain ready,
    // while running legacy pages are suspended through their native pause adapter.
    pauseNativeGame(true);
    if (musicConfig && global.Music && typeof global.Music.play === 'function') global.Music.play(musicConfig);
    if (typeof global.requestAnimationFrame === 'function') gamepadRaf = global.requestAnimationFrame(pollGamepad);
    return api;
  }

  Menu.version = '1.0.0-m1';
  Menu.validate = validate;
  Menu.createRouter = createRouter;
  Menu.createFocusManager = createFocusManager;
  Menu.mount = mount;
  var widgets = (Menu.widgets = Menu.widgets || {});
  var modalCount = 0;

  widgets.slider = function (doc, options) {
    options = options || {};
    var row = doc.createElement('div'); row.className = 'apex-menu-widget';
    var id = 'apex-menu-slider-' + (++modalCount);
    var label = doc.createElement('label'); label.className = 'apex-menu-widget-label'; label.htmlFor = id; label.textContent = options.label || 'Value'; row.appendChild(label);
    var control = doc.createElement('div'); control.className = 'apex-menu-widget-control';
    var input = doc.createElement('input'); input.type = 'range'; input.id = id;
    input.min = options.min == null ? 0 : options.min; input.max = options.max == null ? 1 : options.max; input.step = options.step == null ? 0.01 : options.step;
    input.value = options.value == null ? input.min : options.value;
    var output = doc.createElement('output'); output.htmlFor = id;
    function updateOutput() { output.value = Math.round(Number(input.value) * 100) + '%'; output.textContent = output.value; }
    input.addEventListener('input', updateOutput);
    input.addEventListener('change', function () { if (typeof options.onChange === 'function') options.onChange(Number(input.value)); });
    updateOutput(); control.appendChild(input); control.appendChild(output); row.appendChild(control);
    return { element: row, input: input, setValue: function (value) { input.value = value; updateOutput(); } };
  };

  widgets.toggle = function (doc, options) {
    options = options || {};
    var row = doc.createElement('label'); row.className = 'apex-menu-widget';
    var text = doc.createElement('span'); text.className = 'apex-menu-widget-label'; text.textContent = options.label || 'Enabled'; row.appendChild(text);
    var input = doc.createElement('input'); input.className = 'apex-menu-widget-control'; input.type = 'checkbox'; input.checked = !!options.checked;
    input.setAttribute('role', 'switch'); input.setAttribute('aria-label', options.label || 'Enabled');
    input.addEventListener('change', function () { if (typeof options.onChange === 'function') options.onChange(input.checked); });
    row.appendChild(input);
    return { element: row, input: input, setValue: function (value) { input.checked = !!value; } };
  };

  widgets.keybind = function (doc, options) {
    options = options || {};
    var row = doc.createElement('div'); row.className = 'apex-menu-widget';
    var label = doc.createElement('span'); label.className = 'apex-menu-widget-label'; label.textContent = options.label || 'Key'; row.appendChild(label);
    var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-control-button';
    button.setAttribute('aria-label', (options.label || 'Key') + ' binding'); button.textContent = options.value || 'Unassigned'; row.appendChild(button);
    var request = function () {};
    button.addEventListener('click', function () { request(); });
    return {
      element: row, button: button,
      setValue: function (value) { button.textContent = value || 'Unassigned'; },
      onRequestChange: function (callback) { request = typeof callback === 'function' ? callback : function () {}; }
    };
  };

  widgets.tabs = function (doc, options) {
    options = options || {};
    var tabs = Array.isArray(options.items) ? options.items.slice() : [];
    var active = options.active || (tabs[0] && tabs[0].id) || '';
    var nav = doc.createElement('div'); nav.className = 'apex-menu-tabs'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', options.label || 'Sections');
    var buttons = [];
    function select(id, notify) {
      if (!tabs.some(function (item) { return item.id === id; })) return false;
      active = id;
      buttons.forEach(function (button) {
        var selected = button.getAttribute('data-tab-id') === active;
        button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      });
      if (notify && typeof options.onChange === 'function') options.onChange(active);
      return true;
    }
    tabs.forEach(function (item, index) {
      var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-tab';
      button.id = 'apex-menu-tab-' + (++modalCount); button.setAttribute('role', 'tab'); button.setAttribute('data-tab-id', item.id); button.textContent = item.label || item.id;
      button.addEventListener('click', function () { select(item.id, true); });
      button.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else return;
        event.preventDefault(); event.stopPropagation(); select(tabs[next].id, true); buttons[next].focus();
      });
      buttons.push(button); nav.appendChild(button);
    });
    select(active, false);
    return {
      element: nav,
      setPanelId: function (id) {
        buttons.forEach(function (button) { button.setAttribute('aria-controls', id); });
        var panel = doc.getElementById(id), selected = buttons.filter(function (button) { return button.getAttribute('data-tab-id') === active; })[0];
        if (panel && selected) panel.setAttribute('aria-labelledby', selected.id);
      },
      setActive: function (id) { return select(id, false); },
      getActive: function () { return active; }
    };
  };

  widgets.modal = function (doc, options) {
    options = options || {};
    var backdrop = doc.createElement('div'); backdrop.className = 'apex-menu-modal-backdrop';
    backdrop.setAttribute('data-menu-modal', 'true');
    var dialog = doc.createElement('section'); dialog.className = 'apex-menu-modal'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    var heading = doc.createElement('h2'); heading.id = 'apex-menu-modal-title-' + (++modalCount); heading.textContent = options.title || 'Dialog'; dialog.setAttribute('aria-labelledby', heading.id); dialog.appendChild(heading);
    if (options.message) { var message = doc.createElement('p'); message.textContent = options.message; dialog.appendChild(message); }
    var actions = doc.createElement('div'); actions.className = 'apex-menu-options-actions';
    var closeButton = doc.createElement('button'); closeButton.type = 'button'; closeButton.className = 'apex-menu-control-button'; closeButton.textContent = options.closeLabel || 'Cancel'; actions.appendChild(closeButton); dialog.appendChild(actions); backdrop.appendChild(dialog);
    var restoreFocus = null, closed = true, closeCallbacks = [];
    function close() {
      if (closed) return; closed = true;
      global.removeEventListener('keydown', onKeyDown, true);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      closeCallbacks.slice().forEach(function (callback) { callback(); });
      if (restoreFocus && restoreFocus.focus) restoreFocus.focus();
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      var controls = Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close(); });
    closeButton.addEventListener('click', close);
    function open() {
      if (!closed) return; closed = false; restoreFocus = doc.activeElement;
      global.addEventListener('keydown', onKeyDown, true);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      (options.root || doc.body).appendChild(backdrop);
      closeButton.focus();
    }
    return {
      element: backdrop, open: open, close: function () { close(); },
      onClose: function (callback) { if (typeof callback === 'function') closeCallbacks.push(callback); }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
