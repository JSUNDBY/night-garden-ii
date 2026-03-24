// ============================================================
// NIGHT GARDEN II — A living bioluminescent ecosystem
// ============================================================
// More dynamic than the original: growing plants, blooming flowers,
// swarming fireflies, aurora sky, glowing mushrooms, moths,
// wind-reactive foliage, and ambient generative audio.
// Click/tap to enter. Shift+F or double-click for fullscreen.
// Mouse movement creates wind currents that bend plants and
// attract fireflies.
// ============================================================

// ===== CONFIG =====
const MAX_PLANTS = 12;
const MAX_FLOWERS = 8;
const MAX_MUSHROOMS = 6;
const MAX_FIREFLIES = 60;
const MAX_MOTHS = 4;
const PLANT_GROW_SPEED = 0.004;
const BLOOM_SPEED = 0.003;

const SCALE_NOTES = [38, 42, 45, 50, 54, 57, 62, 66, 69];
const PALETTES = [
  { base: 270, spread: 60 },  // purple
  { base: 160, spread: 50 },  // teal
  { base: 320, spread: 40 },  // magenta
  { base: 200, spread: 50 },  // blue
  { base: 80, spread: 40 },   // chartreuse
  { base: 30, spread: 50 },   // amber
];

// ===== STATE =====
let plants = [];
let flowers = [];
let mushrooms = [];
let fireflies = [];
let moths = [];
let pollen = [];
let bgStars = [];
let shootingStars = [];
let auroraLayers = [];
let treeline = [];
let groundLine = [];

let windX = 0, windY = 0;
let targetWindX = 0, targetWindY = 0;
let globalTime = 0;
let spawnTimer = 0;

// Audio
let audioCtx, masterGain, compressor, convolver, dryGain, wetGain;
let delayNode, delayFeedback, delayFilter, delayGain;
let audioReady = false;
let voices = new Map();
let awaitingClick = true;
let lastMouseX = 0, lastMouseY = 0;

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(RADIANS);
  noCursor();
  textFont('monospace');

  initStars();
  initAurora();
  generateTreeline();
  generateGround();

  function startGarden() {
    if (!awaitingClick) return;
    awaitingClick = false;
    try { initAudio(); } catch (e) { console.error('Audio init error:', e); }
    // Seed initial garden
    for (let i = 0; i < 5; i++) spawnPlant();
    for (let i = 0; i < 3; i++) spawnFlower();
    for (let i = 0; i < 2; i++) spawnMushroom();
    for (let i = 0; i < 25; i++) spawnFirefly();
    for (let i = 0; i < 2; i++) spawnMoth();
  }

  document.addEventListener('touchstart', startGarden, { passive: true });
  document.addEventListener('touchend', startGarden, { passive: true });
  document.addEventListener('click', startGarden);
  document.addEventListener('pointerdown', startGarden);
}

// ===== STARS =====
function initStars() {
  bgStars = [];
  for (let i = 0; i < 300; i++) {
    bgStars.push({
      x: random(width), y: random(height * 0.75),
      size: random(0.3, 2.5),
      phase: random(TWO_PI),
      twinkleSpeed: random(0.005, 0.03),
      hueVal: random() < 0.7 ? 0 : random([210, 30, 350, 60, 180]),
      sat: random() < 0.7 ? 0 : random(15, 40),
      brightness: random(50, 100),
      baseAlpha: random(12, 50),
    });
  }
}

function drawStars() {
  noStroke();
  for (let s of bgStars) {
    let twinkle = sin(frameCount * s.twinkleSpeed + s.phase) * 0.4 + 0.6;
    let a = s.baseAlpha * twinkle;
    fill(s.hueVal, s.sat, s.brightness, a);
    ellipse(s.x, s.y, s.size);
    if (s.size > 1.6) {
      fill(s.hueVal, s.sat * 0.5, s.brightness, a * 0.12);
      ellipse(s.x, s.y, s.size * 4);
    }
  }
}

// ===== AURORA =====
function initAurora() {
  auroraLayers = [];
  for (let i = 0; i < 4; i++) {
    auroraLayers.push({
      hueVal: random([120, 160, 200, 280, 300]),
      yBase: random(0.05, 0.25),
      amplitude: random(0.02, 0.06),
      noiseOff: random(1000),
      speed: random(0.0003, 0.001),
      alpha: random(3, 8),
      thickness: random(0.04, 0.1),
    });
  }
}

function drawAurora() {
  noStroke();
  for (let layer of auroraLayers) {
    let yCenter = layer.yBase * height;
    let thick = layer.thickness * height;
    for (let x = 0; x < width; x += 4) {
      let n = noise(layer.noiseOff + x * 0.002, globalTime * layer.speed * 600);
      let yOff = (n - 0.5) * layer.amplitude * height;
      let shimmer = noise(layer.noiseOff + 500 + x * 0.005, globalTime * layer.speed * 1200);
      let a = layer.alpha * (0.5 + shimmer * 0.5);
      let h = (layer.hueVal + (n - 0.5) * 40 + 360) % 360;
      fill(h, 50, 90, a);
      rect(x, yCenter + yOff - thick / 2, 5, thick);
    }
  }
}

// ===== SHOOTING STARS =====
function updateShootingStars() {
  if (random() < 0.0008) {
    let dir = random() > 0.5 ? 1 : -1;
    shootingStars.push({
      x: dir > 0 ? random(width * 0.05, width * 0.5) : random(width * 0.5, width * 0.95),
      y: random(height * 0.03, height * 0.35),
      angle: random(PI * 0.05, PI * 0.35) * dir + (dir < 0 ? PI : 0),
      speed: random(6, 20),
      life: 1.0,
      decay: random(0.012, 0.04),
      len: random(40, 130),
      hueVal: random() < 0.6 ? 0 : random([200, 40, 180, 280]),
    });
  }
  noFill();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    let ss = shootingStars[i];
    ss.x += cos(ss.angle) * ss.speed;
    ss.y += sin(ss.angle) * ss.speed;
    ss.life -= ss.decay;
    if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }
    let tailX = ss.x - cos(ss.angle) * ss.len * ss.life;
    let tailY = ss.y - sin(ss.angle) * ss.len * ss.life;
    strokeWeight(1.5);
    stroke(ss.hueVal, 5, 100, ss.life * 70);
    line(ss.x, ss.y, lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15));
    strokeWeight(0.8);
    stroke(ss.hueVal, 5, 100, ss.life * 25);
    line(lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15), tailX, tailY);
    noStroke();
    fill(ss.hueVal, 5, 100, ss.life * 18);
    ellipse(ss.x, ss.y, 4);
  }
}

// ===== TREELINE =====
function generateTreeline() {
  treeline = [];
  let layers = [
    { yBase: 0.88, heightMin: 0.05, heightMax: 0.14, alpha: 95, detail: 0.006 },
    { yBase: 0.84, heightMin: 0.06, heightMax: 0.18, alpha: 70, detail: 0.004 },
    { yBase: 0.80, heightMin: 0.04, heightMax: 0.12, alpha: 45, detail: 0.003 },
  ];
  for (let layer of layers) {
    let points = [];
    let noiseOff = random(1000);
    for (let x = -10; x <= width + 10; x += 3) {
      let hill = noise(noiseOff + x * layer.detail) * (layer.heightMax - layer.heightMin) + layer.heightMin;
      let crowns = noise(noiseOff + 500 + x * 0.03) * 0.04;
      let fine = noise(noiseOff + 1000 + x * 0.08) * 0.015;
      let spike = 0;
      if (noise(noiseOff + 2000 + x * 0.015) > 0.6) {
        spike = noise(noiseOff + 3000 + x * 0.06) * 0.06;
      }
      let yNorm = layer.yBase - hill - crowns - fine - spike;
      points.push({ x: x, y: yNorm * height });
    }
    treeline.push({ points, alpha: layer.alpha });
  }
}

function drawTreeline() {
  noStroke();
  // Draw from back to front
  for (let i = treeline.length - 1; i >= 0; i--) {
    let layer = treeline[i];
    fill(180, 15, 3, layer.alpha);
    beginShape();
    vertex(0, height);
    for (let p of layer.points) vertex(p.x, p.y);
    vertex(width, height);
    endShape(CLOSE);
  }
}

// ===== GROUND =====
function generateGround() {
  groundLine = [];
  let noiseOff = random(1000);
  for (let x = -10; x <= width + 10; x += 2) {
    let y = height * 0.88 + noise(noiseOff + x * 0.005) * height * 0.03;
    groundLine.push({ x, y });
  }
}

function getGroundY(px) {
  for (let i = 0; i < groundLine.length - 1; i++) {
    if (groundLine[i].x <= px && groundLine[i + 1].x > px) {
      let t = (px - groundLine[i].x) / (groundLine[i + 1].x - groundLine[i].x);
      return lerp(groundLine[i].y, groundLine[i + 1].y, t);
    }
  }
  return height * 0.88;
}

function drawGround() {
  // Dark earth gradient
  noStroke();
  fill(160, 20, 4, 100);
  beginShape();
  vertex(0, height);
  for (let p of groundLine) vertex(p.x, p.y);
  vertex(width, height);
  endShape(CLOSE);

  // Subtle moss glow on the ground line
  for (let i = 0; i < groundLine.length; i += 3) {
    let p = groundLine[i];
    let glow = noise(p.x * 0.01, globalTime * 0.3) * 0.5 + 0.5;
    fill(120, 50, 30, glow * 6);
    ellipse(p.x, p.y, random(3, 8), 2);
  }
}

// ===== PLANT (growing vine/stem) =====
class Plant {
  constructor(x) {
    this.baseX = x;
    this.baseY = getGroundY(x);
    this.growth = 0; // 0 to 1
    this.targetGrowth = 1;
    this.maxHeight = random(60, 200);
    this.segments = Math.floor(random(8, 20));
    this.swayPhase = random(TWO_PI);
    this.swayAmp = random(0.02, 0.06);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.hue2 = (this.hueVal + random(40, 80)) % 360;
    this.branchChance = random(0.2, 0.5);
    this.branches = [];
    this.noiseOff = random(1000);
    this.alive = true;
    this.lifespan = random(1200, 3000);
    this.age = 0;
    this.dying = false;
    this.deathAlpha = 1;
    this.hasTip = random() < 0.6;
    this.tipSize = random(3, 8);

    // Pre-generate branches
    for (let i = 0; i < this.segments; i++) {
      if (random() < this.branchChance && i > 2) {
        this.branches.push({
          segIdx: i,
          side: random() > 0.5 ? 1 : -1,
          len: random(15, 50),
          angle: random(0.3, 1.0),
          curl: random(-0.3, 0.3),
          hasLeaf: random() < 0.7,
          leafSize: random(3, 7),
          leafHue: (this.hue2 + random(-20, 20) + 360) % 360,
        });
      }
    }
  }

  update() {
    this.age++;
    if (this.growth < this.targetGrowth) {
      this.growth = min(this.growth + PLANT_GROW_SPEED, this.targetGrowth);
    }
    if (this.age > this.lifespan && !this.dying) {
      this.dying = true;
    }
    if (this.dying) {
      this.deathAlpha -= 0.002;
      if (this.deathAlpha <= 0) this.alive = false;
    }

    // Shed pollen occasionally
    if (this.growth > 0.8 && random() < 0.005 && !this.dying) {
      let tipPos = this.getTipPos();
      pollen.push(new Pollen(tipPos.x, tipPos.y, this.hueVal));
    }
  }

  getTipPos() {
    let pts = this.getSegmentPoints();
    return pts[pts.length - 1] || { x: this.baseX, y: this.baseY };
  }

  getSegmentPoints() {
    let pts = [{ x: this.baseX, y: this.baseY }];
    let visibleSegs = Math.floor(this.segments * this.growth);
    for (let i = 1; i <= visibleSegs; i++) {
      let t = i / this.segments;
      let segH = (this.maxHeight / this.segments) * this.growth;
      // Wind + sway
      let sway = sin(frameCount * 0.008 + this.swayPhase + t * 2) * this.swayAmp * this.maxHeight * t;
      sway += windX * t * 20;
      let noiseWarp = (noise(this.noiseOff + t * 3, globalTime * 0.5) - 0.5) * 10 * t;
      let px = this.baseX + sway + noiseWarp;
      let py = this.baseY - segH * i;
      pts.push({ x: px, y: py });
    }
    return pts;
  }

  draw() {
    let pts = this.getSegmentPoints();
    if (pts.length < 2) return;
    let a = this.deathAlpha;

    // Main stem
    noFill();
    for (let w = 0; w < 3; w++) {
      let weight = map(w, 0, 2, 2.5, 0.5) * (1 - 0.3 * (1 - this.growth));
      let alpha = map(w, 0, 2, 15, 6) * a;
      stroke(this.hueVal, 40, 60, alpha);
      strokeWeight(weight);
      beginShape();
      for (let p of pts) curveVertex(p.x, p.y);
      if (pts.length >= 2) curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
      endShape();
    }

    // Glow along stem
    noStroke();
    for (let i = 0; i < pts.length; i++) {
      let t = i / pts.length;
      let pulse = sin(frameCount * 0.01 + t * 4 + this.swayPhase) * 0.3 + 0.7;
      fill(this.hueVal, 50, 80, 4 * pulse * a);
      ellipse(pts[i].x, pts[i].y, 8 * (1 - t * 0.5));
    }

    // Branches
    for (let br of this.branches) {
      if (br.segIdx >= pts.length) continue;
      let origin = pts[br.segIdx];
      let t = br.segIdx / this.segments;
      let windBend = windX * 0.5;
      let bAngle = -HALF_PI + br.side * br.angle + sin(frameCount * 0.006 + br.segIdx) * 0.1 + windBend * br.side;
      let bLen = br.len * this.growth;
      let midX = origin.x + cos(bAngle + br.curl) * bLen * 0.5;
      let midY = origin.y + sin(bAngle + br.curl) * bLen * 0.5;
      let endX = origin.x + cos(bAngle) * bLen;
      let endY = origin.y + sin(bAngle) * bLen;

      stroke(this.hue2, 35, 55, 10 * a);
      strokeWeight(1);
      noFill();
      beginShape();
      curveVertex(origin.x, origin.y);
      curveVertex(origin.x, origin.y);
      curveVertex(midX, midY);
      curveVertex(endX, endY);
      curveVertex(endX, endY);
      endShape();

      // Leaf
      if (br.hasLeaf && this.growth > 0.5) {
        noStroke();
        let leafPulse = sin(frameCount * 0.008 + br.segIdx * 2) * 0.2 + 0.8;
        let ls = br.leafSize * leafPulse * this.growth;
        fill(br.leafHue, 55, 70, 18 * a);
        ellipse(endX, endY, ls, ls * 1.6);
        fill(br.leafHue, 40, 90, 8 * a);
        ellipse(endX, endY, ls * 0.5, ls * 0.8);
      }
    }

    // Glowing tip
    if (this.hasTip && this.growth > 0.7) {
      let tip = pts[pts.length - 1];
      let pulse = sin(frameCount * 0.015 + this.swayPhase) * 0.4 + 0.6;
      noStroke();
      fill(this.hueVal, 30, 100, 25 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize);
      fill(this.hueVal, 20, 100, 10 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 3);
      fill(0, 0, 100, 15 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 0.4);
    }
  }
}

// ===== FLOWER =====
class Flower {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.stemHeight = random(40, 120);
    this.bloom = 0; // 0 closed, 1 fully open
    this.bloomTarget = 0;
    this.bloomCycle = random(600, 1500); // frames per open/close cycle
    this.petalCount = Math.floor(random(5, 10));
    this.petalLen = random(10, 25);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-15, 15) + 360) % 360;
    this.hue2 = (this.hueVal + random(60, 120)) % 360;
    this.stemHue = (120 + random(-30, 30) + 360) % 360;
    this.phase = random(TWO_PI);
    this.noiseOff = random(1000);
    this.alive = true;
    this.age = 0;
    this.lifespan = random(1800, 4000);
    this.deathAlpha = 1;
    this.dying = false;
    this.growth = 0;
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.003, 1);

    // Bloom cycle — opens and closes
    let cyclePos = (frameCount + this.phase * 100) % this.bloomCycle;
    let t = cyclePos / this.bloomCycle;
    // Smoothly open for first half, close for second
    this.bloomTarget = t < 0.5 ? smoothstep(0, 0.5, t) : smoothstep(1, 0.5, t);
    this.bloom = lerp(this.bloom, this.bloomTarget, 0.02);

    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) {
      this.deathAlpha -= 0.0015;
      if (this.deathAlpha <= 0) this.alive = false;
    }

    // Release pollen when blooming
    if (this.bloom > 0.7 && random() < 0.008 && !this.dying) {
      let headPos = this.getHeadPos();
      pollen.push(new Pollen(headPos.x, headPos.y, this.hueVal));
    }
  }

  getHeadPos() {
    let sway = sin(frameCount * 0.006 + this.phase) * 8 + windX * 15;
    return {
      x: this.x + sway,
      y: this.baseY - this.stemHeight * this.growth
    };
  }

  draw() {
    let a = this.deathAlpha;
    let sway = sin(frameCount * 0.006 + this.phase) * 8 + windX * 15;
    let headX = this.x + sway;
    let headY = this.baseY - this.stemHeight * this.growth;

    // Stem
    stroke(this.stemHue, 40, 45, 15 * a);
    strokeWeight(1.5);
    noFill();
    beginShape();
    curveVertex(this.x, this.baseY);
    curveVertex(this.x, this.baseY);
    curveVertex(this.x + sway * 0.3, this.baseY - this.stemHeight * 0.4 * this.growth);
    curveVertex(headX, headY);
    curveVertex(headX, headY);
    endShape();

    if (this.growth < 0.3) return;

    // Petals
    push();
    translate(headX, headY);
    let openAngle = this.bloom * HALF_PI * 0.8;
    for (let p = 0; p < this.petalCount; p++) {
      let baseAngle = (TWO_PI / this.petalCount) * p - HALF_PI;
      let spreadAngle = baseAngle * (0.3 + this.bloom * 0.7);
      let pLen = this.petalLen * (0.4 + this.bloom * 0.6) * this.growth;
      let petalHue = lerpHue(this.hueVal, this.hue2, p / this.petalCount);

      // Petal body
      noStroke();
      fill(petalHue, 60, 85, 20 * a);
      push();
      rotate(spreadAngle);
      ellipse(0, -pLen * 0.5, pLen * 0.4, pLen);
      // Inner glow
      fill(petalHue, 40, 100, 10 * a);
      ellipse(0, -pLen * 0.4, pLen * 0.2, pLen * 0.6);
      pop();
    }

    // Center
    let centerPulse = sin(frameCount * 0.02 + this.phase) * 0.2 + 0.8;
    fill(this.hueVal, 30, 100, 30 * this.bloom * centerPulse * a);
    noStroke();
    ellipse(0, 0, 5 * this.growth);
    fill(0, 0, 100, 20 * this.bloom * centerPulse * a);
    ellipse(0, 0, 2 * this.growth);
    // Glow halo when open
    fill(this.hueVal, 20, 100, 5 * this.bloom * a);
    ellipse(0, 0, this.petalLen * 2 * this.bloom);
    pop();
  }
}

// ===== MUSHROOM =====
class Mushroom {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.capWidth = random(12, 30);
    this.capHeight = random(8, 16);
    this.stemH = random(10, 30);
    this.stemW = random(3, 7);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.hue2 = (this.hueVal + 60) % 360;
    this.phase = random(TWO_PI);
    this.growth = 0;
    this.alive = true;
    this.age = 0;
    this.lifespan = random(2000, 5000);
    this.dying = false;
    this.deathAlpha = 1;
    this.spotCount = Math.floor(random(3, 7));
    this.spots = [];
    for (let i = 0; i < this.spotCount; i++) {
      this.spots.push({
        angle: random(-PI * 0.8, PI * 0.8),
        dist: random(0.2, 0.8),
        size: random(1.5, 4),
      });
    }
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.005, 1);
    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) {
      this.deathAlpha -= 0.002;
      if (this.deathAlpha <= 0) this.alive = false;
    }
    // Emit spores
    if (this.growth > 0.9 && random() < 0.01 && !this.dying) {
      let capTop = this.baseY - this.stemH * this.growth - this.capHeight * this.growth * 0.5;
      pollen.push(new Pollen(
        this.x + random(-this.capWidth * 0.4, this.capWidth * 0.4),
        capTop,
        this.hueVal, true
      ));
    }
  }

  draw() {
    let a = this.deathAlpha;
    let g = this.growth;
    let pulse = sin(frameCount * 0.012 + this.phase) * 0.15 + 0.85;
    let capY = this.baseY - this.stemH * g;

    // Bioluminescent ground glow
    noStroke();
    fill(this.hueVal, 40, 70, 5 * pulse * a * g);
    ellipse(this.x, this.baseY, this.capWidth * 3, 8);

    // Stem
    fill(this.hueVal, 20, 40, 20 * a);
    rectMode(CENTER);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g, this.stemH * g, 2);
    // Stem glow
    fill(this.hueVal, 30, 80, 5 * pulse * a);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g * 0.5, this.stemH * g, 2);
    rectMode(CORNER);

    // Cap
    fill(this.hueVal, 50, 60, 25 * a);
    arc(this.x, capY, this.capWidth * g, this.capHeight * g * 2, PI, TWO_PI, CHORD);

    // Cap glow
    fill(this.hueVal, 35, 90, 10 * pulse * a);
    arc(this.x, capY, this.capWidth * g * 0.7, this.capHeight * g * 1.4, PI, TWO_PI, CHORD);

    // Spots
    for (let spot of this.spots) {
      let sx = this.x + cos(spot.angle) * this.capWidth * 0.35 * spot.dist * g;
      let sy = capY - abs(sin(spot.angle)) * this.capHeight * 0.4 * spot.dist * g;
      fill(this.hue2, 30, 100, 15 * pulse * a);
      ellipse(sx, sy, spot.size * g);
    }

    // Top glow aura
    fill(this.hueVal, 25, 100, 4 * pulse * a * g);
    ellipse(this.x, capY - this.capHeight * g * 0.3, this.capWidth * 2 * g, this.capHeight * 2 * g);
  }
}

// ===== FIREFLY =====
class Firefly {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.4, height * 0.9);
    this.vx = 0;
    this.vy = 0;
    this.hueVal = random([50, 60, 80, 120, 40]); // warm yellows, greens
    this.size = random(1.5, 3.5);
    this.phase = random(TWO_PI);
    this.glowSpeed = random(0.015, 0.04);
    this.noiseX = random(1000);
    this.noiseY = random(1000);
    this.wanderSpeed = random(0.3, 0.8);
    this.alive = true;
  }

  update() {
    // Noise-driven wandering
    let nx = noise(this.noiseX, globalTime * 2) - 0.5;
    let ny = noise(this.noiseY, globalTime * 2) - 0.5;
    this.vx += nx * 0.15 + windX * 0.3;
    this.vy += ny * 0.15 + windY * 0.1;
    // Damping
    this.vx *= 0.95;
    this.vy *= 0.95;
    // Speed limit
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > this.wanderSpeed) {
      this.vx = (this.vx / spd) * this.wanderSpeed;
      this.vy = (this.vy / spd) * this.wanderSpeed;
    }
    this.x += this.vx;
    this.y += this.vy;

    // Attraction to mouse (gentle)
    let dm = dist(this.x, this.y, mouseX, mouseY);
    if (dm < 200 && dm > 20) {
      this.vx += (mouseX - this.x) * 0.0003;
      this.vy += (mouseY - this.y) * 0.0003;
    }

    // Keep in bounds
    if (this.x < -20) this.x = width + 20;
    if (this.x > width + 20) this.x = -20;
    if (this.y < height * 0.2) this.vy += 0.02;
    if (this.y > height * 0.95) this.vy -= 0.05;

    this.noiseX += 0.005;
    this.noiseY += 0.005;
  }

  draw() {
    let glow = sin(frameCount * this.glowSpeed + this.phase);
    // Fireflies blink — sharp on/off cycle
    let brightness = glow > 0.2 ? map(glow, 0.2, 1, 0.3, 1) : 0.05;

    noStroke();
    // Outer glow
    fill(this.hueVal, 40, 100, 4 * brightness);
    ellipse(this.x, this.y, this.size * 10);
    // Mid glow
    fill(this.hueVal, 50, 100, 12 * brightness);
    ellipse(this.x, this.y, this.size * 4);
    // Core
    fill(this.hueVal, 30, 100, 40 * brightness);
    ellipse(this.x, this.y, this.size);
    // Hot center
    fill(0, 0, 100, 25 * brightness);
    ellipse(this.x, this.y, this.size * 0.4);
  }
}

// ===== MOTH =====
class Moth {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.2, height * 0.7);
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.3, 0.3);
    this.wingSpan = random(8, 18);
    this.flapSpeed = random(0.08, 0.15);
    this.hueVal = random([270, 290, 30, 40, 200]);
    this.hue2 = (this.hueVal + random(30, 60)) % 360;
    this.phase = random(TWO_PI);
    this.noiseOff = random(1000);
    this.alive = true;
    this.targetX = random(width);
    this.targetY = random(height * 0.2, height * 0.7);
    this.retargetTimer = 0;
  }

  update() {
    this.retargetTimer++;
    // Pick new target occasionally, or head toward brightest flower/mushroom
    if (this.retargetTimer > random(180, 600)) {
      this.retargetTimer = 0;
      // Attracted to flowers and mushrooms
      let targets = [...flowers, ...mushrooms].filter(f => f.alive && f.growth > 0.5);
      if (targets.length > 0 && random() < 0.6) {
        let t = random(targets);
        this.targetX = t.x + random(-30, 30);
        this.targetY = (t.baseY || t.y) - random(20, 60);
      } else {
        this.targetX = random(width * 0.1, width * 0.9);
        this.targetY = random(height * 0.15, height * 0.7);
      }
    }

    // Steer toward target
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 5) {
      this.vx += (dx / d) * 0.02;
      this.vy += (dy / d) * 0.02;
    }

    // Noise flutter
    this.vx += (noise(this.noiseOff, globalTime * 3) - 0.5) * 0.1;
    this.vy += (noise(this.noiseOff + 100, globalTime * 3) - 0.5) * 0.1;
    this.vx += windX * 0.2;

    this.vx *= 0.97;
    this.vy *= 0.97;
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 1.5) { this.vx *= 1.5 / spd; this.vy *= 1.5 / spd; }

    this.x += this.vx;
    this.y += this.vy;

    // Bounds
    this.x = constrain(this.x, -30, width + 30);
    this.y = constrain(this.y, height * 0.05, height * 0.85);

    this.noiseOff += 0.01;
  }

  draw() {
    let flap = sin(frameCount * this.flapSpeed + this.phase);
    let wingAngle = flap * 0.6; // Wing fold amount
    let bodyAngle = atan2(this.vy, this.vx);

    push();
    translate(this.x, this.y);
    rotate(bodyAngle);

    // Wings
    let ws = this.wingSpan;
    noStroke();

    // Upper wings
    for (let side = -1; side <= 1; side += 2) {
      push();
      scale(1, side);
      rotate(wingAngle * 0.5);
      fill(this.hueVal, 40, 60, 18);
      ellipse(-ws * 0.1, -ws * 0.3, ws * 0.8, ws * 0.5);
      fill(this.hue2, 30, 80, 10);
      ellipse(-ws * 0.1, -ws * 0.25, ws * 0.5, ws * 0.3);
      // Wing spots
      fill(this.hueVal, 20, 100, 12);
      ellipse(0, -ws * 0.3, ws * 0.15, ws * 0.15);
      pop();
    }

    // Lower wings
    for (let side = -1; side <= 1; side += 2) {
      push();
      scale(1, side);
      rotate(-wingAngle * 0.3);
      fill(this.hueVal, 35, 50, 14);
      ellipse(ws * 0.15, -ws * 0.15, ws * 0.5, ws * 0.35);
      pop();
    }

    // Body
    fill(this.hueVal, 20, 40, 25);
    ellipse(0, 0, ws * 0.35, ws * 0.12);
    fill(0, 0, 100, 8);
    ellipse(-ws * 0.1, 0, 2, 2);

    // Dust trail
    if (random() < 0.3) {
      pollen.push(new Pollen(
        this.x + random(-3, 3),
        this.y + random(-3, 3),
        this.hueVal, false, true
      ));
    }

    pop();
  }
}

// ===== POLLEN / SPORE =====
class Pollen {
  constructor(x, y, hueVal, isSpore, isTiny) {
    this.x = x;
    this.y = y;
    this.hueVal = hueVal;
    this.size = isTiny ? random(0.5, 1.2) : (isSpore ? random(1, 2.5) : random(1.5, 3));
    this.life = 1;
    this.decay = isTiny ? random(0.01, 0.03) : random(0.002, 0.008);
    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.4, -0.1);
    this.isSpore = isSpore;
    this.noiseOff = random(1000);
  }

  update() {
    this.vx += windX * 0.05 + (noise(this.noiseOff, globalTime * 3) - 0.5) * 0.05;
    this.vy += (noise(this.noiseOff + 50, globalTime * 3) - 0.5) * 0.05;
    if (this.isSpore) this.vy -= 0.01; // spores float up
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.noiseOff += 0.02;
  }

  draw() {
    noStroke();
    let a = this.life;
    fill(this.hueVal, 30, 100, a * 15);
    ellipse(this.x, this.y, this.size);
    fill(this.hueVal, 20, 100, a * 6);
    ellipse(this.x, this.y, this.size * 2.5);
  }

  isDead() { return this.life <= 0; }
}

// ===== SPAWN FUNCTIONS =====
function spawnPlant() {
  if (plants.length >= MAX_PLANTS) return;
  plants.push(new Plant(random(width * 0.03, width * 0.97)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(SCALE_NOTES.length))], Math.floor(random(25, 55)));
}

function spawnFlower() {
  if (flowers.length >= MAX_FLOWERS) return;
  flowers.push(new Flower(random(width * 0.05, width * 0.95)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(4, SCALE_NOTES.length))], Math.floor(random(30, 60)));
}

function spawnMushroom() {
  if (mushrooms.length >= MAX_MUSHROOMS) return;
  mushrooms.push(new Mushroom(random(width * 0.05, width * 0.95)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(3))], Math.floor(random(20, 45)));
}

function spawnFirefly() {
  if (fireflies.length >= MAX_FIREFLIES) return;
  fireflies.push(new Firefly());
}

function spawnMoth() {
  if (moths.length >= MAX_MOTHS) return;
  moths.push(new Moth());
}

// ===== DRAW =====
function draw() {
  globalTime += 0.001;
  background(0);

  // Wind from mouse movement
  let mx = mouseX - lastMouseX;
  let my = mouseY - lastMouseY;
  targetWindX = constrain(mx * 0.01, -0.5, 0.5);
  targetWindY = constrain(my * 0.005, -0.2, 0.2);
  windX = lerp(windX, targetWindX, 0.02);
  windY = lerp(windY, targetWindY, 0.02);
  // Ambient wind drift
  windX += (noise(globalTime * 200) - 0.5) * 0.002;
  lastMouseX = mouseX;
  lastMouseY = mouseY;

  // Sky
  drawStars();
  drawAurora();
  updateShootingStars();

  if (awaitingClick) {
    drawTreeline();
    drawGround();
    drawStartPrompt();
    return;
  }

  // Auto-spawn life
  spawnTimer++;
  if (spawnTimer % 300 === 0) spawnPlant();
  if (spawnTimer % 500 === 0) spawnFlower();
  if (spawnTimer % 700 === 0) spawnMushroom();
  if (spawnTimer % 120 === 0) spawnFirefly();
  if (spawnTimer % 900 === 0) spawnMoth();

  // Draw layers back to front
  drawTreeline();
  drawGround();

  // Mushrooms (on ground)
  for (let i = mushrooms.length - 1; i >= 0; i--) {
    mushrooms[i].update();
    mushrooms[i].draw();
    if (!mushrooms[i].alive) mushrooms.splice(i, 1);
  }

  // Plants
  for (let i = plants.length - 1; i >= 0; i--) {
    plants[i].update();
    plants[i].draw();
    if (!plants[i].alive) plants.splice(i, 1);
  }

  // Flowers
  for (let i = flowers.length - 1; i >= 0; i--) {
    flowers[i].update();
    flowers[i].draw();
    if (!flowers[i].alive) flowers.splice(i, 1);
  }

  // Moths
  for (let i = moths.length - 1; i >= 0; i--) {
    moths[i].update();
    moths[i].draw();
    if (!moths[i].alive) moths.splice(i, 1);
  }

  // Fireflies
  for (let ff of fireflies) {
    ff.update();
    ff.draw();
  }

  // Pollen / spores
  for (let i = pollen.length - 1; i >= 0; i--) {
    pollen[i].update();
    pollen[i].draw();
    if (pollen[i].isDead()) pollen.splice(i, 1);
  }
  while (pollen.length > 400) pollen.shift();

  // Firefly connections — nearby fireflies get faint threads
  drawFireflyConnections();
}

// ===== FIREFLY CONNECTIONS =====
function drawFireflyConnections() {
  stroke(55, 30, 100, 3);
  strokeWeight(0.3);
  for (let i = 0; i < fireflies.length; i++) {
    for (let j = i + 1; j < fireflies.length; j++) {
      let d = dist(fireflies[i].x, fireflies[i].y, fireflies[j].x, fireflies[j].y);
      if (d < 60) {
        let a = map(d, 0, 60, 4, 0);
        stroke(55, 30, 100, a);
        line(fireflies[i].x, fireflies[i].y, fireflies[j].x, fireflies[j].y);
      }
    }
  }
  noStroke();
}

// ===== AUDIO =====
function initAudio() {
  if (audioReady) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    let silentSrc = audioCtx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(audioCtx.destination);
    silentSrc.start(0);
    audioCtx.resume();

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(20, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.15, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.45, audioCtx.currentTime);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

    // Cathedral reverb
    let irLen = Math.min(Math.floor(audioCtx.sampleRate * 4.5), 198000);
    let ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      let data = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.3);
      }
    }
    let convolver = audioCtx.createConvolver();
    convolver.buffer = ir;
    wetGain = audioCtx.createGain();
    wetGain.gain.setValueAtTime(0.75, audioCtx.currentTime);

    // Delay
    delayNode = audioCtx.createDelay(3.0);
    delayNode.delayTime.setValueAtTime(1.4, audioCtx.currentTime);
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(0.3, audioCtx.currentTime);
    delayFilter = audioCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
    delayGain = audioCtx.createGain();
    delayGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    masterGain.connect(dryGain);
    dryGain.connect(compressor);
    masterGain.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(compressor);
    masterGain.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayGain);
    delayGain.connect(compressor);

    audioReady = true;
  } catch (e) {
    console.error('Audio init failed:', e);
  }
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function playNote(note, velocity) {
  if (!audioReady) return;
  if (voices.has(note)) releaseNote(note);

  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = velocity / 127;

  let carrier = audioCtx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, now);

  let carrier2 = audioCtx.createOscillator();
  carrier2.type = 'sine';
  carrier2.frequency.setValueAtTime(freq * 1.003, now);

  let carrier3 = audioCtx.createOscillator();
  carrier3.type = 'sine';
  carrier3.frequency.setValueAtTime(freq * 0.997, now);

  let sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq / 2, now);
  let subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.1 * vel, now);
  sub.connect(subGain);

  let fifth = audioCtx.createOscillator();
  fifth.type = 'sine';
  fifth.frequency.setValueAtTime(freq * 1.498, now);
  let fifthGain = audioCtx.createGain();
  fifthGain.gain.setValueAtTime(0.03 * vel, now);
  fifthGain.gain.exponentialRampToValueAtTime(Math.max(0.01 * vel, 0.001), now + 3);
  fifth.connect(fifthGain);

  let modulator = audioCtx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(freq * 2, now);
  let modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(15 * vel, now);
  modGain.gain.exponentialRampToValueAtTime(Math.max(2 * vel, 0.01), now + 3);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500 + vel * 700, now);
  filter.Q.setValueAtTime(0.5, now);

  let voiceGain = audioCtx.createGain();
  voiceGain.gain.setValueAtTime(0.001, now);
  voiceGain.gain.linearRampToValueAtTime(vel * 0.12, now + 2.5);
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(vel * 0.08, 0.001), now + 7);

  let c2Gain = audioCtx.createGain();
  c2Gain.gain.setValueAtTime(0.4, now);
  carrier2.connect(c2Gain);

  let c3Gain = audioCtx.createGain();
  c3Gain.gain.setValueAtTime(0.4, now);
  carrier3.connect(c3Gain);

  carrier.connect(filter);
  c2Gain.connect(filter);
  c3Gain.connect(filter);
  subGain.connect(filter);
  fifthGain.connect(filter);
  filter.connect(voiceGain);
  voiceGain.connect(masterGain);

  modulator.start(now);
  carrier.start(now);
  carrier2.start(now);
  carrier3.start(now);
  sub.start(now);
  fifth.start(now);

  voices.set(note, { carrier, carrier2, carrier3, modulator, sub, fifth, modGain, subGain, fifthGain, c2Gain, c3Gain, filter, voiceGain });

  // Auto-release
  let holdMs = random(4000, 12000);
  setTimeout(() => releaseNote(note), holdMs);
}

function releaseNote(note) {
  let voice = voices.get(note);
  if (!voice) return;
  let now = audioCtx.currentTime;
  let rel = 6.0;

  voice.voiceGain.gain.cancelScheduledValues(now);
  voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
  voice.voiceGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
  voice.modGain.gain.cancelScheduledValues(now);
  voice.modGain.gain.setValueAtTime(voice.modGain.gain.value, now);
  voice.modGain.gain.exponentialRampToValueAtTime(0.01, now + rel);
  voice.subGain.gain.cancelScheduledValues(now);
  voice.subGain.gain.setValueAtTime(voice.subGain.gain.value, now);
  voice.subGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
  voice.fifthGain.gain.cancelScheduledValues(now);
  voice.fifthGain.gain.setValueAtTime(voice.fifthGain.gain.value, now);
  voice.fifthGain.gain.exponentialRampToValueAtTime(0.001, now + rel);

  let stopTime = now + rel + 0.2;
  voice.carrier.stop(stopTime);
  voice.carrier2.stop(stopTime);
  voice.carrier3.stop(stopTime);
  voice.modulator.stop(stopTime);
  voice.sub.stop(stopTime);
  voice.fifth.stop(stopTime);

  setTimeout(() => voices.delete(note), (rel + 0.5) * 1000);
}

// ===== HELPERS =====
function lerpHue(h1, h2, t) {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (h1 + diff * t + 360) % 360;
}

function smoothstep(edge0, edge1, x) {
  let t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function toggleFullscreen() {
  let doc = document.documentElement;
  if (!document.fullscreenElement) doc.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

// ===== START PROMPT =====
function drawStartPrompt() {
  let pulse = sin(frameCount * 0.012) * 8 + 55;
  fill(0, 0, 100, pulse);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('TAP TO ENTER THE GARDEN', width / 2, height * 0.4);
  textSize(12);
  fill(0, 0, 45, pulse * 0.4);
  text('turn sound on', width / 2, height * 0.4 + 30);
  textSize(10);
  fill(0, 0, 35, pulse * 0.3);
  text('Shift + F for fullscreen', width / 2, height * 0.4 + 52);
}

// ===== INPUT =====
function keyPressed() {
  if (key === 'F') { toggleFullscreen(); return false; }
  if (awaitingClick && (key === ' ' || key === 'Enter')) {
    awaitingClick = false;
    try { initAudio(); } catch (e) {}
    for (let i = 0; i < 5; i++) spawnPlant();
    for (let i = 0; i < 3; i++) spawnFlower();
    for (let i = 0; i < 2; i++) spawnMushroom();
    for (let i = 0; i < 25; i++) spawnFirefly();
    for (let i = 0; i < 2; i++) spawnMoth();
    return false;
  }
  return false;
}

function mousePressed() {
  if (awaitingClick) return;
  // Click to plant something at mouse position
  let r = random();
  if (r < 0.4) {
    plants.push(new Plant(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(SCALE_NOTES.length))], Math.floor(random(30, 60)));
  } else if (r < 0.7) {
    flowers.push(new Flower(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(4, SCALE_NOTES.length))], Math.floor(random(35, 65)));
  } else {
    mushrooms.push(new Mushroom(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(3))], Math.floor(random(20, 50)));
  }
  // Burst of fireflies from click point
  for (let i = 0; i < 5; i++) {
    let ff = new Firefly();
    ff.x = mouseX + random(-30, 30);
    ff.y = mouseY + random(-30, 30);
    fireflies.push(ff);
  }
  while (fireflies.length > MAX_FIREFLIES + 20) fireflies.shift();
}

function doubleClicked() {
  toggleFullscreen();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initStars();
  generateTreeline();
  generateGround();
}
