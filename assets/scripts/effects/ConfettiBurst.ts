import {
  _decorator,
  assetManager,
  CCBoolean,
  CCFloat,
  CCInteger,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
} from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

const { ccclass, property } = _decorator;

const RAD = Math.PI / 180;

const _w = new Vec3();
const _l = new Vec3();
const _spawnLocal = new Vec2();

const CONFETTI_IMAGE_SPRITEFRAME_UUIDS: readonly string[] = [
  "c8ddcefd-abcd-4db0-b8ae-786b9a7d713d@f9941",
  "fae8a243-3562-4edd-9299-4676ea53524e@f9941",
  "3fcf8466-20d2-4990-b6d4-ecdd71e26811@f9941",
  "27ecc23a-f95b-41a3-b3c4-9407bb09d365@f9941",
  "3d76a4e2-c421-4499-92b5-91f5b4915070@f9941",
  "65ee62fc-d438-427d-80a8-a40e49e948b0@f9941",
];

type Piece = {
  node: Node;
  vx: number;
  vy: number;
  vr: number;
  life: number;
  maxLife: number;
};

@ccclass("ConfettiBurst")
export class ConfettiBurst extends Component {
  @property(CCBoolean)
  autoPlayOnEvent = true;

  @property({ type: [SpriteFrame] })
  confettiFrames: SpriteFrame[] = [];

  @property(Vec2)
  burstOrigin: Vec2 = new Vec2(0, 350);

  @property(Node)
  spawnAnchor: Node | null = null;

  @property(Vec2)
  burstDirection: Vec2 = new Vec2(0, 1);

  @property(CCFloat)
  coneAngleDeg: number = 72;

  @property({ type: CCInteger, min: 8 })
  pieceCount: number = 160;

  @property({ type: CCInteger, min: 1 })
  screenBurstCount: number = 5;

  @property({ type: CCFloat, min: 0 })
  screenBurstStaggerSec: number = 0.12;

  @property({ type: CCFloat, min: 0 })
  screenBurstSpawnRadius: number = 72;

  @property(Node)
  screenBoundsRoot: Node | null = null;

  @property(CCFloat)
  speedMin: number = 420;

  @property(CCFloat)
  speedMax: number = 980;

  @property(CCFloat)
  gravity: number = -1180;

  @property(CCFloat)
  spinDegPerSecMin: number = -720;

  @property(CCFloat)
  spinDegPerSecMax: number = 720;

  @property(CCFloat)
  scaleMin: number = 0.45;

  @property(CCFloat)
  scaleMax: number = 1.05;

  @property(CCFloat)
  lifeMin: number = 2;

  @property(CCFloat)
  lifeMax: number = 3.2;

  private _resolvedFrames: SpriteFrame[] | null = null;
  private _resolvePromise: Promise<SpriteFrame[]> | null = null;
  private _pieces: Piece[] = [];
  private _burstSequenceId = 0;

  onEnable() {
    gameEventTarget.on(GameEvents.CONFETTI_BURST, this._onConfettiEvent, this);
  }

  onDisable() {
    gameEventTarget.off(GameEvents.CONFETTI_BURST, this._onConfettiEvent, this);
    this._clearPieces();
  }

  onLoad() {
    void this._resolveFrames();
  }

  private _onConfettiEvent = () => {
    if (!this.autoPlayOnEvent) return;
    void this.playBurst();
  };

  async playBurst(): Promise<void> {
    const frames = await this._resolveFrames();
    if (!frames.length || !this.node?.isValid) return;

    this._clearPieces();
    this._burstSequenceId += 1;
    const sequenceId = this._burstSequenceId;

    const total = Math.max(8, Math.floor(this.pieceCount));
    const bursts = Math.max(1, Math.floor(this.screenBurstCount));
    const { baseRad, halfRad } = this._coneParams();

    const basePer = Math.floor(total / bursts);
    const remainder = total - basePer * bursts;

    const stagger = bursts > 1 ? Math.max(0, this.screenBurstStaggerSec) : 0;

    const spawnOneBatch = (nPieces: number, batchId: string) => {
      this._burstSpawnForBatch(_spawnLocal, bursts === 1);
      this._spawnPiecesAt(frames, _spawnLocal.x, _spawnLocal.y, nPieces, baseRad, halfRad, batchId);
    };

    for (let b = 0; b < bursts; b++) {
      const nPieces = basePer + (b < remainder ? 1 : 0);
      if (nPieces <= 0) continue;

      const batchId = `c${b}`;
      const delay = b * stagger;

      if (stagger <= 0) {
        spawnOneBatch(nPieces, batchId);
        continue;
      }

      const run = () => {
        if (!this.isValid || sequenceId !== this._burstSequenceId) return;
        spawnOneBatch(nPieces, batchId);
      };
      if (delay <= 0) {
        run();
      } else {
        this.scheduleOnce(run, delay);
      }
    }
  }

  private _spawnPiecesAt(
    frames: SpriteFrame[],
    px: number,
    py: number,
    count: number,
    baseRad: number,
    halfRad: number,
    batchId: string,
  ): void {
    const parent = this._particleParent();
    for (let i = 0; i < count; i++) {
      const sf = frames[(Math.random() * frames.length) | 0]!;
      const n = new Node(`confetti_${batchId}_${i}`);
      const ui = n.addComponent(UITransform);
      const rect = sf.rect;
      ui.setContentSize(rect.width, rect.height);
      ui.setAnchorPoint(0.5, 0.5);

      const sp = n.addComponent(Sprite);
      sp.spriteFrame = sf;

      const op = n.addComponent(UIOpacity);
      op.opacity = 255;

      const sc = this._rand(this.scaleMin, this.scaleMax);
      n.setScale(sc, sc, 1);
      n.setPosition(px, py, 0);
      n.setRotationFromEuler(0, 0, this._rand(0, 360));

      parent.addChild(n);
      n.setSiblingIndex(parent.children.length - 1);

      const theta = baseRad + this._rand(-halfRad, halfRad);
      const spd = this._rand(this.speedMin, this.speedMax);
      const vx = Math.cos(theta) * spd;
      const vy = Math.sin(theta) * spd;
      const maxLife = Math.max(0.4, this._rand(this.lifeMin, this.lifeMax));
      this._pieces.push({
        node: n,
        vx,
        vy,
        vr: this._rand(this.spinDegPerSecMin, this.spinDegPerSecMax),
        life: maxLife,
        maxLife,
      });
    }
  }

  update(dt: number): void {
    if (!this._pieces.length) return;
    dt = Math.min(Math.max(0, dt), 0.05);
    const gy = this.gravity;

    for (let i = this._pieces.length - 1; i >= 0; i--) {
      const p = this._pieces[i]!;
      const node = p.node;
      if (!node.isValid) {
        this._pieces.splice(i, 1);
        continue;
      }

      p.vy += gy * dt;
      const pos = node.position;
      node.setPosition(pos.x + p.vx * dt, pos.y + p.vy * dt, pos.z);
      const ez = node.eulerAngles.z + p.vr * dt;
      node.setRotationFromEuler(0, 0, ez);

      p.life -= dt;
      const op = node.getComponent(UIOpacity);
      if (op && p.maxLife > 0) {
        const t = Math.max(0, p.life / p.maxLife);
        op.opacity = Math.min(255, Math.max(0, Math.floor(255 * Math.pow(t, 0.85))));
      }

      if (p.life <= 0) {
        node.destroy();
        this._pieces.splice(i, 1);
      }
    }
  }

  private _clearPieces(): void {
    for (const p of this._pieces) {
      if (p.node?.isValid) p.node.destroy();
    }
    this._pieces.length = 0;
  }

  private _rand(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  private _burstSpawnForBatch(out: Vec2, singleBurst: boolean): void {
    this._resolveBurstSpawnInParticleParent(out, singleBurst);
    if (singleBurst) return;
    const R = Math.max(0, this.screenBurstSpawnRadius);
    if (R <= 0) return;
    const rr = Math.sqrt(Math.random()) * R;
    const t = Math.random() * Math.PI * 2;
    out.x += Math.cos(t) * rr;
    out.y += Math.sin(t) * rr;
  }

  private _particleParent(): Node {
    if (this.screenBoundsRoot?.isValid) return this.screenBoundsRoot;
    if (this.node.parent?.isValid) return this.node.parent;
    return this.node;
  }

  private _resolveBurstSpawnInParticleParent(out: Vec2, singleBurst: boolean): void {
    const parent = this._particleParent();
    let puit = parent.getComponent(UITransform);
    if (!puit) puit = parent.addComponent(UITransform);

    if (!singleBurst) {
      const cx = (0.5 - puit.anchorX) * puit.width;
      const cy = (0.5 - puit.anchorY) * puit.height;
      out.set(cx, cy);
      return;
    }

    if (this.spawnAnchor?.isValid) {
      this.spawnAnchor.getWorldPosition(_w);
      puit.convertToNodeSpaceAR(_w, _l);
      out.set(_l.x, _l.y);
      return;
    }

    const selfUi = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    _w.set(this.burstOrigin.x, this.burstOrigin.y, 0);
    selfUi.convertToWorldSpaceAR(_w, _l);
    puit.convertToNodeSpaceAR(_l, _l);
    out.set(_l.x, _l.y);
  }

  private _coneParams(): { baseRad: number; halfRad: number } {
    let dx = this.burstDirection.x;
    let dy = this.burstDirection.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-5) {
      dx = 0;
      dy = 1;
    } else {
      dx /= len;
      dy /= len;
    }
    const baseRad = Math.atan2(dy, dx);
    const halfDeg = Math.max(0.5, this.coneAngleDeg) * 0.5;
    const halfRad = halfDeg * RAD;
    return { baseRad, halfRad };
  }

  private async _resolveFrames(): Promise<SpriteFrame[]> {
    if (this.confettiFrames.length > 0) {
      this._resolvedFrames = this.confettiFrames.filter((f) => !!f);
      return this._resolvedFrames;
    }

    if (this._resolvedFrames?.length) {
      return this._resolvedFrames;
    }

    if (this._resolvePromise) {
      return this._resolvePromise;
    }

    this._resolvePromise = this._loadFramesInternal();
    const out = await this._resolvePromise;
    this._resolvePromise = null;
    this._resolvedFrames = out;
    return out;
  }

  private async _loadFramesInternal(): Promise<SpriteFrame[]> {
    const fromDir = await this._tryLoadDir();
    if (fromDir.length) {
      return fromDir;
    }
    return this._loadFramesByUuids();
  }

  private _tryLoadDir(): Promise<SpriteFrame[]> {
    return new Promise((resolve) => {
      const bundle = assetManager.getBundle("main");
      if (!bundle) {
        resolve([]);
        return;
      }
      bundle.loadDir("misc/confetti", SpriteFrame, null, (err, assets) => {
        if (err || !assets?.length) {
          resolve([]);
          return;
        }
        resolve(assets.filter((a): a is SpriteFrame => !!a));
      });
    });
  }

  private _loadFramesByUuids(): Promise<SpriteFrame[]> {
    const ids = [...CONFETTI_IMAGE_SPRITEFRAME_UUIDS];
    return Promise.all(
      ids.map(
        (uuid) =>
          new Promise<SpriteFrame | null>((resolve) => {
            assetManager.loadAny({ uuid }, (err: Error | null, asset: SpriteFrame | null) => {
              if (err || !asset) {
                resolve(null);
                return;
              }
              resolve(asset);
            });
          }),
      ),
    ).then((a) => a.filter((x): x is SpriteFrame => !!x));
  }
}
