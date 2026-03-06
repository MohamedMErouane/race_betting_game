"use client";
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as Phaser from 'phaser';
import { useGameStore } from '@/lib/gameStore';

const BASE_WIDTH = 400;
const BASE_HEIGHT = 700;

// Coin racer file names (order matches racer IDs 1-10 in gameStore)
const COIN_NAMES = ['bonk', 'wif', 'dodge', 'brett', 'pengu', 'Pnut', 'floki', 'pengy', 'pepe', 'shib'];

// Background layer parallax speeds (0 = static, 1 = moves with camera)
const PARALLAX = {
  clouds:      0.05,
  backtrees:   0.15,
  trees:       0.25,
  backplants:  0.35,
  roadback:    0.85,
  roadmain:    1.0,
  fence:       1.0,
  frontplants: 1.15,
};

class RaceScene extends Phaser.Scene {
  racers: Phaser.GameObjects.Sprite[] = [];
  finishLineX: number = 850;
  raceStarted: boolean = false;
  winnerIndex: number | null = null;
  finishOrder: number[] = [];
  racerFinished: boolean[] = [];
  raceEndPending: boolean = false;
  raceEndTime: number = 0;
  countdown: number = 3;
  countdownText: Phaser.GameObjects.Text | null = null;
  racerSpeeds: number[] = [];

  finishLine: Phaser.GameObjects.Graphics | null = null;
  lanes: Phaser.GameObjects.Rectangle[] = [];
  racerLabels: Phaser.GameObjects.Text[] = [];
  finishCallback: ((finishOrder: number[]) => void) | null = null;
  isReady: boolean = false;
  racerPhases: number[] = [];
  racerPaceFactors: number[] = [];
  racerVelocity: number[] = [];
  racerAcceleration: number[] = [];
  racerNoise: number[] = [];
  racerReactionDelayMs: number[] = [];
  racerBoostUntil: number[] = [];
  racerBoostMultiplier: number[] = [];
  earlyLeaderIndex: number = 0;
  chaserIndices: number[] = [];
  midSurgerIndex: number = 0;
  trailerIndex: number = 0;
  finalSprintIndices: number[] = [];
  finalWinnerIndex: number = 0;
  midSurgeWindowStart: number = 0.38;
  midSurgeWindowEnd: number = 0.54;
  finalSprintTriggered: boolean = false;
  packHoldDurationMs: number = 0;
  dispersionRampDurationMs: number = 700;
  racerDispersionBias: number[] = [];
  racerBreakoutProgress: number[] = [];
  raceBaseXStart: number = 0;
  raceDistance: number = 0;

  // Parallax background tile-sprites
  bgLayers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  cloudSprites: Phaser.GameObjects.Image[] = [];
  skyGfx: Phaser.GameObjects.Graphics | null = null;

  // Camera / world
  worldWidth: number = 0;
  cameraScrollX: number = 0;
  allFinished: boolean = false;
  cameraYOffset: number = 0;
  prevCameraScrollX: number = 0;

  // Race timing
  raceStartTime: number = 0;
  raceDuration: number = 10000; // ~10 seconds theoretical, ~9-10s actual with speed multipliers

  // ---------- helpers ----------

  chooseRaceRoles() {
    const indices = Phaser.Utils.Array.Shuffle([...Array(this.racers.length).keys()]);
    this.earlyLeaderIndex = indices[0];
    this.chaserIndices = [indices[1], indices[2]];
    this.midSurgerIndex = indices[3];
    this.trailerIndex = indices[4];
    this.finalWinnerIndex = indices[5];
    this.midSurgeWindowStart = Phaser.Math.FloatBetween(0.36, 0.46);
    this.midSurgeWindowEnd = this.midSurgeWindowStart + Phaser.Math.FloatBetween(0.13, 0.17);
  }

  getTopIndices(count: number): number[] {
    return this.racers
      .map((racer, index) => ({ index, x: racer.x }))
      .sort((a, b) => b.x - a.x)
      .slice(0, count)
      .map((entry) => entry.index);
  }

  // ---------- preload ----------

  preload() {
    // Coin racer images (1080×1080 each)
    COIN_NAMES.forEach((name, i) => {
      this.load.image(`racer${i + 1}`, `/assets/coins/${name}.png`);
    });

    // Background environment PNGs (all 1080px tall)
    this.load.image('bg-backtrees',   '/assets/bg/backtrees-02.png');
    this.load.image('bg-trees',       '/assets/bg/trees.png');
    this.load.image('bg-backplants',  '/assets/bg/back-plants.png');
    this.load.image('bg-roadback',    '/assets/bg/road-back-pattern.png');
    this.load.image('bg-roadmain',    '/assets/bg/road-main.png');
    this.load.image('bg-fence1',      '/assets/bg/fence1.png');
    this.load.image('bg-fence2',      '/assets/bg/fence2.png');
    this.load.image('bg-frontplants', '/assets/bg/front-plants.png');
    this.load.image('bg-cloud1',      '/assets/bg/cloud1.png');
    this.load.image('bg-cloud2',      '/assets/bg/cloud2.png');
    this.load.image('bg-cloud3',      '/assets/bg/cloud3.png');
    this.load.image('bg-cloud4',      '/assets/bg/cloud4.png');
  }

  // ---------- background ----------

  /**
   * Add a full-viewport TileSprite layer.
   * Every source image is 1080 px tall so we scale uniformly to fill the viewport
   * height and tile seamlessly in the horizontal direction.
   * `tilePositionX` is updated each frame for parallax.
   */
  addParallaxLayer(
    textureKey: string,
    speed: number,
    depth: number,
  ): Phaser.GameObjects.TileSprite {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const scale = vh / 1080;
    // visible width in *texture* coordinates
    const texVisibleW = Math.ceil(vw / scale);

    const ts = this.add.tileSprite(vw / 2, vh / 2, texVisibleW, 1080, textureKey);
    ts.setScale(scale);
    ts.setScrollFactor(0, 0); // pinned to camera
    ts.setDepth(depth);

    this.bgLayers.push({ sprite: ts, speed });
    return ts;
  }

  createBackground() {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const scale = vh / 1080;

    // 1. Sky gradient (solid, camera-fixed)
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4A90D9, 0x4A90D9, 1);
    sky.fillRect(0, 0, vw, vh);
    sky.setScrollFactor(0);
    sky.setDepth(0);
    this.skyGfx = sky;

    // 2. Clouds – individual images scattered across the sky band
    const cloudKeys = ['bg-cloud1', 'bg-cloud2', 'bg-cloud3', 'bg-cloud4'];
    const cloudCount = 8;
    for (let c = 0; c < cloudCount; c++) {
      const key = cloudKeys[c % cloudKeys.length];
      const tex = this.textures.get(key).getSourceImage();
      const cw = tex.width * scale * 0.45;
      const ch = tex.height * scale * 0.45;
      const cx = Phaser.Math.Between(0, vw);
      const cy = Phaser.Math.Between(Math.floor(vh * 0.02), Math.floor(vh * 0.22));
      const cloud = this.add.image(cx, cy, key);
      cloud.setDisplaySize(cw, ch);
      cloud.setScrollFactor(0);
      cloud.setDepth(1);
      cloud.setAlpha(0.85);
      cloud.setData('baseX', cx);
      this.cloudSprites.push(cloud);
    }

    // 3-9. Parallax tile-sprite layers (back → front)
    this.addParallaxLayer('bg-backtrees',   PARALLAX.backtrees,   2);
    this.addParallaxLayer('bg-trees',       PARALLAX.trees,       3);
    this.addParallaxLayer('bg-backplants',  PARALLAX.backplants,  4);
    this.addParallaxLayer('bg-roadback',    PARALLAX.roadback,    5);
    this.addParallaxLayer('bg-roadmain',    PARALLAX.roadmain,    6);
    this.addParallaxLayer('bg-fence2',      PARALLAX.fence,       8);
    this.addParallaxLayer('bg-frontplants', PARALLAX.frontplants, 9);
  }

  /** Checkerboard finish line drawn with Graphics (lives in world space). */
  drawCheckerboardFinishLine(x: number, h: number): Phaser.GameObjects.Graphics {
    const gfx = this.add.graphics();
    const cols = 2;
    const cellW = 10;
    const rows = Math.ceil(h / cellW);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const white = (r + c) % 2 === 0;
        gfx.fillStyle(white ? 0xffffff : 0x000000, 0.9);
        gfx.fillRect(x + c * cellW, r * cellW, cellW, cellW);
      }
    }
    return gfx;
  }

  // ---------- create ----------

  create() {
    const width  = this.scale.width;
    const height = this.scale.height;
    this.cameraYOffset = 0;

    // World = 14× viewport width — wider world = faster parallax scrolling for exciting visuals
    this.worldWidth = width * 14;

    // PNG parallax background (fixed to camera, scrolls via tilePosition)
    this.createBackground();

    // Finish line near end of world
    this.finishLineX = this.worldWidth - width * 0.6;

    // Checkerboard finish
    this.finishLine = this.drawCheckerboardFinishLine(this.finishLineX - 10, height);
    this.finishLine.setDepth(7);

    // Camera bounds
    this.cameras.main.setBounds(0, 0, this.worldWidth, height);
    this.cameras.main.setScroll(0, 0);
    this.cameraScrollX = 0;
    this.prevCameraScrollX = 0;

    // --- Racers ---
    const numRacers = 10;
    // Road area roughly 28 %–88 % of viewport height (where road-main sits)
    const roadTopY     = height * 0.28;
    const roadBottomY  = height * 0.88;
    const roadPadding  = height * 0.008;
    const topMargin    = roadTopY + roadPadding;
    const availableH   = roadBottomY - roadTopY - roadPadding * 2;
    const laneHeight   = availableH / numRacers;
    const racerXStart  = width * 0.14;

    // Coin images are 1080×1080; scale large to fill the road (like reference)
    const targetSize = laneHeight * 2.1;
    const racerScale = Phaser.Math.Clamp(targetSize / 1080, 0.17, 0.28);

    this.raceBaseXStart = racerXStart;
    this.raceDistance   = this.finishLineX - racerXStart;

    for (let i = 0; i < numRacers; i++) {
      const laneY = topMargin + i * laneHeight + laneHeight / 2;

      const racer = this.add.sprite(racerXStart, laneY, `racer${i + 1}`);
      racer.setScale(racerScale);
      racer.setDepth(7);
      racer.setData('initialY', laneY);
      racer.setData('initialX', racerXStart);
      this.racers.push(racer);
    }

    // Arrays
    this.racerSpeeds          = new Array(10).fill(0);
    this.racerVelocity        = new Array(10).fill(0);
    this.racerAcceleration    = new Array(10).fill(0);
    this.racerNoise           = new Array(10).fill(0);
    this.racerReactionDelayMs = new Array(10).fill(0);
    this.racerBoostUntil      = new Array(10).fill(0);
    this.racerBoostMultiplier = new Array(10).fill(1);
    this.racerDispersionBias  = new Array(10).fill(0);
    this.racerBreakoutProgress= new Array(10).fill(0.3);

    // Countdown text (camera-fixed)
    const countdownFontSize = Math.max(60, Math.floor(120 * (width / BASE_WIDTH)));
    this.countdownText = this.add.text(width / 2, height / 2, '', {
      fontSize: `${countdownFontSize}px`,
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.countdownText.setOrigin(0.5);
    this.countdownText.setScrollFactor(0);
    this.countdownText.setDepth(20);
    this.countdownText.setVisible(false);

    this.isReady = true;

    // Handle resize — reposition background layers to fill new viewport
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const newW = gameSize.width;
      const newH = gameSize.height;
      const newScale = newH / 1080;

      // Redraw sky gradient
      if (this.skyGfx) {
        this.skyGfx.clear();
        this.skyGfx.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4A90D9, 0x4A90D9, 1);
        this.skyGfx.fillRect(0, 0, newW, newH);
      }

      // Reposition & rescale tile-sprite layers
      for (const layer of this.bgLayers) {
        const texVisibleW = Math.ceil(newW / newScale);
        layer.sprite.setPosition(newW / 2, newH / 2);
        layer.sprite.setSize(texVisibleW, 1080);
        layer.sprite.setScale(newScale);
      }

      // Update camera bounds
      this.worldWidth = newW * 14;
      this.cameras.main.setBounds(0, 0, this.worldWidth, newH);
    });
  }

  // ---------- countdown / race start ----------

  startCountdown(callback: (finishOrder: number[]) => void) {
    this.finishCallback = callback;
    this.countdown = 3;
    this.winnerIndex = null;
    this.finishOrder = [];
    this.racerFinished = new Array(this.racers.length).fill(false);
    this.raceEndPending = false;
    this.raceEndTime = 0;
    this.raceStarted = false;
    this.finalSprintTriggered = false;
    this.finalSprintIndices = [];
    this.allFinished = false;

    this.racerVelocity        = new Array(this.racers.length).fill(0);
    this.racerAcceleration    = new Array(this.racers.length).fill(0);
    this.racerNoise           = new Array(this.racers.length).fill(0);
    this.racerReactionDelayMs = new Array(this.racers.length).fill(0);
    this.racerBoostUntil      = new Array(this.racers.length).fill(0);
    this.racerBoostMultiplier = new Array(this.racers.length).fill(1);
    this.racerDispersionBias  = new Array(this.racers.length).fill(0);
    this.racerBreakoutProgress= new Array(this.racers.length).fill(0.3);

    // Reset camera
    this.cameras.main.setScroll(0, this.cameraYOffset);
    this.cameraScrollX = 0;
    this.prevCameraScrollX = 0;

    // Reset parallax tile positions
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = 0;
    }

    // Reset racer positions
    this.racers.forEach((racer) => {
      racer.x = racer.getData('initialX') || this.scale.width * 0.15;
      racer.y = racer.getData('initialY');
    });

    if (this.countdownText) {
      this.countdownText.setVisible(true);
      this.runCountdown();
    }
  }

  runCountdown() {
    if (!this.countdownText) return;

    if (this.countdown > 0) {
      this.countdownText.setText(this.countdown.toString());
      this.countdownText.setScale(1.5);

      this.tweens.add({
        targets: this.countdownText,
        scale: 1,
        duration: 800,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.countdown--;
          if (this.countdown > 0) {
            setTimeout(() => this.runCountdown(), 200);
          } else {
            setTimeout(() => this.startRace(), 200);
          }
        },
      });
    }
  }

  startRace() {
    if (!this.countdownText) return;

    this.countdownText.setText('GO!');
    this.countdownText.setScale(2);
    this.countdownText.setColor('#00ff00');

    this.tweens.add({
      targets: this.countdownText,
      scale: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        if (this.countdownText) {
          this.countdownText.setVisible(false);
          this.countdownText.setAlpha(1);
          this.countdownText.setColor('#ffff00');
        }
      },
    });

    this.racerPaceFactors = this.racers.map(() => Phaser.Math.FloatBetween(0.98, 1.02));
    this.racerPhases      = this.racers.map(() => Phaser.Math.FloatBetween(0, Math.PI * 2));

    this.chooseRaceRoles();

    this.racerReactionDelayMs = this.racers.map(() => Phaser.Math.Between(0, 85));
    this.racerReactionDelayMs[this.earlyLeaderIndex] = Phaser.Math.Between(0, 20);
    this.chaserIndices.forEach((idx) => {
      this.racerReactionDelayMs[idx] = Phaser.Math.Between(10, 40);
    });

    this.racerVelocity        = this.racers.map(() => Phaser.Math.FloatBetween(10, 24));
    this.racerAcceleration    = this.racers.map(() => 0);
    this.racerNoise           = this.racers.map(() => Phaser.Math.FloatBetween(-0.02, 0.02));
    this.racerBoostUntil      = this.racers.map(() => 0);
    this.racerBoostMultiplier = this.racers.map(() => 1);
    this.racerDispersionBias  = this.racers.map(() => Phaser.Math.FloatBetween(-1.2, 1.2));
    this.racerBreakoutProgress= this.racers.map(() => Phaser.Math.FloatBetween(0.0, 0.22));
    Phaser.Utils.Array.Shuffle(this.racerBreakoutProgress);
    this.finalSprintTriggered = false;
    this.finalSprintIndices   = [];

    this.raceStartTime = this.time.now;
    this.raceStarted   = true;
  }

  // ---------- finish ----------

  onRacerCrossFinish(racerIndex: number) {
    if (this.racerFinished[racerIndex]) return;
    this.racerFinished[racerIndex] = true;
    this.finishOrder.push(racerIndex);

    const place = this.finishOrder.length;

    if (place === 1) {
      this.winnerIndex = racerIndex;
      if (this.finishLine) {
        this.tweens.add({ targets: this.finishLine, alpha: 1, duration: 100, yoyo: true, repeat: 3 });
      }
    }

    if (place <= 3) {
      const racer = this.racers[racerIndex];
      if (racer) {
        const cur = racer.scale;
        this.tweens.add({
          targets: racer,
          scale: cur * (place === 1 ? 1.35 : 1.15),
          yoyo: true,
          duration: 200,
          repeat: 1,
        });
      }
    }

    if (this.finishOrder.length >= this.racers.length && !this.raceEndPending) {
      this.allFinished = true;
      this.raceEndPending = true;
      this.raceEndTime = this.time.now + 1500;
    }
  }

  endRace() {
    this.raceStarted = false;
    if (this.finishCallback && this.finishOrder.length > 0) {
      const top3 = this.finishOrder.slice(0, 3);
      this.finishCallback(top3);
    }
  }

  /** Reset racers & background to starting positions (called when race finishes) */
  resetToStart() {
    this.raceStarted = false;
    this.allFinished = false;
    this.winnerIndex = null;
    this.finishOrder = [];
    this.racerFinished = new Array(this.racers.length).fill(false);
    this.raceEndPending = false;
    this.finalSprintTriggered = false;
    this.finalSprintIndices = [];
    this.racerVelocity = new Array(this.racers.length).fill(0);

    // Reset camera
    this.cameras.main.setScroll(0, this.cameraYOffset);
    this.cameraScrollX = 0;
    this.prevCameraScrollX = 0;

    // Reset parallax tile positions
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX = 0;
    }

    // Reset racer positions to starting line
    this.racers.forEach((racer) => {
      racer.x = racer.getData('initialX') || this.scale.width * 0.15;
      racer.y = racer.getData('initialY');
    });

    // Hide countdown text
    if (this.countdownText) {
      this.countdownText.setVisible(false);
    }
  }

  // ---------- update ----------

  update(_time: number, delta: number) {
    const width  = this.scale.width;
    const vh     = this.scale.height;
    const scale  = vh / 1080;

    // --- Idle bobbing ---
    if (!this.raceStarted) {
      const t = _time * 0.001;
      for (let i = 0; i < this.racers.length; i++) {
        const racer = this.racers[i];
        const initialY = racer.getData('initialY');
        racer.y = initialY + Math.sin(t * 1.5 + i * 0.7) * 1.2;
      }
      // Gentle cloud drift even while idle
      for (const cloud of this.cloudSprites) {
        const baseX = cloud.getData('baseX') as number;
        cloud.x = baseX + Math.sin(_time * 0.0002) * 15;
      }
      return;
    }

    // --- Race is running ---
    const speedScale  = this.scale.width / BASE_WIDTH;
    const bounceScale = Math.min(1.4, 1.4 * speedScale);
    const elapsed     = this.time.now - this.raceStartTime;
    const deltaSec    = Math.min(delta, 40) / 1000;
    const raceProgress = Phaser.Math.Clamp(elapsed / this.raceDuration, 0, 1.15);
    const launchCurve  = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(raceProgress / 0.2, 0, 1));
    const globalDispersionUnlock = Phaser.Math.Clamp(
      0.82 + (elapsed - this.packHoldDurationMs) / this.dispersionRampDurationMs,
      0,
      1,
    );

    if (!this.finalSprintTriggered && raceProgress >= 0.75) {
      this.finalSprintTriggered = true;
      this.finalSprintIndices = this.getTopIndices(3);
      if (!this.finalSprintIndices.includes(this.finalWinnerIndex)) {
        this.finalWinnerIndex =
          this.finalSprintIndices[Phaser.Math.Between(0, this.finalSprintIndices.length - 1)] ??
          this.finalWinnerIndex;
      }
    }

    const leaderX =
      this.racers.reduce((lead, racer) => Math.max(lead, racer.x), this.raceBaseXStart);
    const packCenterX =
      this.racers.reduce((sum, racer) => sum + racer.x, 0) / Math.max(1, this.racers.length);
    const baseCruiseSpeed = this.raceDistance / (this.raceDuration / 1000);

    // --- Move racers ---
    for (let i = 0; i < this.racers.length; i++) {
      const racer = this.racers[i];

      const paceFactor     = this.racerPaceFactors[i] ?? 1;
      const phase          = this.racerPhases[i] ?? 0;
      const reactionDelay  = this.racerReactionDelayMs[i] ?? 0;
      const reactionProgress = Phaser.Math.Clamp(
        (elapsed - reactionDelay) / (this.raceDuration * 0.25),
        0,
        1,
      );
      const reactionCurve = Phaser.Math.Easing.Cubic.Out(reactionProgress);

      // Smooth fluctuation noise
      const noiseTarget = Phaser.Math.FloatBetween(-0.03, 0.03);
      this.racerNoise[i] = Phaser.Math.Linear(this.racerNoise[i] ?? 0, noiseTarget, 0.04);
      const waveNoise =
        Math.sin(elapsed * 0.005 + phase) * 0.045 +
        Math.sin(elapsed * 0.011 + phase * 0.65) * 0.03;
      const racerBreakout = this.racerBreakoutProgress[i] ?? 0.3;
      const individualDispersionUnlock = Phaser.Math.Clamp(
        (raceProgress - racerBreakout) / 0.18,
        0,
        1,
      );
      const dispersionUnlock = Math.max(
        globalDispersionUnlock * 0.9,
        individualDispersionUnlock,
      );
      const speedNoise =
        ((this.racerNoise[i] ?? 0) + waveNoise) * (0.2 + dispersionUnlock * 0.9);

      let roleModifier = 1;

      // 0 %–20 %: launch phase
      if (raceProgress <= 0.2) {
        if (i === this.earlyLeaderIndex) roleModifier += 0.08 * dispersionUnlock;
        if (this.chaserIndices.includes(i)) roleModifier += 0.05 * dispersionUnlock;
        if (i === this.trailerIndex) roleModifier -= 0.03 * dispersionUnlock;
      }

      // 20 %–75 %: mid-race
      if (raceProgress > 0.2 && raceProgress < 0.75) {
        if (i === this.earlyLeaderIndex) roleModifier -= 0.018;
        if (i === this.midSurgerIndex) {
          const surgeProgress = Phaser.Math.Clamp(
            (raceProgress - this.midSurgeWindowStart) /
              (this.midSurgeWindowEnd - this.midSurgeWindowStart),
            0,
            1,
          );
          if (surgeProgress > 0 && surgeProgress < 1) {
            roleModifier += 0.11 * Math.sin(surgeProgress * Math.PI);
          }
        }
        if (i === this.trailerIndex) roleModifier -= 0.028;
      }

      // Temporary boosts
      if (
        raceProgress > 0.25 &&
        raceProgress < 0.93 &&
        dispersionUnlock > 0.35 &&
        this.time.now > (this.racerBoostUntil[i] ?? 0) &&
        Math.random() < 0.0014 + dispersionUnlock * 0.001
      ) {
        this.racerBoostUntil[i] = this.time.now + Phaser.Math.Between(280, 520);
        this.racerBoostMultiplier[i] = Phaser.Math.FloatBetween(1.06, 1.16);
      }
      const boostActive = this.time.now <= (this.racerBoostUntil[i] ?? 0);
      const boostTarget = boostActive ? (this.racerBoostMultiplier[i] ?? 1.1) : 1;
      this.racerBoostMultiplier[i] = Phaser.Math.Linear(
        this.racerBoostMultiplier[i] ?? 1,
        boostTarget,
        0.1,
      );

      // 75 %–100 %: final sprint
      if (raceProgress >= 0.75) {
        if (this.finalSprintIndices.includes(i)) {
          roleModifier += 0.045;
          if (i === this.finalWinnerIndex && raceProgress > 0.9) roleModifier += 0.085;
        }
      }

      const gapToLeader  = leaderX - racer.x;
      const catchup      = Phaser.Math.Clamp(gapToLeader / this.raceDistance, -0.04, 0.22);
      const catchupForce = catchup * (raceProgress < 0.75 ? 18 : 12);
      const packCohesionForce =
        (packCenterX - racer.x) * (1 - dispersionUnlock) * 0.02;
      const dispersionForce =
        (this.racerDispersionBias[i] ?? 0) * (96 + 142 * dispersionUnlock);

      // Separation
      const minSpacingPx = this.scale.width * 0.21;
      let separationForce = 0;
      for (let j = 0; j < this.racers.length; j++) {
        if (i === j) continue;
        const dx = racer.x - this.racers[j].x;
        const dist = Math.abs(dx);
        if (dist > 0 && dist < minSpacingPx) {
          separationForce += Math.sign(dx) * ((minSpacingPx - dist) / minSpacingPx) * 118;
        }
      }

      const desiredSpeed =
        baseCruiseSpeed *
        paceFactor *
        (0.3 + launchCurve * 0.85) *
        (0.78 + reactionCurve * 0.27) *
        roleModifier *
        (1 + speedNoise) *
        (this.racerBoostMultiplier[i] ?? 1);

      const currentVelocity   = this.racerVelocity[i] ?? 0;
      const accelerationForce =
        (desiredSpeed - currentVelocity) * 3.4 +
        catchupForce +
        packCohesionForce +
        dispersionForce +
        separationForce;
      const drag = currentVelocity * 0.015;

      this.racerAcceleration[i] = accelerationForce - drag;
      this.racerVelocity[i]     = currentVelocity + this.racerAcceleration[i] * deltaSec;
      this.racerVelocity[i]     = Phaser.Math.Clamp(
        this.racerVelocity[i],
        6,
        baseCruiseSpeed * 1.5,
      );

      racer.x += this.racerVelocity[i] * deltaSec;
      racer.x  = Math.max(this.raceBaseXStart - width * 0.02, racer.x);

      // Bounce
      const initialY = racer.getData('initialY');
      racer.y = initialY + Math.sin(racer.x * 0.018) * bounceScale;

      // Finish detection
      if (racer.x >= this.finishLineX && !this.racerFinished[i]) {
        this.onRacerCrossFinish(i);
      }
    }

    // --- Camera follow ---
    const cameraTarget       = packCenterX * 0.4 + leaderX * 0.6 - width * 0.35;
    const finishCenterTarget = this.finishLineX - width * 0.5;
    const finishApproach     = Phaser.Math.Clamp(
      (leaderX - (this.finishLineX - width)) / width,
      0,
      1,
    );
    const targetScrollX = Phaser.Math.Linear(cameraTarget, finishCenterTarget, finishApproach);
    const clampedTarget = Phaser.Math.Clamp(targetScrollX, 0, this.worldWidth - width);
    this.cameraScrollX  = Phaser.Math.Linear(this.cameraScrollX, clampedTarget, 0.06);
    this.cameras.main.setScroll(this.cameraScrollX, this.cameraYOffset);

    // --- Parallax: update tile positions ---
    for (const layer of this.bgLayers) {
      // tilePositionX is in *texture* pixels; convert from screen scroll
      layer.sprite.tilePositionX = (this.cameraScrollX * layer.speed) / scale;
    }

    // Clouds drift slowly
    for (const cloud of this.cloudSprites) {
      const baseX = cloud.getData('baseX') as number;
      cloud.x = baseX - this.cameraScrollX * PARALLAX.clouds + Math.sin(_time * 0.0003) * 12;
    }

    // --- End-race logic ---
    if (this.raceEndPending && this.time.now >= this.raceEndTime) {
      this.endRace();
      return;
    }

    // Safety finish – never drag beyond ~13 s
    if (this.finishOrder.length < this.racers.length && elapsed >= this.raceDuration * 1.35) {
      const remaining = this.racers
        .map((r, idx) => ({ idx, x: r.x }))
        .filter((r) => !this.racerFinished[r.idx])
        .sort((a, b) => b.x - a.x);
      remaining.forEach((r) => this.onRacerCrossFinish(r.idx));
      if (!this.raceEndPending) {
        this.raceEndPending = true;
        this.raceEndTime    = this.time.now + 800;
      }
    }
  }
}

// ========== React wrapper ==========

interface RaceGameProps {
  onRaceFinish?: (finishOrder: number[]) => void;
}

export interface RaceGameHandle {
  getTopIndices: (count: number) => number[];
}

const RaceGame = forwardRef<RaceGameHandle, RaceGameProps>(({ onRaceFinish }, ref) => {
  const gameRef       = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const sceneRef      = useRef<RaceScene | null>(null);
  const [dimensions, setDimensions]   = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const [sceneReady, setSceneReady]   = useState(false);
  const { gameState, startRace } = useGameStore();

  useImperativeHandle(ref, () => ({
    getTopIndices: (count: number) => {
      if (sceneRef.current && sceneRef.current.raceStarted) {
        return sceneRef.current.getTopIndices(count);
      }
      return [];
    },
  }), [sceneReady]);

  // Fill available viewport space
  useEffect(() => {
    const updateDimensions = () => {
      if (gameRef.current?.parentElement) {
        const rect = gameRef.current.parentElement.getBoundingClientRect();
        setDimensions({
          width:  Math.max(Math.round(rect.width), 320),
          height: Math.max(Math.round(rect.height), 300),
        });
      } else {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: dimensions.width,
      height: dimensions.height,
      parent: gameRef.current || undefined,
      scene: RaceScene,
      transparent: false,
      backgroundColor: '#4a8c3f',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
    };

    phaserGameRef.current = new Phaser.Game(config);

    const checkSceneReady = () => {
      if (phaserGameRef.current) {
        const scene = phaserGameRef.current.scene.scenes[0] as RaceScene;
        if (scene?.isReady) {
          sceneRef.current = scene;
          setSceneReady(true);
        } else {
          setTimeout(checkSceneReady, 50);
        }
      }
    };

    phaserGameRef.current.events.on('ready', () => checkSceneReady());

    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
      sceneRef.current = null;
      setSceneReady(false);
    };
  }, [dimensions]);

  // Listen for COUNTDOWN state to start the race
  useEffect(() => {
    if (gameState === 'COUNTDOWN' && sceneReady && sceneRef.current && onRaceFinish) {
      sceneRef.current.startCountdown((finishOrder) => onRaceFinish(finishOrder));
      startRace();
    }
  }, [gameState, sceneReady, onRaceFinish, startRace]);

  // Reset racers to starting positions when race finishes
  useEffect(() => {
    if (gameState === 'FINISHED' && sceneReady && sceneRef.current) {
      sceneRef.current.resetToStart();
    }
  }, [gameState, sceneReady]);

  return (
    <div
      ref={gameRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
});

RaceGame.displayName = 'RaceGame';

export default RaceGame;
