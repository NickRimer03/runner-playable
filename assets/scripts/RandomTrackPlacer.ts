import {
  _decorator,
  CCBoolean,
  CCFloat,
  CCInteger,
  Component,
  instantiate,
  Node,
  Prefab,
  UITransform,
  Vec2,
} from "cc";
import { GameManager } from "./GameManager";
import { GameState, getGameState } from "./state/GameState";

const { ccclass, property } = _decorator;

@ccclass("RandomTrackPlacer")
export class RandomTrackPlacer extends Component {
  @property(Node)
  container: Node | null = null;

  @property(Vec2)
  startPoint: Vec2 = new Vec2(0, 0);

  @property(CCFloat)
  offsetX: number = 100;

  @property({ type: CCInteger, min: 0 })
  initialCount: number = 5;

  @property({ type: [Prefab] })
  objectPool: Prefab[] = [];

  @property({ type: CCFloat, min: 0, max: 1, slide: true })
  skipChance: number = 0.2;

  @property(CCFloat)
  scrollSpeed: number = 200;

  @property(CCBoolean)
  useGlobalGameScrollSpeed: boolean = false;

  @property(GameManager)
  gameManager: GameManager | null = null;

  @property(CCBoolean)
  preventSameAsPrevious: boolean = false;

  private _activeNodes: Node[] = [];
  private _lastPrefabIndex = -1;

  start() {
    this._lastPrefabIndex = -1;
    this._spawnInitial();
  }

  update(dt: number) {
    const s = getGameState();
    if (s !== GameState.GAMEPLAY && s !== GameState.TUTORIAL) return;

    const dx = this._getScrollSpeedPxPerSec() * dt;
    for (const node of this._activeNodes) {
      const p = node.position;
      node.setPosition(p.x - dx, p.y, p.z);
    }

    this._recycleOffscreenNodes();
  }

  private _getScrollSpeedPxPerSec(): number {
    if (this.useGlobalGameScrollSpeed) {
      if (this.gameManager) {
        return this.gameManager.gameScrollSpeed;
      }
      console.warn("RandomTrackPlacer: Use Global Game Scroll Speed is on but Game Manager is not assigned.");
    }
    return this.scrollSpeed;
  }

  private _spawnInitial(): void {
    const parent = this.container;
    const pool = this.objectPool;
    if (!parent || pool.length === 0 || this.initialCount <= 0) return;

    parent.removeAllChildren();
    this._activeNodes = [];

    let cursorX = this.startPoint.x;
    const y = this.startPoint.y;

    for (let i = 0; i < this.initialCount; i++) {
      let x = cursorX;
      if (Math.random() < this.skipChance) {
        x += this.offsetX;
      }

      const prefab = this.objectPool[this._pickPrefabIndex()]!;
      const node = instantiate(prefab);
      parent.addChild(node);
      node.setPosition(x, y, node.position.z);
      this._activeNodes.push(node);

      cursorX = x + this.offsetX;
    }
  }

  private _pickPrefabIndex(): number {
    const pool = this.objectPool;
    const n = pool.length;
    if (n <= 0) return 0;

    if (!this.preventSameAsPrevious || n < 2) {
      this._lastPrefabIndex = Math.floor(Math.random() * n);
      return this._lastPrefabIndex;
    }

    let idx = Math.floor(Math.random() * n);
    while (idx === this._lastPrefabIndex) {
      idx = Math.floor(Math.random() * n);
    }
    this._lastPrefabIndex = idx;
    return idx;
  }

  private _recycleOffscreenNodes(): void {
    const off = this._activeNodes.filter((n) => this._imageRightX(n) <= 0);
    if (off.length === 0) return;

    off.sort((a, b) => a.position.x - b.position.x);

    const on = this._activeNodes.filter((n) => this._imageRightX(n) > 0);
    let tail =
      on.length > 0
        ? Math.max(...on.map((n) => n.position.x))
        : this.startPoint.x - this.offsetX;

    const y = this.startPoint.y;
    for (const node of off) {
      let x = tail + this.offsetX;
      if (Math.random() < this.skipChance) {
        x += this.offsetX;
      }
      node.setPosition(x, y, node.position.z);
      tail = x;
    }
  }

  private _imageWidth(node: Node): number {
    const u = node.getComponent(UITransform);
    return u ? u.width * Math.abs(node.scale.x) : 0;
  }

  private _imageRightX(node: Node): number {
    return node.position.x + this._imageWidth(node);
  }
}
