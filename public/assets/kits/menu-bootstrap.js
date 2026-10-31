/* Per-title menu identities for the M3–M7 rollout. Shared layout, settings,
   focus and input shielding stay in menu-kit.js; this file supplies identity. */
(function (global) {
  'use strict';
  var rows = [
    ['02-pong','ion-rally','Ion Rally','neon','#38bdf8','comet','Race a comet through the Ion City arena.','W/S moves; arrows control player two in local play.'],
    ['12-chrono-adventure','clockwork-dawn','Clockwork Dawn','banner','#fbbf24','sunwheel','Carry the party beyond the last dark hour.','Arrows or WASD move; Space, Enter, or Z confirms; X or Escape opens status.'],
    ['04-space-invaders','hivefall-defense','Hivefall Defense','machine','#fbbf24','hive','Hold the line against the descending swarm.','A/D or Left/Right aims; hold Space to fire.'],
    ['05-tetris','prism-stack','Prism Stack','glass','#c4b5fd','prism','Fit each falling shape into the shifting stack.','Left/Right moves; Up rotates; Down drops faster; Space hard-drops.'],
    ['06-pac-man','glow-beetle','Glow Beetle','crt','#a3e635','beetle','Light every corridor and outpace the sentries.','Arrow keys or WASD move through the maze.'],
    ['07-asteroids','starfall-rift','Starfall Rift','neon','#a78bfa','asteroid','Thread the rift and survive the debris field.','Arrow keys steer; Space fires; Shift boosts.'],
    ['08-mario','fox-courier','Fox Courier','storybook','#fb923c','parcel','Carry the last parcel across three lively routes.','Arrows or A/D move; Space jumps; stomp enemies and reach each flag.'],
    ['09-mario-world','cloudhop-pip','Cloudhop Pip','storybook','#67e8f9','cloud','Hop between drifting clouds and find the safe route.','Arrows or A/D move; Space jumps; use springs to reach high paths.'],
    ['10-sonic','rollo-rush','Rollo Rush','crt','#facc15','wheel','Build speed and keep your momentum through the course.','Arrows move; Space jumps; avoid hazards and keep your speed.'],
    ['11-street-fighter','iron-circuit','Iron Circuit','machine','#22d3ee','gauntlet','Enter the circuit and outlast every challenger.','A/D move; W jumps; S crouches; J/K punch; U/I kick.'],
    ['13-castlevania','lanternbound','Lanternbound','banner','#f59e0b','lantern','Carry a small light through the haunted crypt.','A/D walk; Space jumps; X/J whips; C/K throws an axe.'],
    ['14-metroid','deepcore-drifter','Deepcore Drifter','machine','#22d3ee','scanner','Read the cave, find the route, and push deeper.','Arrows or WASD move; Space jumps; X fires.'],
    ['15-hollow-knight','hollowbell','Hollowbell','banner','#d6a56f','bell','Follow the bell through a quiet, misted world.','Arrows or A/D move; Space jumps; X attacks.'],
    ['16-celeste','skyfall-ridge','Skyfall Ridge','glass','#7dd3fc','mountain','Climb one bright ridge, one dash at a time.','Arrows or WASD move; Space jumps; Shift dashes.'],
    ['17-cuphead','stormcap-showdown','Stormcap Showdown','neon','#fde047','storm','Read the storm and strike when the opening appears.','Arrows move; Space jumps; Z fires; X dashes.'],
    ['18-dead-cells','ashen-descent','Ashen Descent','banner','#fb7185','ember','Descend through the ash and survive the next room.','Arrows or WASD move; Space jumps; J attacks; K dodges.'],
    ['19-ori','lumen-sprite','Lumen Sprite','glass','#f0abfc','spirit','Find the soft light hidden beyond the forest.','Arrows or WASD move; Space jumps; X interacts.'],
    ['20-rayman','glimmer-gadabout','Glimmer Gadabout','storybook','#f472b6','lute','Follow the rhythm through a paper-bright adventure.','Arrows or A/D move; Space jumps; X acts.'],
    ['21-chess','chess','Chess','table','#d6b98c','chess','Plan the next move across a warm walnut board.','Click or tap a piece, then choose a legal square.'],
    ['22-snakes-ladders','snakes-ladders','Snakes & Ladders','storybook','#fb923c','track','Roll forward and see where the board takes you.','Click or tap Roll; pass the device for local turns.'],
    ['23-ludo','ludo','Ludo','table','#f472b6','dice','Bring every piece home before the other colours do.','Choose a piece after rolling; local players share the device.'],
    ['24-carrom','carrom','Carrom','table','#d6b98c','striker','Line up the striker and pocket your colour.','Drag back from the striker and release to shoot.'],
    ['25-tycoon-town','tycoon-town','Tycoon Town','table','#4ade80','town','Build a careful route through the town market.','Click or tap a property to view its action.'],
    ['26-checkers','checkers','Checkers','table','#ef4444','checkers','Take the diagonal route and crown your last piece.','Select a piece, then select a legal diagonal square.'],
    ['27-connect-four','connect-four','Connect Four','table','#facc15','connect','Drop four in a row before the other side does.','Click or tap a column to drop a counter.'],
    ['28-mancala','mancala','Mancala','table','#a3e635','seeds','Count the seeds and plan the next turn.','Click or tap one of your bowls to move its seeds.'],
    ['29-reversi','reversi','Reversi','glass','#86efac','discs','Claim the corners and turn the board your way.','Click or tap a legal square to place a disc.'],
    ['31-backgammon','backgammon','Backgammon','table','#d6b98c','points','Use the roll to move every checker home.','Roll, then select a checker and one legal point.'],
    ['32-dots-boxes','dots-boxes','Dots & Boxes','paper','#60a5fa','graph','Draw the last side and claim the square.','Click or tap a line between two adjacent dots.'],
    ['33-go','go','Go 9×9','paper','#e5e7eb','stones','Place stones, shape territory, and read the whole board.','Click or tap an empty intersection to place a stone.'],
    ['34-solitaire','solitaire','Solitaire','cards','#34d399','solitaire','Clear the tableau by building each suit in order.','Click or tap cards and piles; double-click sends a card up.'],
    ['35-memory-match','memory-match','Memory Match','cards','#f0abfc','memory','Turn over pairs and remember where each symbol waits.','Click or tap two cards to reveal a pair.'],
    ['36-maths-dash','maths-dash','Maths Dash','paper','#f97316','equation','Solve the prompt before the clock reaches zero.','Use number keys and Enter, or tap the answer buttons.'],
    ['37-pool','pool','8-Ball Pool','table','#34d399','pool','Pocket your group, then sink the 8-ball.','Drag back and release to shoot; click to place the cue ball after a foul.'],
    ['38-bowling','bowling','Bowling','scoreboard','#fb7185','pins','Find your line and clear the lane.','Drag or use the on-screen controls to set direction and power.'],
    ['39-basketball','basketball','Basketball Hoops','scoreboard','#fb923c','basketball','Set the arc, time the release, and beat the clock.','Drag to aim and release to shoot.'],
    ['40-mini-golf','mini-golf','Mini Golf','storybook','#4ade80','golf','Read the slope and find the clean line to the cup.','Drag back from the ball and release to putt.'],
    ['41-soccer-pool','soccer-pool','Soccer Pool','scoreboard','#38bdf8','soccer','Clear your balls, then finish with the eight.','Drag back and release to shoot; click to place after a foul.'],
    ['43-sudoku','sudoku','Sudoku','paper','#38bdf8','sudoku','Fill the grid with one of every digit in each line.','Select a cell, then tap or type 1–9; Backspace erases.'],
    ['44-minesweeper','minesweeper','Minefield','crt','#fbbf24','mine','Read the clues and mark every hidden mine.','Click to reveal; right-click or long-press to flag.'],
    ['45-sliding-puzzle','sliding-puzzle','Slide Tiles','glass','#93c5fd','tiles','Put the picture back together one open space at a time.','Click or tap a tile next to the empty space.'],
    ['46-nuts-bolts','nuts-bolts','Nuts & Bolts','machine','#cbd5e1','bolts','Sort every coloured nut onto its matching bolt.','Click a bolt to lift its top nut, then choose a destination.'],
    ['47-colour-sort','colour-sort','Bubble Sort','glass','#22d3ee','tubes','Pour each colour until every tube holds one shade.','Click a source tube, then an available destination.'],
    ['48-fruit-merge','fruit-merge','Orchard Drop','storybook','#fb7185','fruit','Drop matching fruit and let the orchard grow.','Move to aim; click or tap to drop the fruit.'],
    ['49-table-tennis','table-tennis','Table Tennis','scoreboard','#38bdf8','rally','Meet the ball early and return it across the table.','Move the paddle with the pointer or touch; keyboard arrows also work.'],
    ['50-mahjong','mahjong','Jade Table','table','#34d399','mahjong','Clear matching free tiles from the jade table.','Select two matching free tiles to remove them.']
  ];
  var byFile = Object.create(null);
  rows.forEach(function (row) { byFile[row[0]] = { id: row[1], title: row[2], archetype: row[3], accent: row[4], motif: row[5], tagline: row[6], controls: row[7] }; });

  function drawMotif(ctx, frame, id, motif, accent) {
    var w = frame.width, h = frame.height, x = w * 0.77, y = h * 0.5, r = Math.min(w, h) * 0.2;
    var moving = !frame.static && !frame.reducedMotion, phase = moving ? frame.time * 0.00025 : 0;
    ctx.fillStyle = '#080d15'; ctx.fillRect(0, 0, w, h);
    var atmosphere = ctx.createRadialGradient(w * 0.78, h * 0.46, 0, w * 0.78, h * 0.46, Math.max(w, h) * 0.7);
    atmosphere.addColorStop(0, accent); atmosphere.addColorStop(1, 'rgba(8,13,21,0)');
    ctx.globalAlpha = 0.2; ctx.fillStyle = atmosphere; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
    for (var band = 0; band < 5; band++) { var by = h * (0.52 + band * 0.1); ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(w, by); ctx.stroke(); }
    ctx.save(); ctx.translate(x, y); ctx.rotate(phase); ctx.globalAlpha = 0.82;
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = Math.max(2, r * 0.045); ctx.shadowColor = accent; ctx.shadowBlur = frame.quality.glow ? 22 : 4;
    function circle(radius, fill) { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
    function cog(teeth) { ctx.beginPath(); for (var i = 0; i < teeth * 2; i++) { var a = i * Math.PI / teeth, rr = r * (i % 2 ? .82 : 1); if (!i) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.stroke(); circle(r * .22, false); }
    if (motif === 'gear' || motif === 'chess' || motif === 'mahjong') cog(motif === 'gear' ? 12 : 8);
    else if (motif === 'basketball' || motif === 'fruit') { circle(r * .65, false); ctx.beginPath(); ctx.moveTo(-r * .65, 0); ctx.lineTo(r * .65, 0); ctx.moveTo(0, -r * .65); ctx.lineTo(0, r * .65); ctx.stroke(); }
    else if (motif === 'mountain' || motif === 'crystal' || motif === 'prism') { ctx.beginPath(); ctx.moveTo(-r, r * .65); ctx.lineTo(-r * .25, -r * .7); ctx.lineTo(r * .08, r * .15); ctx.lineTo(r * .5, -r); ctx.lineTo(r, r * .65); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * .25, -r * .7); ctx.lineTo(-r * .18, r * .63); ctx.lineTo(r * .08, r * .15); ctx.stroke(); }
    else if (motif === 'cloud' || motif === 'storm') { ctx.beginPath(); ctx.moveTo(-r, r * .2); ctx.quadraticCurveTo(-r * .7, -r * .6, -r * .15, -r * .2); ctx.quadraticCurveTo(r * .1, -r, r * .38, -r * .3); ctx.quadraticCurveTo(r, -r * .2, r, r * .3); ctx.lineTo(-r, r * .3); ctx.stroke(); }
    else if (motif === 'snake' || motif === 'lantern' || motif === 'lute' || motif === 'parcel') { ctx.beginPath(); ctx.moveTo(-r, r * .4); ctx.bezierCurveTo(-r * 1.2, -r, r * .8, -r, r * .45, 0); ctx.bezierCurveTo(r * .1, r * .9, -r * .55, r * .5, -r * .3, -r * .1); ctx.stroke(); circle(r * .08, true); }
    else if (motif === 'comet') { ctx.beginPath(); ctx.moveTo(-r, -r * .45); ctx.lineTo(r * .15, 0); ctx.moveTo(-r, r * .15); ctx.lineTo(r * .12, r * .05); ctx.moveTo(-r * .75, r * .62); ctx.lineTo(r * .18, r * .1); ctx.stroke(); circle(r * .25, true); }
    else if (motif === 'bell') { ctx.beginPath(); ctx.moveTo(-r * .7, r * .45); ctx.quadraticCurveTo(-r * .52, -r * .02, -r * .38, -r * .4); ctx.quadraticCurveTo(0, -r, r * .38, -r * .4); ctx.quadraticCurveTo(r * .52, -r * .02, r * .7, r * .45); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * .85, r * .48); ctx.lineTo(r * .85, r * .48); ctx.stroke(); circle(r * .11, true); }
    else if (motif === 'ember') { ctx.beginPath(); ctx.moveTo(0, r); ctx.bezierCurveTo(-r, r * .35, -r * .3, 0, 0, -r); ctx.bezierCurveTo(r * .1, -r * .25, r, -r * .05, r * .65, r * .55); ctx.quadraticCurveTo(r * .3, r, 0, r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, r * .62); ctx.quadraticCurveTo(-r * .25, r * .12, r * .2, -r * .18); ctx.quadraticCurveTo(r * .6, r * .3, 0, r * .62); ctx.stroke(); }
    else if (motif === 'spirit') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r, -r * .25, r * .55, r * .85, 0, r * .58); ctx.bezierCurveTo(-r * .55, r * .85, -r, -r * .25, 0, -r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * .5, 0); ctx.lineTo(-r * .12, r * .08); ctx.moveTo(r * .5, 0); ctx.lineTo(r * .12, r * .08); ctx.stroke(); }
    else if (motif === 'scanner') { circle(r * .78, false); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(phase * 8) * r * .72, Math.sin(phase * 8) * r * .72); ctx.stroke(); circle(r * .08, true); }
    else if (motif === 'gauntlet') { ctx.beginPath(); ctx.moveTo(-r * .7, r * .65); ctx.lineTo(-r * .56, -r * .45); ctx.lineTo(-r * .28, -r * .45); ctx.lineTo(-r * .2, -r); ctx.lineTo(r * .04, -r); ctx.lineTo(r * .12, -r * .48); ctx.lineTo(r * .28, -r * .82); ctx.lineTo(r * .5, -r * .72); ctx.lineTo(r * .44, -r * .35); ctx.lineTo(r * .72, -r * .5); ctx.lineTo(r * .78, -r * .23); ctx.lineTo(r * .53, r * .56); ctx.closePath(); ctx.stroke(); }
    else if (motif === 'grid' || motif === 'sudoku' || motif === 'tiles' || motif === 'checkers' || motif === 'connect' || motif === 'graph') { ctx.beginPath(); for (var g = -1; g <= 1; g++) { ctx.moveTo(g * r * .35, -r); ctx.lineTo(g * r * .35, r); ctx.moveTo(-r, g * r * .35); ctx.lineTo(r, g * r * .35); } ctx.stroke(); }
    else if (motif === 'wave' || motif === 'rally' || motif === 'soccer' || motif === 'pool' || motif === 'golf') { for (var q = 0; q < 3; q++) { ctx.beginPath(); for (var a2 = -r; a2 <= r; a2 += 4) { var b2 = Math.sin(a2 / r * 3 + q + phase * 5) * r * .15 + (q - 1) * r * .3; if (a2 === -r) ctx.moveTo(a2, b2); else ctx.lineTo(a2, b2); } ctx.stroke(); } }
    else if (motif === 'card' || motif === 'memory' || motif === 'solitaire') { for (var card = 0; card < 3; card++) { ctx.save(); ctx.rotate((card - 1) * .2); ctx.strokeRect(-r * .38 + card * 4, -r * .58, r * .76, r * 1.16); ctx.restore(); } }
    else if (motif === 'discs' || motif === 'seeds' || motif === 'striker' || motif === 'dice' || motif === 'pins') { for (var p = 0; p < 7; p++) { var px = ((p % 3) - 1) * r * .48, py = (Math.floor(p / 3) - 1) * r * .43; ctx.beginPath(); ctx.arc(px, py, r * (p === 3 ? .2 : .13), 0, Math.PI * 2); p % 2 ? ctx.stroke() : ctx.fill(); } }
    else if (motif === 'beetle' || motif === 'asteroid' || motif === 'wheel' || motif === 'bowling') { circle(r * .72, false); for (var ray = 0; ray < 8; ray++) { var ra = ray * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(ra) * r * .72, Math.sin(ra) * r * .72); ctx.lineTo(Math.cos(ra) * r, Math.sin(ra) * r); ctx.stroke(); } }
    else if (motif === 'hive' || motif === 'tubes' || motif === 'bolts' || motif === 'mine') { for (var hx = -1; hx <= 1; hx++) for (var hy = -1; hy <= 1; hy++) { var xx = hx * r * .54, yy = hy * r * .48; ctx.beginPath(); for (var k = 0; k < 6; k++) { var ha = Math.PI / 3 * k; var vx = xx + Math.cos(ha) * r * .28, vy = yy + Math.sin(ha) * r * .28; if (!k) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy); } ctx.closePath(); ctx.stroke(); } }
    else if (motif === 'points') { for (var pt = -1; pt <= 1; pt++) { ctx.beginPath(); ctx.moveTo(pt * r * .52 - r * .18, -r * .64); ctx.lineTo(pt * r * .52 + r * .18, -r * .64); ctx.lineTo(pt * r * .52, r * .64); ctx.closePath(); ctx.stroke(); } }
    else if (motif === 'stones' || motif === 'seeds' || motif === 'discs' || motif === 'striker' || motif === 'dice' || motif === 'pins') { for (var p = 0; p < 7; p++) { var px = ((p % 3) - 1) * r * .48, py = (Math.floor(p / 3) - 1) * r * .43; ctx.beginPath(); ctx.arc(px, py, r * (p === 3 ? .2 : .13), 0, Math.PI * 2); p % 2 ? ctx.stroke() : ctx.fill(); } }
    else if (motif === 'equation') { ctx.font = '800 ' + (r * .9) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('÷', -r * .48, 0); ctx.fillText('×', r * .48, 0); ctx.fillText('=', 0, r * .55); }
    else if (motif === 'town' || motif === 'track') { ctx.strokeRect(-r, -r * .35, r * .65, r * .9); ctx.strokeRect(-r * .18, -r * .78, r * .55, r * 1.3); ctx.strokeRect(r * .5, -r * .12, r * .5, r * .65); }
    else { cog(9); }
    ctx.restore();
    var dots = Math.min(frame.quality.particles, 24), seed = 0; for (var n = 0; n < id.length; n++) seed = (seed * 31 + id.charCodeAt(n)) >>> 0;
    for (var i2 = 0; i2 < dots; i2++) { var sx = ((seed + i2 * 137) % 997) / 997 * w, sy = ((seed * 7 + i2 * 193 + (moving ? frame.time * .006 : 0)) % 991) / 991 * h; ctx.globalAlpha = moving ? .16 + Math.abs(Math.sin(frame.time * .001 + i2)) * .2 : .22; ctx.fillStyle = accent; ctx.fillRect(sx, sy, 2, 2); }
    ctx.globalAlpha = 1;
  }

  function mount() {
    var parts = global.location.pathname.split('/').filter(Boolean);
        var last = decodeURIComponent(parts[parts.length - 1] || '');
        var folder = decodeURIComponent(parts[parts.length - (last === 'index.html' ? 2 : 1)] || '');
        var item = byFile[folder] || byFile[last];
    if (!item || !global.Menu || global.document.querySelector('.apex-menu-root')) return;
    var title = item.title, game = global.Arcade && global.Arcade.G;
    var gameUi = game && game.ui, uiConfig = gameUi && gameUi.config;
    var menuGameId = uiConfig && uiConfig.id || item.id;
    if (game) game.inputLocked = true;
    item.scene = item.id === 'clockwork-dawn' && typeof global.ClockworkDawnMenuScene === 'function' ? global.ClockworkDawnMenuScene : function (ctx, frame) { drawMotif(ctx, frame, item.id, item.motif, item.accent); };
    var menu;
    menu = global.Menu.mount({
      gameId: menuGameId, title: title, tagline: item.tagline, archetype: item.archetype,
      items: gameUi ? ['play', 'modes', 'customize', 'options', 'more', 'exit'] : ['play', 'options', 'about', 'exit'],
      theme: {
        frame: item.motif + '-frame', button: item.motif + '-banner',
        palette: { bg: 'color-mix(in srgb, ' + item.accent + ' 12%, #080d15)', panel: 'color-mix(in srgb, ' + item.accent + ' 8%, rgba(15,22,35,.94))', accent: item.accent, button: 'color-mix(in srgb, ' + item.accent + ' 76%, white)', buttonText: '#10151e', text: '#f6f7fb', danger: '#fb7185' },
        type: { title: 'system-ui, sans-serif', body: 'system-ui, sans-serif' },
        scene: item.scene, sceneFallback: item.scene,
        music: { tempo: 68 + item.id.length * 3, root: 36 + item.id.length % 12, scale: item.id === 'clockwork-dawn' ? 'dorian' : item.archetype === 'storybook' || item.archetype === 'table' ? 'major' : 'minor', layers: ['bass', 'pad', 'lead'] },
        sfx: { hover: 'tick', select: 'select', back: 'blip' }
      },
      screens: { modes: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'), copy = doc.createElement('p');
        heading.className = 'apex-menu-title'; heading.textContent = 'Choose a mode'; view.panel.appendChild(heading);
        copy.className = 'apex-menu-tagline'; copy.textContent = 'Choose how this run will play. Your selection is saved for next time.'; view.panel.appendChild(copy);
        (uiConfig.modes || []).forEach(function (mode) {
          var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-action';
          var save = global.Save && global.Save.load ? global.Save.load(uiConfig.id) : {}, required = mode.requires;
          var locked = !!(required && !(Number(save.stats && save.stats[required.stat]) >= Number(required.gte || 1)));
          button.textContent = (gameUi.getMode() === mode.id ? '✓  ' : '') + mode.name + (mode.blurb ? ' · ' + mode.blurb : '') + (locked ? ' · Complete Story to unlock' : '');
          button.disabled = !!locked;
          if (!locked) button.addEventListener('click', function () { gameUi.setMode(mode.id); view.refresh(); }); view.panel.appendChild(button);
        });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, customize: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'); heading.className = 'apex-menu-title'; heading.textContent = 'Customize'; view.panel.appendChild(heading);
        var cosmetics = global.Meta && global.Meta.getCosmetics ? global.Meta.getCosmetics(uiConfig.id) : [];
        var wallet = global.Meta && global.Meta.read ? global.Meta.read().sparks : 0, balance = doc.createElement('p'); balance.className = 'apex-menu-tagline'; balance.textContent = 'Sparks: ' + wallet + ' · Owned items are saved on this device.'; view.panel.appendChild(balance);
        cosmetics.forEach(function (item) {
          var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-action';
          button.textContent = item.name + ' · ' + (item.equipped ? 'Equipped' : item.owned ? 'Equip' : item.cost + ' Sparks');
          button.disabled = item.equipped || (!item.owned && wallet < item.cost);
          button.addEventListener('click', function () {
            var result = item.owned ? global.Meta.equipCosmetic(uiConfig.id, item.id) : global.Meta.purchaseCosmetic(uiConfig.id, item.id);
            if (result && result.ok && item.owned && uiConfig.hooks && uiConfig.hooks.applyCosmetic) uiConfig.hooks.applyCosmetic(item.slot, item.id);
            view.refresh();
          }); view.panel.appendChild(button);
        });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, more: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'), copy = doc.createElement('p');
        heading.className = 'apex-menu-title'; heading.textContent = 'More'; view.panel.appendChild(heading);
        copy.className = 'apex-menu-tagline'; copy.textContent = 'Guides, achievements, and your records.'; view.panel.appendChild(copy);
        var entries = [
          { id: 'tutorial', label: 'Tutorial' }, { id: 'about', label: 'How to play' },
          { id: 'achievements', label: 'Achievements' }, { id: 'stats', label: 'Stats' }, { id: 'seasons', label: 'Weekly season boards' }
        ];
        if (uiConfig.mutators && uiConfig.mutators.length) entries.push({ id: 'mutators', label: 'Mutators' });
        entries.forEach(function (entry) { var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-action'; button.textContent = entry.label; button.addEventListener('click', function () { view.go(entry.id); }); view.panel.appendChild(button); });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, achievements: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'), saved = global.Save && global.Save.load ? global.Save.load(uiConfig.id) : {};
        var earned = Array.isArray(saved.achievements) ? saved.achievements : [];
        heading.className = 'apex-menu-title'; heading.textContent = 'Achievements'; view.panel.appendChild(heading);
        (uiConfig.achievements || []).forEach(function (achievement) { var row = doc.createElement('p'); row.className = 'apex-menu-tagline'; row.textContent = (earned.indexOf(achievement.id) >= 0 ? '✓ ' : '◇ ') + achievement.name + ' · ' + achievement.desc; view.panel.appendChild(row); });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, tutorial: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'); heading.className = 'apex-menu-title'; heading.textContent = 'Tutorial'; view.panel.appendChild(heading);
        var steps = uiConfig.tutorial && Array.isArray(uiConfig.tutorial.steps) ? uiConfig.tutorial.steps : [];
        steps.forEach(function (step, index) { var row = doc.createElement('p'); row.className = 'apex-menu-tagline'; row.textContent = (index + 1) + '. ' + (step.text || 'Follow the game controls shown on screen.') + (step.hold ? '  Input: ' + step.hold : ''); view.panel.appendChild(row); });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, stats: function (view) {
        var doc = view.panel.ownerDocument, saved = global.Save && global.Save.load ? global.Save.load(uiConfig.id) : {}, heading = doc.createElement('h1'), body = doc.createElement('p');
        heading.className = 'apex-menu-title'; heading.textContent = 'Game stats'; view.panel.appendChild(heading);
        body.className = 'apex-menu-tagline'; body.textContent = 'Best score: ' + Number(saved.stats && saved.stats.bestScore || saved.bestScore || 0) + ' · Plays: ' + Number(saved.stats && saved.stats.plays || saved.plays || 0); view.panel.appendChild(body);
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, seasons: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'); heading.className = 'apex-menu-title'; heading.textContent = 'Weekly season boards'; view.panel.appendChild(heading);
        (uiConfig.modes || []).forEach(function (mode) {
          var board = global.Meta && typeof global.Meta.getSeasonLeaderboard === 'function' ? global.Meta.getSeasonLeaderboard(uiConfig.id, mode.id) : { week: '', entries: [] };
          var line = doc.createElement('p'); line.className = 'apex-menu-tagline';
          line.textContent = mode.name + ' · ' + board.week + ' · Device-local · Best ' + board.best + (board.trophy ? ' · ' + board.trophy + ' trophy' : ''); view.panel.appendChild(line);
          if (board.entries.length) board.entries.forEach(function (entry, index) { var row = doc.createElement('p'); row.className = 'apex-menu-caption'; row.textContent = (index + 1) + '. ' + entry.score + ' points'; view.panel.appendChild(row); });
          else { var empty = doc.createElement('p'); empty.className = 'apex-menu-caption'; empty.textContent = 'No scores this week yet.'; view.panel.appendChild(empty); }
        });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, mutators: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'); heading.className = 'apex-menu-title'; heading.textContent = 'Mutators'; view.panel.appendChild(heading);
        var options = [{ id: 'none', name: 'Standard rules', multiplier: 1 }].concat(uiConfig.mutators || []);
        options.forEach(function (entry) { var button = doc.createElement('button'); button.type = 'button'; button.className = 'apex-menu-action'; button.textContent = (gameUi.getMutator() === entry.id ? '✓  ' : '') + entry.name + ' · ×' + (Number(entry.multiplier) || 1) + (entry.blurb ? ' · ' + entry.blurb : ''); button.addEventListener('click', function () { gameUi.setMutator(entry.id); view.refresh(); }); view.panel.appendChild(button); });
        var back = doc.createElement('button'); back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      }, about: function (view) {
        var doc = view.panel.ownerDocument, heading = doc.createElement('h1'), goal = doc.createElement('p'), controls = doc.createElement('p'), back = doc.createElement('button');
        heading.className = 'apex-menu-title'; heading.textContent = 'How to play'; view.panel.appendChild(heading);
        goal.className = 'apex-menu-tagline'; goal.textContent = item.tagline; view.panel.appendChild(goal);
        controls.className = 'apex-menu-tagline'; controls.textContent = 'Controls: ' + item.controls; view.panel.appendChild(controls);
        back.type = 'button'; back.className = 'apex-menu-back'; back.dataset.menuBack = 'true'; back.textContent = 'Back'; back.addEventListener('click', view.back); view.panel.appendChild(back);
      } },
      onSettingChange: function (key, value) {
        if (gameUi && uiConfig.hooks && typeof uiConfig.hooks.applySetting === 'function') uiConfig.hooks.applySetting(key, value);
        if (key === 'difficulty') global.postMessage({ type: 'SET_DIFFICULTY', difficulty: value }, global.location.origin);
        if (key === 'sfxVol' && global.Arcade) global.Arcade.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
      },
      onPlay: function () {
        if (game) {
          game.inputLocked = false;
          if (game.ui && typeof game.ui.start === 'function') game.ui.start();
          else if (game.state === 'ready' && typeof game.begin === 'function') game.begin();
        } else if (global.ApexGameMenuActions && typeof global.ApexGameMenuActions.play === 'function') global.ApexGameMenuActions.play();
      },
      onRestart: function () {
        if (game && typeof game.restart === 'function') game.restart(true);
        else if (global.ApexGameMenuActions && typeof global.ApexGameMenuActions.restart === 'function') global.ApexGameMenuActions.restart();
        else {
          var restart = doc.querySelector('[data-a="restart"]') || doc.getElementById('restart') || doc.getElementById('new');
          if (restart && typeof restart.click === 'function') restart.click();
        }
      },
      onResume: function () {
        if (typeof global.ApexPauseGame === 'function') { global.ApexPauseGame(false); return; }
        if (game && game.state === 'paused' && typeof game.pauseToggle === 'function') game.pauseToggle();
        else if (global.ApexGameMenuActions && typeof global.ApexGameMenuActions.resume === 'function') global.ApexGameMenuActions.resume();
        else {
          var pause = doc.getElementById('pause') || doc.querySelector('[data-a="pause"]');
          if (pause && typeof pause.click === 'function') pause.click();
        }
      }
    });
  }
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}(window));
