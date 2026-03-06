"use client";
import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { useGameStore } from '@/lib/gameStore';

const MINI_WIDTH = 400;
const MINI_HEIGHT = 400;

class MiniRaceScene extends Phaser.Scene {
  racers: Phaser.GameObjects.Sprite[] = [];
  clouds: Phaser.GameObjects.Graphics[] = [];
  trees: Phaser.GameObjects.Container[] = [];
  fencePosts: Phaser.GameObjects.Rectangle[] = [];
  roadMarkers: Phaser.GameObjects.Rectangle[] = [];
  finishLine: Phaser.GameObjects.Rectangle | null = null;
  isReady: boolean = false;

  preload() {
    const coinNames = ['bonk', 'wif', 'dodge', 'brett', 'pengu', 'Pnut', 'floki', 'pengy', 'pepe', 'shib'];
    coinNames.forEach((name, i) => {
      this.load.image(`mini_racer${i + 1}`, `/assets/coins/${name}.png`);
    });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Sky
    const skyH = h * 0.28;
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x5BA3D9, 0x5BA3D9, 1);
    sky.fillRect(0, 0, w, skyH);

    // Clouds
    for (let i = 0; i < 5; i++) {
      const cx = (w / 3) * i;
      const cy = skyH * (0.25 + Math.random() * 0.35);
      const sz = w * (0.06 + Math.random() * 0.04);
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.85);
      cloud.fillCircle(0, 0, sz * 0.5);
      cloud.fillCircle(sz * 0.35, -sz * 0.1, sz * 0.35);
      cloud.fillCircle(sz * 0.7, 0, sz * 0.3);
      cloud.setPosition(cx, cy);
      this.clouds.push(cloud);
    }

    // Field
    const fieldTop = skyH;
    const fieldH = h * 0.12;
    const field = this.add.graphics();
    field.fillGradientStyle(0x7CB342, 0x7CB342, 0x558B2F, 0x558B2F, 1);
    field.fillRect(0, fieldTop, w, fieldH);

    // Trees
    const treeY = fieldTop + fieldH * 0.7;
    for (let i = 0; i < 10; i++) {
      const x = (w / 5) * i;
      const ts = fieldH * (0.5 + Math.random() * 0.3);
      const container = this.add.container(x, treeY);
      const trunk = this.add.graphics();
      trunk.fillStyle(0x5D4037, 1);
      trunk.fillRect(-ts * 0.06, 0, ts * 0.12, ts * 0.35);
      const foliage = this.add.graphics();
      foliage.fillStyle(0x2E7D32, 1);
      foliage.fillCircle(0, -ts * 0.15, ts * 0.35);
      container.add([trunk, foliage]);
      this.trees.push(container);
    }

    // Road
    const roadTop = fieldTop + fieldH;
    const roadH = h * 0.48;
    const road = this.add.graphics();
    road.fillStyle(0x606060, 1);
    road.fillRect(0, roadTop, w, roadH);
    const roadOverlay = this.add.graphics();
    roadOverlay.fillGradientStyle(0x707070, 0x707070, 0x505050, 0x505050, 0.5);
    roadOverlay.fillRect(0, roadTop, w, roadH);

    // Road markers
    for (let i = 0; i < 20; i++) {
      const marker = this.add.rectangle((w / 8) * i, roadTop + roadH / 2, 10, 2, 0xffffff, 0.25);
      this.roadMarkers.push(marker);
    }

    // Fence
    const fenceY = roadTop + roadH;
    const fenceH = h * 0.025;
    const fenceRails = this.add.graphics();
    fenceRails.fillStyle(0xFFFFFF, 1);
    fenceRails.fillRect(0, fenceY, w, fenceH * 0.3);
    fenceRails.fillRect(0, fenceY + fenceH * 0.7, w, fenceH * 0.3);
    for (let i = 0; i < 25; i++) {
      const post = this.add.rectangle((w / 10) * i, fenceY + fenceH / 2, 3, fenceH, 0xffffff, 1);
      this.fencePosts.push(post);
    }

    // Bottom grass
    const grassTop = fenceY + fenceH;
    const grass = this.add.graphics();
    grass.fillStyle(0x4CAF50, 1);
    grass.fillRect(0, grassTop, w, h - grassTop);

    // Finish line
    const finishX = w * 0.82;
    this.finishLine = this.add.rectangle(finishX, h / 2, 3, h, 0xffffff, 0.6);
    this.tweens.add({ targets: this.finishLine, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // Racers in lanes — spread across the track for a mid-race look
    const numRacers = 10;
    const lanepadding = h * 0.015;
    const laneTop = roadTop + lanepadding;
    const laneArea = roadH - lanepadding * 2;
    const laneH = laneArea / numRacers;
    const scale = Phaser.Math.Clamp(laneH / 300, 0.05, 0.08);

    // Stagger racers across the track so they look spread out
    const staggerPositions = [
      0.55, 0.42, 0.62, 0.35, 0.50,
      0.28, 0.58, 0.45, 0.38, 0.52
    ];

    for (let i = 0; i < numRacers; i++) {
      const ly = laneTop + i * laneH + laneH / 2;

      // Lane divider
      if (i > 0) {
        this.add.rectangle(w / 2, laneTop + i * laneH, w, 1, 0xffffff, 0.08);
      }

      const racerX = w * staggerPositions[i];
      const racer = this.add.sprite(racerX, ly, `mini_racer${i + 1}`);
      racer.setScale(scale);
      racer.setData('baseX', racerX);
      racer.setData('baseY', ly);
      racer.setData('phase', Math.random() * Math.PI * 2);
      racer.setData('speed', 0.3 + Math.random() * 0.4);
      this.racers.push(racer);
    }

    this.isReady = true;
  }

  update(_time: number, _delta: number) {
    if (!this.isReady) return;
    const w = this.scale.width;
    const t = _time * 0.001;

    // Scroll clouds
    this.clouds.forEach((c) => {
      c.x -= 0.15;
      if (c.x < -w * 0.2) c.x = w + w * 0.1;
    });

    // Scroll trees
    this.trees.forEach((tree) => {
      tree.x -= 0.4;
      if (tree.x < -w * 0.1) tree.x = w + w * 0.1;
    });

    // Scroll fence posts
    this.fencePosts.forEach((p) => {
      p.x -= 0.7;
      if (p.x < -10) p.x = w + 10;
    });

    // Scroll road markers
    this.roadMarkers.forEach((m) => {
      m.x -= 1;
      if (m.x < -15) m.x = w + 15;
    });

    // Idle racer animations — gentle forward/back drift to simulate racing
    this.racers.forEach((racer) => {
      const baseX = racer.getData('baseX') as number;
      const baseY = racer.getData('baseY') as number;
      const phase = racer.getData('phase') as number;
      const speed = racer.getData('speed') as number;

      // Drift forward and back within their lane area
      racer.x = baseX + Math.sin(t * speed * 1.2 + phase) * (w * 0.04);
      racer.y = baseY + Math.sin(t * speed * 2.5 + phase) * 1;
    });
  }
}

const RacePreviewMini: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { racers } = useGameStore();

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: MINI_WIDTH,
      height: MINI_HEIGHT,
      parent: containerRef.current,
      scene: MiniRaceScene,
      transparent: false,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="race-preview-mini"
    />
  );
};

export default RacePreviewMini;
