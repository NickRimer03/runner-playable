import {
  _decorator,
  CCBoolean,
  CCFloat,
  Component,
  instantiate,
  Node,
  Prefab,
  TextAsset,
  Vec2,
} from "cc";
import { GameManager } from "./GameManager";
import { GameState, getGameState } from "./state/GameState";

const { ccclass, property } = _decorator;

/** Builds a 3-row level from a text asset: line 1 = top, 2 = middle, 3 = low. Each char is one cell; space = empty; M = money. */
@ccclass("TextLevelBuilder")
export class TextLevelBuilder extends Component {
  @property(TextAsset)
  levelText: TextAsset | null = null;

  @property(Node)
  container: Node | null = null;

  @property(Prefab)
  moneyPrefab: Prefab | null = null;

  /** Extra offset per column index: affects X (.x) and Y (.y) on top of row / column layout. */
  @property(Vec2)
  cellSpacing: Vec2 = new Vec2(0, 0);

  @property(CCFloat)
  topLevelY: number = 0;

  @property(CCFloat)
  middleLevelY: number = -30;

  @property(CCFloat)
  lowLevelY: number = -60;

  @property(CCFloat)
  firstCellXStart: number = 300;

  @property(CCFloat)
  cellXOffset: number = 300;

  @property(CCFloat)
  scrollSpeed: number = 200;

  @property(CCBoolean)
  useGlobalGameScrollSpeed: boolean = false;

  @property(GameManager)
  gameManager: GameManager | null = null;

  private _levelNodes: Node[] = [];

  onLoad() {
    this.buildLevel();
  }

  update(dt: number) {
    const s = getGameState();
    if (s !== GameState.GAMEPLAY && s !== GameState.TUTORIAL) return;

    const dx = this._getScrollSpeedPxPerSec() * dt;
    for (const node of this._levelNodes) {
      if (node == null || !node.isValid) continue;
      const p = node.position;
      node.setPosition(p.x - dx, p.y, p.z);
    }
  }

  buildLevel(): void {
    const parent = this.container;
    if (!parent || !this.levelText?.text) return;

    parent.removeAllChildren();
    this._levelNodes.length = 0;

    const lines = this.levelText.text.split(/\r?\n/);
    while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
      lines.pop();
    }

    if (lines.length < 3) {
      console.warn("TextLevelBuilder: need at least 3 lines (top, middle, low).");
      return;
    }

    const rowYs = [this.topLevelY, this.middleLevelY, this.lowLevelY];

    for (let row = 0; row < 3; row++) {
      const line = lines[row] ?? "";
      const baseY = rowYs[row] ?? 0;
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === " " || ch === "\t") continue;

        const x =
          this.firstCellXStart + col * this.cellXOffset + col * this.cellSpacing.x;
        const y = baseY + col * this.cellSpacing.y;
        this._spawnCell(ch, x, y);
      }
    }
  }

  private _spawnCell(symbol: string, x: number, y: number): void {
    const parent = this.container;
    if (!parent) return;

    const prefab = this._prefabForSymbol(symbol);
    if (!prefab) {
      if (symbol !== " " && symbol !== "\t") {
        console.warn(`TextLevelBuilder: no prefab for symbol "${symbol}".`);
      }
      return;
    }

    const node = instantiate(prefab);
    parent.addChild(node);
    node.setPosition(x, y, node.position.z);
    this._levelNodes.push(node);
  }

  private _getScrollSpeedPxPerSec(): number {
    if (this.useGlobalGameScrollSpeed) {
      if (this.gameManager) {
        return this.gameManager.gameScrollSpeed;
      }
      console.warn(
        "TextLevelBuilder: Use Global Game Scroll Speed is on but Game Manager is not assigned.",
      );
    }
    return this.scrollSpeed;
  }

  private _prefabForSymbol(symbol: string): Prefab | null {
    switch (symbol) {
      case "M":
        return this.moneyPrefab;
      default:
        return null;
    }
  }
}
