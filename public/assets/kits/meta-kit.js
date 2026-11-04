/* meta-kit.js — shared account progression store. The `Meta` global owns apex:meta writes. */
(function () {
  'use strict';

  var Meta = (window.Meta = window.Meta || {});
  var config = window.APEX_META_CONFIG;
  if (!config) throw new Error('meta-config.js must load before meta-kit.js');
  var memory = null;
  var cosmeticRegistry = [
    { id: 'glowmoth:ember', gameId: 'glowmoth', slot: 'skin', name: 'Ember', rarity: 'common', cost: 100 },
    { id: 'glowmoth:comet-trail', gameId: 'glowmoth', slot: 'trail', name: 'Comet Trail', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:dusk', gameId: 'glowmoth', slot: 'theme', name: 'Dusk Cavern', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:aurora', gameId: 'glowmoth', slot: 'palette', name: 'Aurora', rarity: 'rare', cost: 0, unlock: { achievement: 'gold-medal' } },
    { id: 'glowmoth:moonstone', gameId: 'glowmoth', slot: 'skin', name: 'Moonstone', rarity: 'common', cost: 100 },
    { id: 'glowmoth:tideglass', gameId: 'glowmoth', slot: 'skin', name: 'Tideglass', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:sunflare', gameId: 'glowmoth', slot: 'skin', name: 'Sunflare', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:voidwing', gameId: 'glowmoth', slot: 'skin', name: 'Voidwing', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:mint-glow', gameId: 'glowmoth', slot: 'palette', name: 'Mint Glow', rarity: 'common', cost: 100 },
    { id: 'glowmoth:coral-bloom', gameId: 'glowmoth', slot: 'palette', name: 'Coral Bloom', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:prism', gameId: 'glowmoth', slot: 'palette', name: 'Prism', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:stardust-trail', gameId: 'glowmoth', slot: 'trail', name: 'Stardust Trail', rarity: 'common', cost: 100 },
    { id: 'glowmoth:firefly-trail', gameId: 'glowmoth', slot: 'trail', name: 'Firefly Trail', rarity: 'common', cost: 100 },
    { id: 'glowmoth:nebula-trail', gameId: 'glowmoth', slot: 'trail', name: 'Nebula Trail', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:crystal-garden', gameId: 'glowmoth', slot: 'theme', name: 'Crystal Garden', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:deep-night', gameId: 'glowmoth', slot: 'theme', name: 'Deep Night', rarity: 'common', cost: 100 },
    { id: 'prism-stack:ion-blocks', gameId: 'prism-stack', slot: 'skin', name: 'Ion Blocks', rarity: 'common', cost: 100 },
    { id: 'prism-stack:glass-blocks', gameId: 'prism-stack', slot: 'skin', name: 'Glass Blocks', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:forged-blocks', gameId: 'prism-stack', slot: 'skin', name: 'Forged Blocks', rarity: 'epic', cost: 600 },
    { id: 'prism-stack:soft-blocks', gameId: 'prism-stack', slot: 'skin', name: 'Soft Blocks', rarity: 'common', cost: 100 },
    { id: 'prism-stack:aurora-palette', gameId: 'prism-stack', slot: 'palette', name: 'Aurora Spectrum', rarity: 'common', cost: 100 },
    { id: 'prism-stack:ember-palette', gameId: 'prism-stack', slot: 'palette', name: 'Ember Spectrum', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:mono-palette', gameId: 'prism-stack', slot: 'palette', name: 'Monochrome Marks', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:solar-palette', gameId: 'prism-stack', slot: 'palette', name: 'Solar Spectrum', rarity: 'epic', cost: 600 },
    { id: 'prism-stack:cyan-ghost', gameId: 'prism-stack', slot: 'trail', name: 'Cyan Ghost', rarity: 'common', cost: 100 },
    { id: 'prism-stack:prism-ghost', gameId: 'prism-stack', slot: 'trail', name: 'Prism Ghost', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:gold-ghost', gameId: 'prism-stack', slot: 'trail', name: 'Gold Ghost', rarity: 'epic', cost: 600 },
    { id: 'prism-stack:deep-space', gameId: 'prism-stack', slot: 'theme', name: 'Deep Space', rarity: 'common', cost: 100 },
    { id: 'prism-stack:violet-grid', gameId: 'prism-stack', slot: 'theme', name: 'Violet Grid', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:mint-grid', gameId: 'prism-stack', slot: 'theme', name: 'Mint Grid', rarity: 'epic', cost: 600 },
    { id: 'prism-stack:crystal-grid', gameId: 'prism-stack', slot: 'theme', name: 'Crystal Grid', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:frost-palette', gameId: 'prism-stack', slot: 'palette', name: 'Frost Spectrum', rarity: 'rare', cost: 250 },
    { id: 'prism-stack:neon-palette', gameId: 'prism-stack', slot: 'palette', name: 'Neon Spectrum', rarity: 'epic', cost: 600 },
    { id: 'prism-stack:violet-ghost', gameId: 'prism-stack', slot: 'trail', name: 'Violet Ghost', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:ship-aurora', gameId: 'starfall-rift', slot: 'skin', name: 'Aurora Craft', rarity: 'common', cost: 100 },
    { id: 'starfall-rift:ship-solar', gameId: 'starfall-rift', slot: 'skin', name: 'Solar Craft', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:ship-jade', gameId: 'starfall-rift', slot: 'skin', name: 'Jade Craft', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:ship-violet', gameId: 'starfall-rift', slot: 'skin', name: 'Violet Craft', rarity: 'epic', cost: 600 },
    { id: 'starfall-rift:mint-spectrum', gameId: 'starfall-rift', slot: 'palette', name: 'Mint Spectrum', rarity: 'common', cost: 100 },
    { id: 'starfall-rift:coral-spectrum', gameId: 'starfall-rift', slot: 'palette', name: 'Coral Spectrum', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:solar-spectrum', gameId: 'starfall-rift', slot: 'palette', name: 'Solar Spectrum', rarity: 'epic', cost: 600 },
    { id: 'starfall-rift:ice-spectrum', gameId: 'starfall-rift', slot: 'palette', name: 'Ice Spectrum', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:ember-trail', gameId: 'starfall-rift', slot: 'trail', name: 'Ember Trail', rarity: 'common', cost: 100 },
    { id: 'starfall-rift:ice-trail', gameId: 'starfall-rift', slot: 'trail', name: 'Ice Trail', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:violet-trail', gameId: 'starfall-rift', slot: 'trail', name: 'Violet Trail', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:jade-trail', gameId: 'starfall-rift', slot: 'trail', name: 'Jade Trail', rarity: 'epic', cost: 600 },
    { id: 'starfall-rift:nebula-sky', gameId: 'starfall-rift', slot: 'theme', name: 'Nebula Sky', rarity: 'common', cost: 100 },
    { id: 'starfall-rift:dawn-field', gameId: 'starfall-rift', slot: 'theme', name: 'Dawn Field', rarity: 'rare', cost: 250 },
    { id: 'starfall-rift:ocean-field', gameId: 'starfall-rift', slot: 'theme', name: 'Ocean Field', rarity: 'epic', cost: 600 },
    { id: 'glow-beetle:amber-shell', gameId: 'glow-beetle', slot: 'skin', name: 'Amber Shell', rarity: 'common', cost: 100 },
    { id: 'glow-beetle:rose-shell', gameId: 'glow-beetle', slot: 'skin', name: 'Rose Shell', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:ice-shell', gameId: 'glow-beetle', slot: 'skin', name: 'Ice Shell', rarity: 'epic', cost: 600 },
    { id: 'glow-beetle:violet-shell', gameId: 'glow-beetle', slot: 'skin', name: 'Violet Shell', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:ember-maze', gameId: 'glow-beetle', slot: 'palette', name: 'Ember Maze', rarity: 'common', cost: 100 },
    { id: 'glow-beetle:ocean-maze', gameId: 'glow-beetle', slot: 'palette', name: 'Ocean Maze', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:violet-maze', gameId: 'glow-beetle', slot: 'palette', name: 'Violet Maze', rarity: 'epic', cost: 600 },
    { id: 'glow-beetle:monochrome-maze', gameId: 'glow-beetle', slot: 'palette', name: 'Monochrome Maze', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:golden-pulse', gameId: 'glow-beetle', slot: 'trail', name: 'Golden Pulse', rarity: 'common', cost: 100 },
    { id: 'glow-beetle:rose-pulse', gameId: 'glow-beetle', slot: 'trail', name: 'Rose Pulse', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:violet-pulse', gameId: 'glow-beetle', slot: 'trail', name: 'Violet Pulse', rarity: 'epic', cost: 600 },
    { id: 'glow-beetle:dawn-vault', gameId: 'glow-beetle', slot: 'theme', name: 'Dawn Vault', rarity: 'common', cost: 100 },
    { id: 'glow-beetle:deep-vault', gameId: 'glow-beetle', slot: 'theme', name: 'Deep Vault', rarity: 'rare', cost: 250 },
    { id: 'glow-beetle:star-vault', gameId: 'glow-beetle', slot: 'theme', name: 'Star Vault', rarity: 'epic', cost: 600 },
    { id: 'ion-rally:ion-cyan', gameId: 'ion-rally', slot: 'palette', name: 'Ion Cyan', rarity: 'common', cost: 0 },
    { id: 'ion-rally:magenta-pulse', gameId: 'ion-rally', slot: 'palette', name: 'Magenta Pulse', rarity: 'common', cost: 100 },
    { id: 'ion-rally:solar-gold', gameId: 'ion-rally', slot: 'palette', name: 'Solar Gold', rarity: 'rare', cost: 250 },
    { id: 'ion-rally:jade-current', gameId: 'ion-rally', slot: 'palette', name: 'Jade Current', rarity: 'rare', cost: 250 },
    { id: 'ion-rally:prism-edge', gameId: 'ion-rally', slot: 'palette', name: 'Prism Edge', rarity: 'epic', cost: 600 },
    { id: 'ion-rally:comet-tail', gameId: 'ion-rally', slot: 'trail', name: 'Comet Tail', rarity: 'common', cost: 100 },
    { id: 'ion-rally:starfield-table', gameId: 'ion-rally', slot: 'theme', name: 'Starfield Table', rarity: 'rare', cost: 250 },
    { id: 'ion-rally:rainlit-skyline', gameId: 'ion-rally', slot: 'theme', name: 'Rainlit Skyline', rarity: 'epic', cost: 600 },
    { id: 'hivefall:ion-belt', gameId: 'hivefall', slot: 'palette', name: 'Ion Belt', rarity: 'common', cost: 0 },
    { id: 'hivefall:solar-flare', gameId: 'hivefall', slot: 'palette', name: 'Solar Flare', rarity: 'common', cost: 100 },
    { id: 'hivefall:jade-swarm', gameId: 'hivefall', slot: 'palette', name: 'Jade Swarm', rarity: 'rare', cost: 250 },
    { id: 'hivefall:void-violet', gameId: 'hivefall', slot: 'palette', name: 'Void Violet', rarity: 'epic', cost: 600 },
    { id: 'hivefall:comet-trail', gameId: 'hivefall', slot: 'trail', name: 'Comet Contrail', rarity: 'common', cost: 100 },
    { id: 'hivefall:nebula-rift', gameId: 'hivefall', slot: 'theme', name: 'Nebula Rift', rarity: 'common', cost: 0 },
    { id: 'hivefall:eclipse-belt', gameId: 'hivefall', slot: 'theme', name: 'Eclipse Belt', rarity: 'rare', cost: 250 },
    { id: 'hivefall:aurora-drift', gameId: 'hivefall', slot: 'theme', name: 'Aurora Drift', rarity: 'epic', cost: 600 },
    { id: 'ember-serpent:classic-skin', gameId: 'ember-serpent', slot: 'skin', name: 'Classic Serpent', rarity: 'common', cost: 0 },
    { id: 'ember-serpent:solar-palette', gameId: 'ember-serpent', slot: 'palette', name: 'Solar Halo', rarity: 'common', cost: 100 },
    { id: 'ember-serpent:venom-palette', gameId: 'ember-serpent', slot: 'palette', name: 'Venom Bloom', rarity: 'rare', cost: 250 },
    { id: 'ember-serpent:frost-palette', gameId: 'ember-serpent', slot: 'palette', name: 'Frost Ember', rarity: 'epic', cost: 600 },
    { id: 'ember-serpent:ember-trail', gameId: 'ember-serpent', slot: 'trail', name: 'Ember Trail', rarity: 'common', cost: 100 },
    { id: 'clockwork-dawn:amber-palette', gameId: 'clockwork-dawn', slot: 'palette', name: 'Amber Sunrise', rarity: 'common', cost: 100 },
    { id: 'clockwork-dawn:rose-palette', gameId: 'clockwork-dawn', slot: 'palette', name: 'Roseglass Dawn', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:jade-palette', gameId: 'clockwork-dawn', slot: 'palette', name: 'Jade Village', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:ice-palette', gameId: 'clockwork-dawn', slot: 'palette', name: 'Frosted Morning', rarity: 'epic', cost: 600 },
    { id: 'clockwork-dawn:violet-palette', gameId: 'clockwork-dawn', slot: 'palette', name: 'Violet Hour', rarity: 'epic', cost: 600 },
    { id: 'clockwork-dawn:kai-brass', gameId: 'clockwork-dawn', slot: 'skin', name: 'Kai’s Brass Mantle', rarity: 'common', cost: 100 },
    { id: 'clockwork-dawn:kai-rose', gameId: 'clockwork-dawn', slot: 'skin', name: 'Kai’s Rose Mantle', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:kai-jade', gameId: 'clockwork-dawn', slot: 'skin', name: 'Kai’s Jade Mantle', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:kai-violet', gameId: 'clockwork-dawn', slot: 'skin', name: 'Kai’s Violet Mantle', rarity: 'epic', cost: 600 },
    { id: 'clockwork-dawn:sunwheel-gold', gameId: 'clockwork-dawn', slot: 'effect', name: 'Sunwheel Sparks', rarity: 'common', cost: 100 },
    { id: 'clockwork-dawn:moonwheel-blue', gameId: 'clockwork-dawn', slot: 'effect', name: 'Moonwheel Flare', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:gear-spark-jade', gameId: 'clockwork-dawn', slot: 'effect', name: 'Jade Gear Sparks', rarity: 'epic', cost: 600 },
    { id: 'clockwork-dawn:autumn-hearthwick', gameId: 'clockwork-dawn', slot: 'theme', name: 'Autumn Hearthwick', rarity: 'common', cost: 100 },
    { id: 'clockwork-dawn:moonlit-village', gameId: 'clockwork-dawn', slot: 'theme', name: 'Moonlit Village', rarity: 'rare', cost: 250 },
    { id: 'clockwork-dawn:crystal-dawn', gameId: 'clockwork-dawn', slot: 'theme', name: 'Crystal Dawn', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:knight-ivory', gameId: 'lanternbound', slot: 'skin', name: 'Ivory Knight', rarity: 'common', cost: 0 },
    { id: 'lanternbound:knight-crimson', gameId: 'lanternbound', slot: 'skin', name: 'Crimson Knight', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:knight-azure', gameId: 'lanternbound', slot: 'skin', name: 'Azure Knight', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:knight-verdant', gameId: 'lanternbound', slot: 'skin', name: 'Verdant Knight', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:knight-obsidian', gameId: 'lanternbound', slot: 'skin', name: 'Obsidian Knight', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:whip-ember', gameId: 'lanternbound', slot: 'palette', name: 'Ember Whip', rarity: 'common', cost: 100 },
    { id: 'lanternbound:whip-frost', gameId: 'lanternbound', slot: 'palette', name: 'Frost Whip', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:whip-blood', gameId: 'lanternbound', slot: 'palette', name: 'Blood Whip', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:whip-prism', gameId: 'lanternbound', slot: 'palette', name: 'Prism Whip', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:ash', gameId: 'lanternbound', slot: 'effect', name: 'Ash Drift', rarity: 'common', cost: 100 },
    { id: 'lanternbound:embers', gameId: 'lanternbound', slot: 'effect', name: 'Ember Wake', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:moonlight', gameId: 'lanternbound', slot: 'effect', name: 'Moonlight Halo', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:courtyard', gameId: 'lanternbound', slot: 'theme', name: 'Courtyard Night', rarity: 'common', cost: 0 },
    { id: 'lanternbound:bloodmoon', gameId: 'lanternbound', slot: 'theme', name: 'Blood Moon', rarity: 'rare', cost: 250 },
    { id: 'lanternbound:frostfall', gameId: 'lanternbound', slot: 'theme', name: 'Frostfall', rarity: 'epic', cost: 600 },
    { id: 'lanternbound:belfry', gameId: 'lanternbound', slot: 'theme', name: 'Duke’s Belfry', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:drifter-standard', gameId: 'deepcore-drifter', slot: 'skin', name: 'Standard Suit', rarity: 'common', cost: 0 },
    { id: 'deepcore-drifter:drifter-ember', gameId: 'deepcore-drifter', slot: 'skin', name: 'Ember Suit', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:drifter-arctic', gameId: 'deepcore-drifter', slot: 'skin', name: 'Arctic Suit', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:drifter-toxic', gameId: 'deepcore-drifter', slot: 'skin', name: 'Toxic Suit', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:drifter-void', gameId: 'deepcore-drifter', slot: 'skin', name: 'Void Suit', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:beam-ion', gameId: 'deepcore-drifter', slot: 'palette', name: 'Ion Beam', rarity: 'common', cost: 0 },
    { id: 'deepcore-drifter:beam-plasma', gameId: 'deepcore-drifter', slot: 'palette', name: 'Plasma Beam', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:beam-solar', gameId: 'deepcore-drifter', slot: 'palette', name: 'Solar Beam', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:beam-void', gameId: 'deepcore-drifter', slot: 'palette', name: 'Void Beam', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:spark', gameId: 'deepcore-drifter', slot: 'effect', name: 'Ion Spark', rarity: 'common', cost: 0 },
    { id: 'deepcore-drifter:static', gameId: 'deepcore-drifter', slot: 'effect', name: 'Static Charge', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:nova', gameId: 'deepcore-drifter', slot: 'effect', name: 'Core Nova', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:deepcore', gameId: 'deepcore-drifter', slot: 'theme', name: 'Deepcore', rarity: 'common', cost: 0 },
    { id: 'deepcore-drifter:magma-core', gameId: 'deepcore-drifter', slot: 'theme', name: 'Magma Core', rarity: 'rare', cost: 250 },
    { id: 'deepcore-drifter:frozen-abyss', gameId: 'deepcore-drifter', slot: 'theme', name: 'Frozen Abyss', rarity: 'epic', cost: 600 },
    { id: 'deepcore-drifter:overgrown-nest', gameId: 'deepcore-drifter', slot: 'theme', name: 'Overgrown Nest', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:wanderer', gameId: 'hollowbell', slot: 'skin', name: 'Wanderer’s Shell', rarity: 'common', cost: 0 },
    { id: 'hollowbell:cloak-ember', gameId: 'hollowbell', slot: 'skin', name: 'Ember Cloak', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:cloak-frost', gameId: 'hollowbell', slot: 'skin', name: 'Frost Cloak', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:cloak-gilded', gameId: 'hollowbell', slot: 'skin', name: 'Gilded Shell', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:cloak-void', gameId: 'hollowbell', slot: 'skin', name: 'Void Shell', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:nail-pale', gameId: 'hollowbell', slot: 'palette', name: 'Pale Needle', rarity: 'common', cost: 0 },
    { id: 'hollowbell:nail-ember', gameId: 'hollowbell', slot: 'palette', name: 'Ember Nail', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:nail-frost', gameId: 'hollowbell', slot: 'palette', name: 'Frost Nail', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:nail-dream', gameId: 'hollowbell', slot: 'palette', name: 'Dream Nail', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:spark-pale', gameId: 'hollowbell', slot: 'effect', name: 'Pale Spark', rarity: 'common', cost: 0 },
    { id: 'hollowbell:wisp-soul', gameId: 'hollowbell', slot: 'effect', name: 'Soul Wisp', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:nightmare-flare', gameId: 'hollowbell', slot: 'effect', name: 'Nightmare Flare', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:hollow', gameId: 'hollowbell', slot: 'theme', name: 'Sunken Hollow', rarity: 'common', cost: 0 },
    { id: 'hollowbell:mistveil', gameId: 'hollowbell', slot: 'theme', name: 'Mistveil', rarity: 'rare', cost: 250 },
    { id: 'hollowbell:ember-hollow', gameId: 'hollowbell', slot: 'theme', name: 'Ember Hollow', rarity: 'epic', cost: 600 },
    { id: 'hollowbell:pale-garden', gameId: 'hollowbell', slot: 'theme', name: 'Pale Garden', rarity: 'epic', cost: 600 },
    { id: 'skyfall-ridge:parka-amber', gameId: 'skyfall-ridge', slot: 'skin', name: 'Amber Parka', rarity: 'common', cost: 0 },
    { id: 'skyfall-ridge:parka-rose', gameId: 'skyfall-ridge', slot: 'skin', name: 'Rose Parka', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:parka-jade', gameId: 'skyfall-ridge', slot: 'skin', name: 'Jade Parka', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:parka-ice', gameId: 'skyfall-ridge', slot: 'skin', name: 'Ice Parka', rarity: 'epic', cost: 600 },
    { id: 'skyfall-ridge:parka-gold', gameId: 'skyfall-ridge', slot: 'skin', name: 'Gilded Parka', rarity: 'epic', cost: 600 },
    { id: 'skyfall-ridge:scarf-sky', gameId: 'skyfall-ridge', slot: 'palette', name: 'Sky Scarf', rarity: 'common', cost: 0 },
    { id: 'skyfall-ridge:scarf-ember', gameId: 'skyfall-ridge', slot: 'palette', name: 'Ember Scarf', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:scarf-gold', gameId: 'skyfall-ridge', slot: 'palette', name: 'Gold Scarf', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:scarf-violet', gameId: 'skyfall-ridge', slot: 'palette', name: 'Violet Scarf', rarity: 'epic', cost: 600 },
    { id: 'skyfall-ridge:shard-gold', gameId: 'skyfall-ridge', slot: 'effect', name: 'Gold Shards', rarity: 'common', cost: 0 },
    { id: 'skyfall-ridge:shard-rose', gameId: 'skyfall-ridge', slot: 'effect', name: 'Rose Shards', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:shard-mint', gameId: 'skyfall-ridge', slot: 'effect', name: 'Mint Shards', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:shard-ice', gameId: 'skyfall-ridge', slot: 'effect', name: 'Ice Shards', rarity: 'epic', cost: 600 },
    { id: 'skyfall-ridge:theme-alpine', gameId: 'skyfall-ridge', slot: 'theme', name: 'Alpine Dusk', rarity: 'common', cost: 0 },
    { id: 'skyfall-ridge:theme-night', gameId: 'skyfall-ridge', slot: 'theme', name: 'Night Ridge', rarity: 'rare', cost: 250 },
    { id: 'skyfall-ridge:theme-violet', gameId: 'skyfall-ridge', slot: 'theme', name: 'Violet Summit', rarity: 'epic', cost: 600 },
    { id: 'stormcap-showdown:kettle-crimson', gameId: 'stormcap-showdown', slot: 'skin', name: 'Crimson Kettle', rarity: 'common', cost: 0 },
    { id: 'stormcap-showdown:kettle-blue', gameId: 'stormcap-showdown', slot: 'skin', name: 'Blue Kettle', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:kettle-jade', gameId: 'stormcap-showdown', slot: 'skin', name: 'Jade Kettle', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:kettle-gold', gameId: 'stormcap-showdown', slot: 'skin', name: 'Gilded Kettle', rarity: 'epic', cost: 600 },
    { id: 'stormcap-showdown:kettle-violet', gameId: 'stormcap-showdown', slot: 'skin', name: 'Violet Kettle', rarity: 'epic', cost: 600 },
    { id: 'stormcap-showdown:shot-ivory', gameId: 'stormcap-showdown', slot: 'palette', name: 'Ivory Shots', rarity: 'common', cost: 0 },
    { id: 'stormcap-showdown:shot-sky', gameId: 'stormcap-showdown', slot: 'palette', name: 'Sky Shots', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:shot-gold', gameId: 'stormcap-showdown', slot: 'palette', name: 'Gold Shots', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:shot-mint', gameId: 'stormcap-showdown', slot: 'palette', name: 'Mint Shots', rarity: 'epic', cost: 600 },
    { id: 'stormcap-showdown:parry-rose', gameId: 'stormcap-showdown', slot: 'effect', name: 'Rose Parry', rarity: 'common', cost: 0 },
    { id: 'stormcap-showdown:parry-mint', gameId: 'stormcap-showdown', slot: 'effect', name: 'Mint Parry', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:parry-gold', gameId: 'stormcap-showdown', slot: 'effect', name: 'Gold Parry', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:parry-sky', gameId: 'stormcap-showdown', slot: 'effect', name: 'Sky Parry', rarity: 'epic', cost: 600 },
    { id: 'stormcap-showdown:theme-inkwell', gameId: 'stormcap-showdown', slot: 'theme', name: 'Inkwell Dawn', rarity: 'common', cost: 0 },
    { id: 'stormcap-showdown:theme-storm', gameId: 'stormcap-showdown', slot: 'theme', name: 'Storm Front', rarity: 'rare', cost: 250 },
    { id: 'stormcap-showdown:theme-sunset', gameId: 'stormcap-showdown', slot: 'theme', name: 'Sunset Stage', rarity: 'epic', cost: 600 },
    { id: 'ashen-descent:prisoner', gameId: 'ashen-descent', slot: 'skin', name: 'Prisoner', rarity: 'common', cost: 0 },
    { id: 'ashen-descent:sentinel', gameId: 'ashen-descent', slot: 'skin', name: 'Ashen Sentinel', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:alchemist', gameId: 'ashen-descent', slot: 'skin', name: 'Alchemist', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:wraith', gameId: 'ashen-descent', slot: 'skin', name: 'Void Wraith', rarity: 'epic', cost: 600 },
    { id: 'ashen-descent:gilded', gameId: 'ashen-descent', slot: 'skin', name: 'Gilded Exile', rarity: 'epic', cost: 600 },
    { id: 'ashen-descent:blade-steel', gameId: 'ashen-descent', slot: 'palette', name: 'Steel Edge', rarity: 'common', cost: 0 },
    { id: 'ashen-descent:blade-ember', gameId: 'ashen-descent', slot: 'palette', name: 'Ember Edge', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:blade-frost', gameId: 'ashen-descent', slot: 'palette', name: 'Frost Edge', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:blade-venom', gameId: 'ashen-descent', slot: 'palette', name: 'Venom Edge', rarity: 'epic', cost: 600 },
    { id: 'ashen-descent:ash-orange', gameId: 'ashen-descent', slot: 'effect', name: 'Ember Ash', rarity: 'common', cost: 0 },
    { id: 'ashen-descent:ash-mint', gameId: 'ashen-descent', slot: 'effect', name: 'Mint Ash', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:ash-violet', gameId: 'ashen-descent', slot: 'effect', name: 'Violet Ash', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:ash-gold', gameId: 'ashen-descent', slot: 'effect', name: 'Golden Ash', rarity: 'epic', cost: 600 },
    { id: 'ashen-descent:theme-quarters', gameId: 'ashen-descent', slot: 'theme', name: 'Prisoner Quarters', rarity: 'common', cost: 0 },
    { id: 'ashen-descent:theme-sewers', gameId: 'ashen-descent', slot: 'theme', name: 'Toxic Sewers', rarity: 'rare', cost: 250 },
    { id: 'ashen-descent:theme-spire', gameId: 'ashen-descent', slot: 'theme', name: "Warden's Spire", rarity: 'epic', cost: 600 },
    { id: 'lumen-sprite:spirit-ivory', gameId: 'lumen-sprite', slot: 'skin', name: 'Ivory Spirit', rarity: 'common', cost: 0 },
    { id: 'lumen-sprite:spirit-jade', gameId: 'lumen-sprite', slot: 'skin', name: 'Jade Spirit', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:spirit-sky', gameId: 'lumen-sprite', slot: 'skin', name: 'Sky Spirit', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:spirit-rose', gameId: 'lumen-sprite', slot: 'skin', name: 'Rose Spirit', rarity: 'epic', cost: 600 },
    { id: 'lumen-sprite:spirit-violet', gameId: 'lumen-sprite', slot: 'skin', name: 'Violet Spirit', rarity: 'epic', cost: 600 },
    { id: 'lumen-sprite:flare-gold', gameId: 'lumen-sprite', slot: 'palette', name: 'Gold Flare', rarity: 'common', cost: 0 },
    { id: 'lumen-sprite:flare-mint', gameId: 'lumen-sprite', slot: 'palette', name: 'Mint Flare', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:flare-sky', gameId: 'lumen-sprite', slot: 'palette', name: 'Sky Flare', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:flare-rose', gameId: 'lumen-sprite', slot: 'palette', name: 'Rose Flare', rarity: 'epic', cost: 600 },
    { id: 'lumen-sprite:trail-gold', gameId: 'lumen-sprite', slot: 'effect', name: 'Gold Trail', rarity: 'common', cost: 0 },
    { id: 'lumen-sprite:trail-mint', gameId: 'lumen-sprite', slot: 'effect', name: 'Mint Trail', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:trail-violet', gameId: 'lumen-sprite', slot: 'effect', name: 'Violet Trail', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:trail-rose', gameId: 'lumen-sprite', slot: 'effect', name: 'Rose Trail', rarity: 'epic', cost: 600 },
    { id: 'lumen-sprite:theme-grove', gameId: 'lumen-sprite', slot: 'theme', name: 'Whispering Grove', rarity: 'common', cost: 0 },
    { id: 'lumen-sprite:theme-echo', gameId: 'lumen-sprite', slot: 'theme', name: 'Hollow of Echoes', rarity: 'rare', cost: 250 },
    { id: 'lumen-sprite:theme-tower', gameId: 'lumen-sprite', slot: 'theme', name: 'The Rising Dark', rarity: 'epic', cost: 600 },
    { id: 'glimmer-gadabout:gad-rose', gameId: 'glimmer-gadabout', slot: 'skin', name: 'Rose Gadabout', rarity: 'common', cost: 0 },
    { id: 'glimmer-gadabout:gad-mint', gameId: 'glimmer-gadabout', slot: 'skin', name: 'Mint Gadabout', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:gad-sky', gameId: 'glimmer-gadabout', slot: 'skin', name: 'Sky Gadabout', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:gad-grape', gameId: 'glimmer-gadabout', slot: 'skin', name: 'Grape Gadabout', rarity: 'epic', cost: 600 },
    { id: 'glimmer-gadabout:gad-candy', gameId: 'glimmer-gadabout', slot: 'skin', name: 'Candy Gadabout', rarity: 'epic', cost: 600 },
    { id: 'glimmer-gadabout:punch-amber', gameId: 'glimmer-gadabout', slot: 'palette', name: 'Amber Fists', rarity: 'common', cost: 0 },
    { id: 'glimmer-gadabout:punch-lime', gameId: 'glimmer-gadabout', slot: 'palette', name: 'Lime Fists', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:punch-sky', gameId: 'glimmer-gadabout', slot: 'palette', name: 'Sky Fists', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:punch-rose', gameId: 'glimmer-gadabout', slot: 'palette', name: 'Rose Fists', rarity: 'epic', cost: 600 },
    { id: 'glimmer-gadabout:trail-gold', gameId: 'glimmer-gadabout', slot: 'effect', name: 'Gold Trail', rarity: 'common', cost: 0 },
    { id: 'glimmer-gadabout:trail-mint', gameId: 'glimmer-gadabout', slot: 'effect', name: 'Mint Trail', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:trail-violet', gameId: 'glimmer-gadabout', slot: 'effect', name: 'Violet Trail', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:trail-rose', gameId: 'glimmer-gadabout', slot: 'effect', name: 'Rose Trail', rarity: 'epic', cost: 600 },
    { id: 'glimmer-gadabout:theme-meadow', gameId: 'glimmer-gadabout', slot: 'theme', name: 'Drumline Meadow', rarity: 'common', cost: 0 },
    { id: 'glimmer-gadabout:theme-reef', gameId: 'glimmer-gadabout', slot: 'theme', name: 'Neon Reef', rarity: 'rare', cost: 250 },
    { id: 'glimmer-gadabout:theme-chasm', gameId: 'glimmer-gadabout', slot: 'theme', name: 'Candy Chasm', rarity: 'epic', cost: 600 },
    { id: 'fox-courier:courier-crimson', gameId: 'fox-courier', slot: 'skin', name: 'Crimson Courier', rarity: 'common', cost: 100 },
    { id: 'fox-courier:courier-mint', gameId: 'fox-courier', slot: 'skin', name: 'Mint Courier', rarity: 'rare', cost: 250 },
    { id: 'fox-courier:courier-midnight', gameId: 'fox-courier', slot: 'skin', name: 'Midnight Courier', rarity: 'epic', cost: 600 },
    { id: 'fox-courier:courier-solar', gameId: 'fox-courier', slot: 'skin', name: 'Solar Courier', rarity: 'epic', cost: 600 },
    { id: 'fox-courier:coin-mint', gameId: 'fox-courier', slot: 'palette', name: 'Mint Coin', rarity: 'common', cost: 100 },
    { id: 'fox-courier:coin-solar', gameId: 'fox-courier', slot: 'palette', name: 'Solar Coin', rarity: 'rare', cost: 250 },
    { id: 'fox-courier:parcel-gold', gameId: 'fox-courier', slot: 'palette', name: 'Golden Parcel', rarity: 'epic', cost: 0, unlock: { achievement: 'all-courses' } },
    { id: 'fox-courier:scarf-ember', gameId: 'fox-courier', slot: 'trail', name: 'Ember Scarf', rarity: 'common', cost: 100 },
    { id: 'fox-courier:scarf-aurora', gameId: 'fox-courier', slot: 'trail', name: 'Aurora Scarf', rarity: 'rare', cost: 250 },
    { id: 'fox-courier:scarf-gold', gameId: 'fox-courier', slot: 'trail', name: 'Gold Scarf', rarity: 'epic', cost: 600 },
    { id: 'fox-courier:theme-snowline', gameId: 'fox-courier', slot: 'theme', name: 'Snowline', rarity: 'common', cost: 100 },
    { id: 'fox-courier:theme-orchard', gameId: 'fox-courier', slot: 'theme', name: 'Orchard Morning', rarity: 'rare', cost: 250 },
    { id: 'fox-courier:theme-dusk', gameId: 'fox-courier', slot: 'theme', name: 'Dusk Rooftops', rarity: 'epic', cost: 600 },
    { id: 'cloudhop-pip:pip-mint', gameId: 'cloudhop-pip', slot: 'skin', name: 'Mint Pip', rarity: 'common', cost: 100 },
    { id: 'cloudhop-pip:pip-lilac', gameId: 'cloudhop-pip', slot: 'skin', name: 'Lilac Pip', rarity: 'rare', cost: 250 },
    { id: 'cloudhop-pip:pip-sunset', gameId: 'cloudhop-pip', slot: 'skin', name: 'Sunset Pip', rarity: 'epic', cost: 600 },
    { id: 'cloudhop-pip:pip-midnight', gameId: 'cloudhop-pip', slot: 'skin', name: 'Midnight Pip', rarity: 'epic', cost: 600 },
    { id: 'cloudhop-pip:coin-cloud', gameId: 'cloudhop-pip', slot: 'palette', name: 'Cloud Coin', rarity: 'common', cost: 100 },
    { id: 'cloudhop-pip:coin-sunrise', gameId: 'cloudhop-pip', slot: 'palette', name: 'Sunrise Coin', rarity: 'rare', cost: 250 },
    { id: 'cloudhop-pip:coin-star', gameId: 'cloudhop-pip', slot: 'palette', name: 'Starlit Coin', rarity: 'epic', cost: 0, unlock: { achievement: 'all-isles' } },
    { id: 'cloudhop-pip:scarf-mint', gameId: 'cloudhop-pip', slot: 'trail', name: 'Mint Cape', rarity: 'common', cost: 100 },
    { id: 'cloudhop-pip:scarf-aurora', gameId: 'cloudhop-pip', slot: 'trail', name: 'Aurora Cape', rarity: 'rare', cost: 250 },
    { id: 'cloudhop-pip:scarf-gold', gameId: 'cloudhop-pip', slot: 'trail', name: 'Gold Cape', rarity: 'epic', cost: 600 },
    { id: 'cloudhop-pip:theme-dawn', gameId: 'cloudhop-pip', slot: 'theme', name: 'Sky Dawn', rarity: 'common', cost: 100 },
    { id: 'cloudhop-pip:theme-orchard', gameId: 'cloudhop-pip', slot: 'theme', name: 'Orchard Sky', rarity: 'rare', cost: 250 },
    { id: 'cloudhop-pip:theme-starfall', gameId: 'cloudhop-pip', slot: 'theme', name: 'Starfall Night', rarity: 'epic', cost: 600 },
    { id: 'rollo-rush:rollo-teal', gameId: 'rollo-rush', slot: 'skin', name: 'Teal Rollo', rarity: 'common', cost: 100 },
    { id: 'rollo-rush:rollo-ember', gameId: 'rollo-rush', slot: 'skin', name: 'Ember Rollo', rarity: 'rare', cost: 250 },
    { id: 'rollo-rush:rollo-cobalt', gameId: 'rollo-rush', slot: 'skin', name: 'Cobalt Rollo', rarity: 'epic', cost: 600 },
    { id: 'rollo-rush:rollo-violet', gameId: 'rollo-rush', slot: 'skin', name: 'Violet Rollo', rarity: 'epic', cost: 600 },
    { id: 'rollo-rush:ring-cyan', gameId: 'rollo-rush', slot: 'palette', name: 'Cyan Rings', rarity: 'common', cost: 100 },
    { id: 'rollo-rush:ring-sunset', gameId: 'rollo-rush', slot: 'palette', name: 'Sunset Rings', rarity: 'rare', cost: 250 },
    { id: 'rollo-rush:ring-prism', gameId: 'rollo-rush', slot: 'palette', name: 'Prism Rings', rarity: 'epic', cost: 0, unlock: { achievement: 'all-zones' } },
    { id: 'rollo-rush:scarf-mint', gameId: 'rollo-rush', slot: 'trail', name: 'Mint Scarf', rarity: 'common', cost: 100 },
    { id: 'rollo-rush:scarf-aurora', gameId: 'rollo-rush', slot: 'trail', name: 'Aurora Scarf', rarity: 'rare', cost: 250 },
    { id: 'rollo-rush:scarf-gold', gameId: 'rollo-rush', slot: 'trail', name: 'Gold Scarf', rarity: 'epic', cost: 600 },
    { id: 'rollo-rush:theme-dunes', gameId: 'rollo-rush', slot: 'theme', name: 'Dune Sunrise', rarity: 'common', cost: 100 },
    { id: 'rollo-rush:theme-neon', gameId: 'rollo-rush', slot: 'theme', name: 'Neon Skyline', rarity: 'rare', cost: 250 },
    { id: 'rollo-rush:theme-midnight', gameId: 'rollo-rush', slot: 'theme', name: 'Midnight Circuit', rarity: 'epic', cost: 600 },
    { id: 'iron-circuit:skin-ember', gameId: 'iron-circuit', slot: 'skin', name: 'Ember Kestrel', rarity: 'common', cost: 100 },
    { id: 'iron-circuit:skin-cobalt', gameId: 'iron-circuit', slot: 'skin', name: 'Cobalt Kestrel', rarity: 'rare', cost: 250 },
    { id: 'iron-circuit:skin-violet', gameId: 'iron-circuit', slot: 'skin', name: 'Violet Kestrel', rarity: 'epic', cost: 600 },
    { id: 'iron-circuit:palette-sunset', gameId: 'iron-circuit', slot: 'palette', name: 'Sunset HUD', rarity: 'common', cost: 100 },
    { id: 'iron-circuit:palette-aurora', gameId: 'iron-circuit', slot: 'palette', name: 'Aurora HUD', rarity: 'rare', cost: 250 },
    { id: 'iron-circuit:palette-neon', gameId: 'iron-circuit', slot: 'palette', name: 'Neon HUD', rarity: 'epic', cost: 0, unlock: { achievement: 'circuit-clear' } },
    { id: 'iron-circuit:trail-gold', gameId: 'iron-circuit', slot: 'trail', name: 'Gold Rift Trail', rarity: 'common', cost: 100 },
    { id: 'iron-circuit:trail-violet', gameId: 'iron-circuit', slot: 'trail', name: 'Violet Rift Trail', rarity: 'rare', cost: 250 },
    { id: 'iron-circuit:trail-cyan', gameId: 'iron-circuit', slot: 'trail', name: 'Cyan Rift Trail', rarity: 'epic', cost: 600 },
    { id: 'iron-circuit:theme-dunes', gameId: 'iron-circuit', slot: 'theme', name: 'Dune Heat', rarity: 'common', cost: 100 },
    { id: 'iron-circuit:theme-neon', gameId: 'iron-circuit', slot: 'theme', name: 'Neon Rooftop', rarity: 'rare', cost: 250 },
    { id: 'iron-circuit:theme-midnight', gameId: 'iron-circuit', slot: 'theme', name: 'Midnight Circuit', rarity: 'epic', cost: 600 },
  ];

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function nonNegative(value) { return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0; }
  function dayKey(date) {
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function dayNumber(key) {
    var match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000) : NaN;
  }
  function localWeekKey(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    var year = d.getFullYear(), first = new Date(year, 0, 1), week = Math.ceil((((d - first) / 86400000) + 1) / 7);
    return year + '-W' + String(week).padStart(2, '0');
  }
  function normalize(input) {
    var state = copy(config.defaultState), source = input && typeof input === 'object' ? input : {};
    Object.keys(source).forEach(function (key) {
      if (key === 'streak' || key === 'daily' || key === 'quests') {
        state[key] = Object.assign({}, state[key], source[key] || {});
      } else if (key === 'seasons') state.seasons = Object.assign({}, source.seasons || {});
      else if (key === 'trophies') state.trophies = Array.isArray(source.trophies) ? source.trophies.slice() : [];
      else state[key] = source[key];
    });
    state.v = 1;
    state.xp = nonNegative(state.xp);
    state.sparks = nonNegative(state.sparks);
    state.level = Math.max(1, Math.floor(nonNegative(state.level)));
    state.streak.count = Math.floor(nonNegative(state.streak.count));
    state.streak.freezes = Math.min(config.maxStreakFreezes, Math.floor(nonNegative(state.streak.freezes)));
    if (!Array.isArray(state.daily.games)) state.daily.games = [];
    if (!Array.isArray(state.daily.done)) state.daily.done = [];
    if (!Array.isArray(state.quests.day)) state.quests.day = [];
    if (!Array.isArray(state.quests.week)) state.quests.week = [];
    if (!state.seasons || typeof state.seasons !== 'object' || Array.isArray(state.seasons)) state.seasons = {};
    if (!Array.isArray(state.trophies)) state.trophies = [];
    return state;
  }
  function levelFor(xp) {
    var level = 1, remaining = nonNegative(xp), cost;
    while (level < 100000) {
      cost = config.levelBaseXp + config.levelStepXp * (level - 1);
      if (remaining < cost) break;
      remaining -= cost; level++;
    }
    return level;
  }
  function readRaw() {
    try {
      var raw = window.localStorage.getItem(config.storageKey);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    return memory ? normalize(memory) : copy(config.defaultState);
  }
  function write(state) {
    var normalized = normalize(state), raw = JSON.stringify(normalized);
    memory = normalized;
    try { window.localStorage.setItem(config.storageKey, raw); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('apex:meta', { detail: { state: copy(normalized) } })); } catch (e) {}
    return copy(normalized);
  }
  function updateStreak(state, now) {
    var today = dayKey(now), previous = state.streak.lastDay, todayNumber = dayNumber(today), previousNumber = dayNumber(previous);
    var advanced = false;
    if (!previous) { state.streak.count = 1; advanced = true; }
    else if (todayNumber > previousNumber) {
      var gap = todayNumber - previousNumber;
      if (gap === 1) state.streak.count += 1;
      else if (gap === 2 && state.streak.freezes > 0) { state.streak.freezes -= 1; state.streak.count += 1; }
      else state.streak.count = 1;
      advanced = true;
      state.streak.lastDay = today;
    } else if (todayNumber < previousNumber) {
      // A timezone change can move the local date backwards. Keep the saved day
      // so crossing back into it cannot erase a streak or count twice.
      return;
    }
    state.streak.lastDay = today;
    if (advanced && state.streak.count > 0 && state.streak.count % config.streakFreezeEvery === 0 && state.streak.freezes < config.maxStreakFreezes) {
      state.streak.freezes += 1;
    }
  }
  function applyReward(state, xp, sparks) {
    state.xp += Math.max(0, Math.floor(xp));
    state.sparks += Math.max(0, Math.floor(sparks));
    state.level = levelFor(state.xp);
  }
  function dailySeed(date, gameId) {
    var input = dayKey(date) + String(gameId || ''), hash = 2166136261;
    for (var i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function weekKey(date) {
    var thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
    var year = thursday.getUTCFullYear(), firstThursday = new Date(Date.UTC(year, 0, 4));
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
    var week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604800000);
    return String(year) + '-W' + String(week).padStart(2, '0');
  }
  function selectQuests(templates, count, seed) {
    var list = (templates || []).map(function (item) { return Object.assign({}, item, { progress: 0, done: false }); });
    var salt = new Date(0), seedKey = String(seed);
    list.sort(function (a, b) { return dailySeed(salt, seedKey + a.id) - dailySeed(salt, seedKey + b.id); });
    return list.slice(0, count);
  }
  function ensureQuests(state, date) {
    var day = dayKey(date), week = weekKey(date), changed = false;
    if (state.quests.dayKey !== day) {
      state.quests.dayKey = day;
      state.quests.day = selectQuests(config.dailyQuestTemplates, config.dailyQuestCount, Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      changed = true;
    }
    if (state.quests.weekKey !== week) {
      state.quests.weekKey = week;
      state.quests.week = selectQuests(config.weeklyQuestTemplates, config.weeklyQuestCount, week);
      changed = true;
    }
    return changed;
  }
  function progressQuestList(state, list, payload, rewardXp) {
    var earned = 0;
    (list || []).forEach(function (quest) {
      if (quest.done) return;
      if (quest.type === 'sessions') quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'unique-games' && payload.gameId) {
        quest.games = quest.games || [];
        if (!quest.games.includes(payload.gameId)) quest.games.push(payload.gameId);
        quest.progress = quest.games.length;
      } else if (quest.type === 'new-best' && payload.newBest) quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'category' && payload.category === quest.category) quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'categories' && payload.category) {
        quest.categories = quest.categories || [];
        if (!quest.categories.includes(payload.category)) quest.categories.push(payload.category);
        quest.progress = quest.categories.length;
      }
      if (quest.progress >= quest.goal) { quest.done = true; earned += rewardXp; }
    });
    return earned;
  }

  Meta.read = function () { return readRaw(); };
  Meta.getQuests = function (now) {
    var state = readRaw();
    if (ensureQuests(state, now instanceof Date ? now : new Date())) return write(state).quests;
    return copy(state.quests);
  };
  Meta.getDailySeed = function (gameId, now) { return dailySeed(now || new Date(), gameId); };
  Meta.getCosmetics = function (gameId) {
    var save = window.Save && typeof window.Save.load === 'function' ? window.Save.load(gameId) : null;
    var cosmetics = save && save.cosmetics ? save.cosmetics : { owned: [], equipped: {} };
    var owned = cosmetics && Array.isArray(cosmetics.owned) ? cosmetics.owned : [];
    var equipped = cosmetics && cosmetics.equipped && typeof cosmetics.equipped === 'object' ? cosmetics.equipped : {};
    var state = readRaw();
    return cosmeticRegistry.filter(function (item) { return !gameId || item.gameId === gameId; }).map(function (item) {
      var achievementUnlocked = !item.unlock || !item.unlock.achievement || state.trophies.some(function (trophy) {
        return (typeof trophy === 'string' ? trophy : trophy.id) === item.gameId + ':' + item.unlock.achievement;
      });
      return Object.assign({}, item, {
        owned: owned.includes(item.id),
        equipped: equipped[item.slot] === item.id,
        achievementUnlocked: achievementUnlocked,
      });
    });
  };
  Meta.purchaseCosmetic = function (gameId, cosmeticId) {
    var item = cosmeticRegistry.find(function (candidate) { return candidate.id === cosmeticId && candidate.gameId === gameId; });
    var state = readRaw();
    if (!item || !window.Save || typeof window.Save.load !== 'function' || typeof window.Save.update !== 'function') {
      return { ok: false, reason: 'unknown-cosmetic', sparks: state.sparks, state: state };
    }
    var save = window.Save.load(gameId), cosmetics = save.cosmetics || { owned: [], equipped: {} };
    var owned = Array.isArray(cosmetics.owned) ? cosmetics.owned : [];
    if (owned.includes(item.id)) return { ok: true, purchased: false, sparks: state.sparks, state: state };
    if (item.unlock && item.unlock.achievement) {
      var trophyId = gameId + ':' + item.unlock.achievement;
      if (!state.trophies.some(function (trophy) { return (typeof trophy === 'string' ? trophy : trophy.id) === trophyId; })) {
        return { ok: false, reason: 'achievement-required', sparks: state.sparks, state: state };
      }
    }
    var cost = item.unlock ? 0 : (Number.isFinite(item.cost) ? item.cost : (config.cosmeticPrices[item.rarity] || 0));
    if (state.sparks < cost) return { ok: false, reason: 'insufficient-sparks', sparks: state.sparks, state: state };
    window.Save.update(gameId, { cosmetics: { owned: [item.id] } });
    state.sparks -= cost;
    var saved = write(state);
    return { ok: true, purchased: true, cost: cost, sparks: saved.sparks, state: saved };
  };
  Meta.equipCosmetic = function (gameId, cosmeticId) {
    var item = cosmeticRegistry.find(function (candidate) { return candidate.id === cosmeticId && candidate.gameId === gameId; });
    if (!item || !window.Save || typeof window.Save.load !== 'function' || typeof window.Save.update !== 'function') return { ok: false, reason: 'unknown-cosmetic' };
    var save = window.Save.load(gameId), cosmetics = save.cosmetics || { owned: [], equipped: {} };
    if (!Array.isArray(cosmetics.owned) || !cosmetics.owned.includes(item.id)) return { ok: false, reason: 'not-owned' };
    var updated = window.Save.update(gameId, { cosmetics: { equipped: (function () { var slots = {}; slots[item.slot] = item.id; return slots; })() } });
    return { ok: true, item: Object.assign({}, item), state: updated };
  };
  Meta.recordSession = function (payload, now) {
    payload = payload || {};
    var state = readRaw(), date = now instanceof Date ? now : new Date();
    var gameId = String(payload.gameId || '').slice(0, 64);
    if (!gameId) return { xp: 0, sparks: 0, state: state };
    ensureQuests(state, date);
    var duration = Math.min(86400, nonNegative(payload.durationSec));
    var xp = config.sessionXp + Math.min(config.maxTimeXp, Math.floor(duration / config.secondsPerXp)) + (payload.newBest ? config.newBestXp : 0);
    var sparks = Math.floor(xp / config.sessionSparksDivisor);
    updateStreak(state, date);
    var today = dayKey(date);
    if (state.daily.day !== today) state.daily = { day: today, seed: dailySeed(date, gameId), games: [], done: [] };
    if (!state.daily.games.includes(gameId)) state.daily.games.push(gameId);
    var questXp = progressQuestList(state, state.quests.day, payload, config.dailyQuestXp)
      + progressQuestList(state, state.quests.week, payload, config.weeklyQuestXp);
    applyReward(state, xp, sparks);
    if (questXp) applyReward(state, questXp, 0);
    var saved = write(state);
    return { xp: xp + questXp, sessionXp: xp, questXp: questXp, sparks: sparks, level: saved.level, streak: saved.streak.count, state: saved };
  };
  Meta.recordAchievement = function (payload) {
    payload = payload || {};
    var id = String(payload.id || '').slice(0, 64), gameId = String(payload.gameId || '').slice(0, 64);
    var rarity = ['common', 'rare', 'epic', 'legendary'].includes(payload.rarity) ? payload.rarity : 'common';
    if (!id) return { xp: 0, sparks: 0, state: readRaw() };
    var state = readRaw(), trophyId = (gameId ? gameId + ':' : '') + id;
    if (state.trophies.some(function (trophy) { return (typeof trophy === 'string' ? trophy : trophy.id) === trophyId; })) return { xp: 0, sparks: 0, state: state };
    var xp = config.achievementXp[rarity], sparks = config.achievementSparks[rarity];
    state.trophies.push({ id: trophyId, gameId: gameId, rarity: rarity, day: dayKey(new Date()) });
    applyReward(state, xp, sparks);
    return { xp: xp, sparks: sparks, level: state.level, state: write(state) };
  };
  Meta.recordDailyGauntlet = function (day) {
    var state = readRaw(), date = String(day || dayKey(new Date()));
    if (state.daily.done.includes('gauntlet:' + date)) return { xp: 0, sparks: 0, state: state };
    state.daily.done.push('gauntlet:' + date);
    applyReward(state, config.dailyGauntletXp, config.dailyGauntletSparks);
    return { xp: config.dailyGauntletXp, sparks: config.dailyGauntletSparks, state: write(state) };
  };
  Meta.addQuestReward = function (kind) {
    var xp = kind === 'weekly' ? config.weeklyQuestXp : config.dailyQuestXp;
    var state = readRaw(); applyReward(state, xp, Math.floor(xp / config.sessionSparksDivisor));
    return { xp: xp, sparks: Math.floor(xp / config.sessionSparksDivisor), state: write(state) };
  };
  Meta.recordSeasonScore = function (gameId, mode, score, targets, date) {
    var state = readRaw(), now = date instanceof Date ? date : new Date(), gid = String(gameId || '').slice(0, 64), mid = String(mode || 'classic').slice(0, 48), value = Math.floor(nonNegative(score));
    if (!gid || !Array.isArray(targets) || targets.length < 3) return { ok: false, state: state };
    var week = localWeekKey(now), key = gid + ':' + mid, season = state.seasons[week] || {}, record = season[key] || { best: 0, trophy: '', board: [] };
    var tier = value >= Number(targets[2]) ? 'gold' : value >= Number(targets[1]) ? 'silver' : value >= Number(targets[0]) ? 'bronze' : '';
    record.best = Math.max(Number(record.best) || 0, value);
    if (tier === 'gold' || (!record.trophy && tier) || (tier === 'silver' && record.trophy === 'bronze')) record.trophy = tier;
    var entries = Array.isArray(record.board) ? record.board.slice() : [];
    if (value > 0) entries.push({ score: value, at: now.toISOString() });
    record.board = entries.sort(function (a, b) { return Number(b.score) - Number(a.score) || String(a.at).localeCompare(String(b.at)); }).slice(0, 10);
    season[key] = record; state.seasons[week] = season;
    if (tier) {
      var trophyId = 'season:' + week + ':' + key + ':' + tier;
      if (!state.trophies.some(function (item) { return (typeof item === 'string' ? item : item.id) === trophyId; })) state.trophies.push({ id: trophyId, gameId: gid, rarity: tier === 'gold' ? 'legendary' : tier === 'silver' ? 'epic' : 'rare', day: dayKey(now) });
    }
    return { ok: true, week: week, best: record.best, trophy: record.trophy, state: write(state) };
  };
  Meta.getSeasonLeaderboard = function (gameId, mode, date) {
    var state = readRaw(), now = date instanceof Date ? date : new Date(), week = localWeekKey(now), key = String(gameId || '') + ':' + String(mode || 'classic'), record = state.seasons[week] && state.seasons[week][key];
    return { week: week, local: true, entries: record && Array.isArray(record.board) ? record.board.slice(0, 10) : [], best: record ? Number(record.best) || 0 : 0, trophy: record ? record.trophy || '' : '' };
  };
})();
