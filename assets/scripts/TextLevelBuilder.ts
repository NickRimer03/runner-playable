import { _decorator, CCFloat, CCInteger, Component, instantiate, Prefab, TextAsset } from "cc";

const { ccclass, property } = _decorator;

/**
 * One non-empty line per level (top to bottom). Row index `i` is placed at `topLevelY + i * levelYOffset`.
 * Each character is a cell; space, tab, or `.` = empty; M = money; C = cone; E = enemy; P = card; R = random (money or card with equal chance); F = finish line. Trailing blank lines in the file are ignored.
 * Attach to the level root: spawned objects are children of `this.node`. Pair with {@link ContainerChildrenScroll} on the same node for motion.
 */
@ccclass("TextLevelBuilder")
export class TextLevelBuilder extends Component {
  @property(TextAsset)
  levelText: TextAsset | null = null;

  @property(Prefab)
  moneyPrefab: Prefab | null = null;

  @property(Prefab)
  conePrefab: Prefab | null = null;

  @property(Prefab)
  enemyPrefab: Prefab | null = null;

  @property(Prefab)
  cardPrefab: Prefab | null = null;

  @property(Prefab)
  finishPrefab: Prefab | null = null;

  @property(CCFloat)
  topLevelY: number = 0;

  /** Added per row: row 0 uses `topLevelY`, row 1 uses `topLevelY + levelYOffset`, row 2 uses `topLevelY + 2 * levelYOffset`, etc. */
  @property(CCFloat)
  levelYOffset: number = -30;

  @property(CCFloat)
  firstCellXStart: number = 300;

  @property(CCFloat)
  cellXOffset: number = 300;

  @property({ type: CCInteger, min: 0 })
  coneCountEvadePlateOn: number = 2;

  private _coneSpawnCount = 0;

  onLoad() {
    this.buildLevel();
  }

  buildLevel(): void {
    if (!this.levelText?.text) return;

    this.node.removeAllChildren();
    this._coneSpawnCount = 0;

    const lines = this.levelText.text.split(/\r?\n/);
    while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
      lines.pop();
    }

    if (lines.length < 1) {
      console.warn("TextLevelBuilder: need at least one level line in the text asset.");
      return;
    }

    for (let row = 0; row < lines.length; row++) {
      const line = lines[row] ?? "";
      const baseY = this.topLevelY + row * this.levelYOffset;
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (this._isEmptyCell(ch)) continue;

        const x = this.firstCellXStart + col * this.cellXOffset;
        const y = baseY;
        this._spawnCell(ch, x, y);
      }
    }
  }

  private _isEmptyCell(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === ".";
  }

  private _spawnCell(symbol: string, x: number, y: number): void {
    const prefab = this._prefabForSymbol(symbol);
    if (!prefab) {
      if (!this._isEmptyCell(symbol)) {
        console.warn(`TextLevelBuilder: no prefab for symbol "${symbol}".`);
      }
      return;
    }

    const node = instantiate(prefab);
    this.node.addChild(node);
    node.setPosition(x, y, node.position.z);

    if (symbol === "C") {
      const plate = node.getChildByName("plate");
      if (plate) {
        plate.active = this._coneSpawnCount < this.coneCountEvadePlateOn;
      }
      this._coneSpawnCount++;
    }
  }

  /** 50/50 money vs card when both are assigned; otherwise the one that exists. */
  private _randomMoneyOrCardPrefab(): Prefab | null {
    const money = this.moneyPrefab;
    const card = this.cardPrefab;
    if (money && card) return Math.random() < 0.5 ? money : card;
    return money ?? card ?? null;
  }

  private _prefabForSymbol(symbol: string): Prefab | null {
    switch (symbol) {
      case "M":
        return this.moneyPrefab;
      case "C":
        return this.conePrefab;
      case "E":
        return this.enemyPrefab;
      case "P":
        return this.cardPrefab;
      case "R":
        return this._randomMoneyOrCardPrefab();
      case "F":
        return this.finishPrefab;
      default:
        return null;
    }
  }
}
