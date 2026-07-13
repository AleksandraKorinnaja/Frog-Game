/* ============================================================================
   FROG DNA SYSTEM
   ----------------------------------------------------------------------------
   Drop-in genetics + rendering engine for a frog-collecting/breeding game.

   THE BIG IDEA
   Instead of storing a picture, every frog stores DNA: a set of "genes".
   Each gene is DIPLOID (two alleles, just like real biology / Pokemon):

       horns: { a: 'ram', b: 'none' }

   The frog VISUALLY shows whichever allele is more "dominant" (see the
   `dom` field on each option below - lower number = more dominant).
   The other allele rides along silently as a HIDDEN / recessive gene and
   can pop out in babies. That's what gives you the "looks green, secretly
   carries blue" behavior for free, with real Punnett-square math instead
   of hand-waving.

   Rendering is just: for each layer, look up the frog's *visible* allele,
   and draw/stack the matching asset (or apply a CSS tint for color genes).
   Nothing is hand drawn per-frog. Add a new PNG + one line in TRAITS below
   and it's instantly breedable and renderable.

   HOW TO USE THIS FILE
   1. Drop this file next to your game (or paste its contents into your
      existing <script> block).
   2. Point ASSET_BASE at wherever your per-trait PNGs live.
   3. Generate a first-generation frog:      FrogDNA.hatchDNA()
   4. Breed two frogs:                       FrogDNA.breedDNA(mom, dad)
   5. Get an HTML string to drop into the DOM:
                                              FrogDNA.renderFrogHTML(dna, 160)
   6. Get just the human-readable traits (for a "grimoire" style panel):
                                              FrogDNA.getPhenotype(dna)

   Everything below TRAITS is generic engine code - you should not need to
   touch it when you add new traits. You only edit the TRAITS table and
   drop in art.
============================================================================ */

(function (global) {
  "use strict";

  const CONFIG = {
    ASSET_BASE: "assets/frog",
    DEFAULT_MUTATION_CHANCE: 0.05,
    RARITY_TIERS: [
      { name: "Common", min: 0 },
      { name: "Uncommon", min: 45 },
      { name: "Rare", min: 68 },
      { name: "Epic", min: 85 },
      { name: "Legendary", min: 95 },
      { name: "Mythic", min: 99 },
    ],
  };

  const TRAITS = {
    bodyShape: {
      layer: "body",
      kind: "asset",
      options: [
        { k: "round", n: "Round", w: 40, dom: 1 },
        { k: "chubby", n: "Chubby", w: 25, dom: 2 },
        { k: "slender", n: "Slender", w: 20, dom: 3 },
        { k: "tall", n: "Tall", w: 15, dom: 4 },
      ],
    },
    bodyColor: {
      layer: "body",
      kind: "tint",
      options: [
        { k: "green", n: "Green", w: 20, dom: 1, hue: 100 },
        { k: "blue", n: "Blue", w: 12, dom: 2, hue: 210 },
        { k: "yellow", n: "Yellow", w: 10, dom: 3, hue: 50 },
        { k: "purple", n: "Purple", w: 8, dom: 4, hue: 280 },
        { k: "pink", n: "Pink", w: 8, dom: 5, hue: 330 },
        { k: "orange", n: "Orange", w: 8, dom: 6, hue: 25 },
        { k: "white", n: "White", w: 7, dom: 7, hue: 0, sat: 0, bright: 1.6 },
        { k: "grey", n: "Grey", w: 6, dom: 8, hue: 0, sat: 0, bright: 1.0 },
        { k: "brown", n: "Brown", w: 6, dom: 9, hue: 30, sat: 0.6, bright: 0.85 },
        { k: "black", n: "Black", w: 4, dom: 10, hue: 0, sat: 0, bright: 0.4 },
        { k: "mint", n: "Mint", w: 6, dom: 11, hue: 150 },
        { k: "peach", n: "Peach", w: 5, dom: 12, hue: 20, sat: 0.5, bright: 1.2 },
        { k: "gold", n: "Gold", w: 0.5, dom: 0, hue: 45, sat: 1.6, bright: 1.3, tier: "Legendary" },
      ],
    },
    bellyColor: {
      layer: "belly",
      kind: "tint",
      options: [
        { k: "cream", n: "Cream", w: 40, dom: 1, hue: 40, sat: 0.3, bright: 1.4 },
        { k: "white", n: "White", w: 30, dom: 2, hue: 0, sat: 0, bright: 1.6 },
        { k: "yellow", n: "Yellow", w: 15, dom: 3, hue: 50 },
        { k: "pink", n: "Pink", w: 10, dom: 4, hue: 330 },
        { k: "none", n: "None", w: 5, dom: 5, kind: "none" },
      ],
    },
    pattern: {
      layer: "pattern",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 40, dom: 1, kind: "none" },
        { k: "spots", n: "Spots", w: 20, dom: 2 },
        { k: "freckles", n: "Freckles", w: 15, dom: 3 },
        { k: "stars", n: "Stars", w: 8, dom: 4, tier: "Rare" },
        { k: "flowers", n: "Flowers", w: 6, dom: 5, tier: "Rare" },
        { k: "moss", n: "Moss", w: 5, dom: 6, tier: "Rare" },
        { k: "marbled", n: "Marbled", w: 3, dom: 7, tier: "Epic" },
        { k: "crystal", n: "Crystal", w: 2, dom: 8, tier: "Epic" },
        { k: "glow", n: "Glow", w: 1, dom: 0, tier: "Legendary" },
      ],
    },
    patternColor: {
      layer: "pattern",
      kind: "tint",
      options: [
        { k: "dark_green", n: "Dark Green", w: 30, dom: 1, hue: 110, bright: 0.6 },
        { k: "white", n: "White", w: 25, dom: 2, hue: 0, sat: 0, bright: 1.6 },
        { k: "black", n: "Black", w: 20, dom: 3, hue: 0, sat: 0, bright: 0.3 },
        { k: "gold", n: "Gold", w: 10, dom: 4, hue: 45, sat: 1.4 },
        { k: "silver", n: "Silver", w: 10, dom: 5, hue: 0, sat: 0.1, bright: 1.3 },
        { k: "rainbow", n: "Rainbow", w: 1, dom: 0, tier: "Mythic", css: "hue-rotate(0deg) saturate(2)" },
      ],
    },
    eyeType: {
      layer: "eyes",
      kind: "asset",
      options: [
        { k: "round", n: "Round", w: 35, dom: 1 },
        { k: "large", n: "Large", w: 20, dom: 2 },
        { k: "sleepy", n: "Sleepy", w: 15, dom: 3 },
        { k: "closed", n: "Closed", w: 10, dom: 4 },
        { k: "heart", n: "Heart", w: 8, dom: 5, tier: "Rare" },
        { k: "star", n: "Star", w: 6, dom: 6, tier: "Rare" },
        { k: "spiral", n: "Spiral", w: 3, dom: 0, tier: "Epic" },
      ],
    },
    eyeColor: {
      layer: "eyes",
      kind: "tint",
      options: [
        { k: "black", n: "Black", w: 40, dom: 1, hue: 0, sat: 0, bright: 0.2 },
        { k: "brown", n: "Brown", w: 20, dom: 2, hue: 30, sat: 0.7, bright: 0.5 },
        { k: "blue", n: "Blue", w: 12, dom: 3, hue: 210 },
        { k: "green", n: "Green", w: 12, dom: 4, hue: 110 },
        { k: "gold", n: "Gold", w: 8, dom: 5, hue: 45, sat: 1.3 },
        { k: "purple", n: "Purple", w: 5, dom: 6, hue: 280 },
        { k: "red", n: "Red", w: 3, dom: 0, hue: 0, sat: 1.4, tier: "Rare" },
      ],
    },
    mouth: {
      layer: "mouth",
      kind: "asset",
      options: [
        { k: "smile", n: "Smile", w: 45, dom: 1 },
        { k: "neutral", n: "Neutral", w: 25, dom: 2 },
        { k: "open", n: "Open", w: 12, dom: 3 },
        { k: "tongue", n: "Tongue Out", w: 8, dom: 4, tier: "Rare" },
        { k: "surprised", n: "Surprised", w: 6, dom: 5 },
        { k: "fang", n: "Fang", w: 4, dom: 0, tier: "Rare" },
      ],
    },
    cheeks: {
      layer: "cheeks",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 55, dom: 1, kind: "none" },
        { k: "blush", n: "Blush", w: 30, dom: 2 },
        { k: "freckled", n: "Freckled", w: 10, dom: 3 },
        { k: "dimples", n: "Dimples", w: 5, dom: 0, tier: "Rare" },
      ],
    },
    horns: {
      layer: "horns",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 55, dom: 1, kind: "none" },
        { k: "tiny", n: "Tiny", w: 20, dom: 2 },
        { k: "ram", n: "Ram", w: 10, dom: 3, tier: "Rare" },
        { k: "goat", n: "Goat", w: 6, dom: 4, tier: "Rare" },
        { k: "antlers", n: "Antlers", w: 4, dom: 5, tier: "Rare" },
        { k: "flower", n: "Flower", w: 2, dom: 6, tier: "Epic" },
        { k: "mushroom", n: "Mushroom", w: 1.5, dom: 7, tier: "Epic" },
        { k: "coral", n: "Coral", w: 1, dom: 8, tier: "Epic" },
        { k: "crystal", n: "Crystal", w: 0.4, dom: 9, tier: "Legendary" },
        { k: "demon", n: "Demon", w: 0.1, dom: 0, tier: "Mythic" },
      ],
    },
    hair: {
      layer: "hair",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 60, dom: 1, kind: "none" },
        { k: "tuft", n: "Tuft", w: 20, dom: 2 },
        { k: "mohawk", n: "Mohawk", w: 8, dom: 3, tier: "Rare" },
        { k: "curly", n: "Curly", w: 6, dom: 4 },
        { k: "long", n: "Long", w: 4, dom: 5, tier: "Rare" },
        { k: "flower_crown", n: "Flower Crown", w: 2, dom: 0, tier: "Epic" },
      ],
    },
    hat: {
      layer: "hat",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 65, dom: 1, kind: "none" },
        { k: "mushroom_cap", n: "Mushroom Cap", w: 15, dom: 2 },
        { k: "flower_hat", n: "Flower Hat", w: 8, dom: 3, tier: "Rare" },
        { k: "party_hat", n: "Party Hat", w: 5, dom: 4 },
        { k: "bow_hat", n: "Bow Hat", w: 4, dom: 5, tier: "Rare" },
        { k: "top_hat", n: "Top Hat", w: 2, dom: 6, tier: "Epic" },
        { k: "wizard_hat", n: "Wizard Hat", w: 0.8, dom: 7, tier: "Epic" },
        { k: "crown", n: "Crown", w: 0.2, dom: 0, tier: "Mythic" },
      ],
    },
    wings: {
      layer: "wings",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 60, dom: 1, kind: "none" },
        { k: "leaf", n: "Leaf", w: 15, dom: 2 },
        { k: "butterfly", n: "Butterfly", w: 10, dom: 3, tier: "Rare" },
        { k: "bee", n: "Bee", w: 6, dom: 4, tier: "Rare" },
        { k: "bat", n: "Bat", w: 4, dom: 5, tier: "Rare" },
        { k: "fairy", n: "Fairy", w: 2.5, dom: 6, tier: "Epic" },
        { k: "ghost", n: "Ghost", w: 1.5, dom: 7, tier: "Epic" },
        { k: "dragon", n: "Dragon", w: 0.5, dom: 8, tier: "Legendary" },
        { k: "angel", n: "Angel", w: 0.1, dom: 0, tier: "Mythic" },
      ],
    },
    tail: {
      layer: "tail",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 55, dom: 1, kind: "none" },
        { k: "curl", n: "Curl", w: 25, dom: 2 },
        { k: "fin", n: "Fin", w: 10, dom: 3, tier: "Rare" },
        { k: "fluffy", n: "Fluffy", w: 6, dom: 4, tier: "Rare" },
        { k: "feather", n: "Feather", w: 4, dom: 0, tier: "Epic" },
      ],
    },
    clothing: {
      layer: "clothing",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 70, dom: 1, kind: "none" },
        { k: "scarf", n: "Scarf", w: 15, dom: 2 },
        { k: "sweater", n: "Sweater", w: 8, dom: 3, tier: "Rare" },
        { k: "cape", n: "Cape", w: 5, dom: 4, tier: "Rare" },
        { k: "robe", n: "Robe", w: 2, dom: 0, tier: "Epic" },
      ],
    },
    accessory: {
      layer: "accessory",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 60, dom: 1, kind: "none" },
        { k: "bow", n: "Bow", w: 15, dom: 2 },
        { k: "necklace", n: "Necklace", w: 10, dom: 3 },
        { k: "glasses", n: "Glasses", w: 8, dom: 4, tier: "Rare" },
        { k: "backpack", n: "Backpack", w: 4, dom: 5, tier: "Rare" },
        { k: "monocle", n: "Monocle", w: 2, dom: 6, tier: "Epic" },
        { k: "crown", n: "Crown", w: 1, dom: 0, tier: "Legendary" },
      ],
    },
    aura: {
      layer: "aura",
      kind: "asset",
      options: [
        { k: "none", n: "None", w: 82, dom: 1, kind: "none" },
        { k: "sparkles", n: "Sparkles", w: 8, dom: 2, tier: "Rare" },
        { k: "hearts", n: "Hearts", w: 5, dom: 3, tier: "Rare" },
        { k: "fireflies", n: "Fireflies", w: 3, dom: 4, tier: "Epic" },
        { k: "smoke", n: "Smoke", w: 1.5, dom: 5, tier: "Epic" },
        { k: "glow", n: "Glow", w: 0.5, dom: 0, tier: "Legendary" },
      ],
    },
    shadow: {
      layer: "shadow",
      kind: "asset",
      options: [
        { k: "soft", n: "Soft", w: 90, dom: 1 },
        { k: "none", n: "None", w: 8, dom: 2, kind: "none" },
        { k: "glow_ring", n: "Glow Ring", w: 2, dom: 0, tier: "Rare" },
      ],
    },
  };

  const LAYER_ORDER = [
    "shadow", "body", "belly", "pattern", "eyes", "mouth", "cheeks",
    "horns", "hair", "hat", "wings", "tail", "clothing", "accessory", "aura",
  ];

  const TINT_TARGETS = {
    bodyColor: "bodyShape",
    bellyColor: null,
    patternColor: "pattern",
    eyeColor: "eyeType",
  };

  const LAYER_FALLBACK_ASSETS = {
    eyes: "round",
  };

  function normalizedPick(options, rng) {
    const total = options.reduce((sum, o) => sum + o.w, 0);
    let roll = rng() * total;
    for (const o of options) {
      if (roll < o.w) return o;
      roll -= o.w;
    }
    return options[options.length - 1];
  }

  function optionByKey(geneName, key) {
    const gene = TRAITS[geneName];
    return gene.options.find((o) => o.k === key) || gene.options[0];
  }

  function pickRandomAllele(geneName, rng) {
    return normalizedPick(TRAITS[geneName].options, rng).k;
  }

  function expressedAllele(geneName, alleleA, alleleB) {
    const a = optionByKey(geneName, alleleA);
    const b = optionByKey(geneName, alleleB);
    return a.dom <= b.dom ? alleleA : alleleB;
  }

  function defaultRng() {
    return Math.random();
  }

  function hatchDNA(rng) {
    rng = rng || defaultRng;
    const genes = {};
    for (const geneName in TRAITS) {
      genes[geneName] = {
        a: pickRandomAllele(geneName, rng),
        b: pickRandomAllele(geneName, rng),
      };
    }
    return {
      id: cryptoRandomId(),
      genes,
      stats: rollFreshStats(rng),
    };
  }

  function cryptoRandomId() {
    return Date.now().toString(36) + Math.floor(rngGlobal() * 1e9).toString(36);
  }

  function rngGlobal() {
    return Math.random();
  }

  function rollFreshStats(rng) {
    return {
      strength: 5 + Math.floor(rng() * 15),
      speed: 5 + Math.floor(rng() * 15),
      magic: 5 + Math.floor(rng() * 15),
    };
  }

  function breedDNA(mother, father, opts) {
    opts = opts || {};
    const rng = opts.rng || defaultRng;
    const baseMutation = opts.mutationChance != null ? opts.mutationChance : CONFIG.DEFAULT_MUTATION_CHANCE;
    const perGene = opts.mutationChanceByGene || {};

    const genes = {};
    for (const geneName in TRAITS) {
      const mutationChance = perGene[geneName] != null ? perGene[geneName] : baseMutation;
      genes[geneName] = {
        a: inheritOneAllele(geneName, mother.genes[geneName], mutationChance, rng),
        b: inheritOneAllele(geneName, father.genes[geneName], mutationChance, rng),
      };
    }

    return {
      id: cryptoRandomId(),
      genes,
      parents: [mother.id, father.id],
      stats: breedStats(mother.stats, father.stats, rng),
    };
  }

  function inheritOneAllele(geneName, parentPair, mutationChance, rng) {
    if (rng() < mutationChance) {
      return pickRandomAllele(geneName, rng);
    }
    return rng() < 0.5 ? parentPair.a : parentPair.b;
  }

  function breedStats(a, b, rng) {
    const jitter = () => Math.floor((rng() - 0.5) * 4);
    const bigRoll = rng() < 0.03;
    const mix = (x, y) => Math.max(1, Math.round((x + y) / 2 + jitter() + (bigRoll ? 5 : 0)));
    return {
      strength: mix(a.strength, b.strength),
      speed: mix(a.speed, b.speed),
      magic: mix(a.magic, b.magic),
    };
  }

  function getPhenotype(dna) {
    const out = {};
    for (const geneName in TRAITS) {
      const pair = dna.genes[geneName];
      const visibleKey = expressedAllele(geneName, pair.a, pair.b);
      out[geneName] = optionByKey(geneName, visibleKey).n;
    }
    return out;
  }

  function getHiddenGenes(dna) {
    const out = {};
    for (const geneName in TRAITS) {
      const pair = dna.genes[geneName];
      const visibleKey = expressedAllele(geneName, pair.a, pair.b);
      const hiddenKey = visibleKey === pair.a ? pair.b : pair.a;
      if (hiddenKey !== visibleKey) {
        out[geneName] = optionByKey(geneName, hiddenKey).n;
      }
    }
    return out;
  }

  const TIER_RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };

  function computeOverallRarity(dna) {
    let best = "Common";
    for (const geneName in TRAITS) {
      const pair = dna.genes[geneName];
      const visibleKey = expressedAllele(geneName, pair.a, pair.b);
      const opt = optionByKey(geneName, visibleKey);
      const tier = opt.tier || "Common";
      if (TIER_RANK[tier] > TIER_RANK[best]) best = tier;
    }
    return best;
  }

  function assetPath(layer, key) {
    return `${CONFIG.ASSET_BASE}/${layer}/${key}.png`;
  }

  function tintFilterFor(opt) {
    if (opt.css) return opt.css;
    if (opt.hue == null) return "";
    const sat = opt.sat != null ? opt.sat : 1;
    const bright = opt.bright != null ? opt.bright : 1;
    return `hue-rotate(${opt.hue}deg) saturate(${sat}) brightness(${bright})`;
  }

  function renderFrogHTML(dna, size) {
    size = size || 120;

    const layerAsset = {};
    for (const layer of LAYER_ORDER) layerAsset[layer] = { key: null, filter: "" };

    for (const geneName in TRAITS) {
      const gene = TRAITS[geneName];
      const pair = dna.genes[geneName];
      const visibleKey = expressedAllele(geneName, pair.a, pair.b);
      const opt = optionByKey(geneName, visibleKey);
      const kind = opt.kind || gene.kind;

      if (kind === "tint") {
        const targetGene = TINT_TARGETS[geneName];
        const targetLayer = targetGene ? TRAITS[targetGene].layer : gene.layer;
        layerAsset[targetLayer].filter = tintFilterFor(opt);
        if (!targetGene && !layerAsset[targetLayer].key) {
          layerAsset[targetLayer].key = "base";
        }
      } else if (kind === "asset") {
        layerAsset[gene.layer].key = visibleKey;
      }
    }

    let html = `<span style="position:relative;display:inline-block;width:${size}px;height:${size}px;">`;
    for (const layer of LAYER_ORDER) {
      const { key, filter } = layerAsset[layer];
      if (!key) continue;
      const src = assetPath(layer, key);
      const fallbackKey = LAYER_FALLBACK_ASSETS[layer];
      const fallbackSrc = fallbackKey && fallbackKey !== key ? assetPath(layer, fallbackKey) : "";
      const style = [
        "position:absolute", "left:0", "top:0", `width:${size}px`, `height:${size}px`,
        "object-fit:contain", "pointer-events:none",
      ];
      if (filter) style.push(`filter:${filter}`);
      html += `<img src="${src}" data-fallback="${fallbackSrc}" style="${style.join(";")}" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';}else{this.style.display='none'}" alt="${layer}">`;
    }
    html += "</span>";
    return html;
  }

  const FrogDNA = {
    CONFIG,
    TRAITS,
    LAYER_ORDER,
    hatchDNA,
    breedDNA,
    getPhenotype,
    getHiddenGenes,
    computeOverallRarity,
    renderFrogHTML,
    _internal: { expressedAllele, optionByKey, pickRandomAllele, tintFilterFor },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FrogDNA;
  } else {
    global.FrogDNA = FrogDNA;
  }
})(typeof window !== "undefined" ? window : globalThis);
