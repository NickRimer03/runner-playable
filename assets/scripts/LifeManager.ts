import { _decorator, CCFloat, CCInteger, Component, instantiate, Node, Prefab, UIOpacity, UITransform } from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("LifeManager")
export class LifeManager extends Component {
  @property(CCInteger)
  maxLives: number = 3;

  @property(CCFloat)
  lostLifeOpacity: number = 0.3;

  @property(Node)
  lifeShowContainer: Node | null = null;

  @property(Prefab)
  lifePrefab: Prefab | null = null;

  private _currentLives: number = 0;
  private _lifeNodes: Node[] = [];
  private _lostLifeOpacity = 0;

  onEnable() {
    this._subscribeHitEvent(true);
  }

  onDisable() {
    this._subscribeHitEvent(false);
  }

  private _subscribeHitEvent(isOn: boolean): void {
    const func = isOn ? "on" : "off";
    gameEventTarget[func](GameEvents.CHARACTER_HIT, this._takeDamage, this);
  }

  onLoad() {
    this._lostLifeOpacity = Math.round(255 * this.lostLifeOpacity);
    this._buildLifeNodes();
    this._currentLives = this.maxLives;
  }

  private _getOrAddUiOpacity(node: Node): UIOpacity {
    return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
  }

  private _buildLifeNodes(): void {
    this._lifeNodes = [];

    const container = this.lifeShowContainer;
    const prefab = this.lifePrefab;
    if (!container || !prefab) return;

    container.removeAllChildren();

    const templateRoot = prefab.data;
    const templateUi = templateRoot.getComponent(UITransform);
    const cellWidth = templateUi?.width ?? templateUi?.contentSize.width ?? 0;

    for (let i = 0; i < this.maxLives; i++) {
      const node = instantiate(prefab);
      node.setPosition(i * cellWidth, node.position.y, node.position.z);
      container.addChild(node);

      this._getOrAddUiOpacity(node).opacity = 255;

      this._lifeNodes.push(node);
    }
  }

  private _takeDamage(): void {
    if (this._currentLives <= 0) return;

    this._currentLives--;

    const node = this._lifeNodes[this._currentLives];
    if (node) {
      this._getOrAddUiOpacity(node).opacity = this._lostLifeOpacity;
    }

    if (this._currentLives === 0) {
      this.onAllLivesEnd();
    }
  }

  protected onAllLivesEnd(): void {
    gameEventTarget.emit(GameEvents.GAME_FINISH, true);
  }
}
