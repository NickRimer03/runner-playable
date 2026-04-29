import { _decorator, CCFloat, Component, Label, Node, Sprite, Tween, tween, UITransform, Vec3 } from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { GameState, getGameState, setGameState } from "./state/GameState";
import { TexturePackSpriteAnimation } from "./TexturePackSpriteAnimation";
import { opacityTo } from "./utils/utils";

const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  @property(CCFloat)
  opacityDuration: number = 0.25;

  @property(Sprite)
  hand: Sprite | null = null;

  @property(Label)
  actionText: Label | null = null;

  @property(CCFloat)
  speed: number = 200;

  @property(Node)
  bgContainer: Node | null = null;

  @property({ type: [Sprite] })
  bgSprites: Sprite[] = [];

  @property(Node)
  characterNode: Node | null = null;

  /** Vertical offset at jump apex (pixels); tween duration matches jump clip length × fps. */
  @property(CCFloat)
  jumpHeight: number = 140;

  private _scrollBackground = false;

  /** Landing height when gameplay begins (stable baseline if taps overlap mid-air). */
  private _characterGroundY: number | null = null;

  /** False while jump tween is in progress (no new jump until landed). */
  private _grounded = true;

  onEnable() {
    this._subscribeEvents(true);
    this._syncBgScrollFromState();
  }

  onDisable() {
    this._subscribeEvents(false);
    if (this.characterNode) {
      Tween.stopAllByTarget(this.characterNode);
    }
    this._grounded = true;
  }

  start() {
    setGameState(GameState.START);
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.GAME_FINISH, this._finishGame, this);
    gameEventTarget[func](GameEvents.INPUT_UP, this._onInputUp, this);
    gameEventTarget[func](GameEvents.GAME_STATE_SET, this._onGameStateSet, this);
  }

  update(dt: number) {
    if (!this._scrollBackground) return;

    const sprites = this.bgSprites;
    if (sprites.length < 2) return;

    const n1 = sprites[0]?.node;
    const n2 = sprites[1]?.node;
    if (!n1 || !n2) return;

    const dx = this.speed * dt;
    this._moveBgNode(n1, dx);
    this._moveBgNode(n2, dx);

    if (this._imageRightX(n1) <= 0) {
      this._snapSegmentRightOf(n1, n2);
    } else if (this._imageRightX(n2) <= 0) {
      this._snapSegmentRightOf(n2, n1);
    }
  }

  private _moveBgNode(node: Node, dx: number): void {
    const p = node.position;
    node.setPosition(p.x - dx, p.y, p.z);
  }

  private _imageWidth(node: Node): number {
    const u = node.getComponent(UITransform);
    return u ? u.width * Math.abs(node.scale.x) : 0;
  }

  private _imageRightX(node: Node): number {
    return node.position.x + this._imageWidth(node);
  }

  private _snapSegmentRightOf(segment: Node, after: Node): void {
    const p = segment.position;
    segment.setPosition(after.position.x + this._imageWidth(after), p.y, p.z);
  }

  private _onGameStateSet(state: GameState) {
    this._syncBgScrollFromState(state);
  }

  private _syncBgScrollFromState(state: GameState = getGameState()) {
    this._scrollBackground = state === GameState.GAMEPLAY;
  }

  private _onInputUp() {
    const state = getGameState();

    if (state === GameState.START) {
      setGameState(GameState.GAMEPLAY);

      if (this.characterNode) {
        this._characterGroundY = this.characterNode.position.y;
      }

      this._grounded = true;

      this.characterNode?.getComponent(TexturePackSpriteAnimation)?.play("run");

      opacityTo(this.hand?.node, 0, this.opacityDuration);
      opacityTo(this.actionText?.node, 0, this.opacityDuration);
      return;
    }

    if (state === GameState.GAMEPLAY) {
      const anim = this.characterNode?.getComponent(TexturePackSpriteAnimation);
      if (!anim) return;

      if (!this._grounded) return;

      const duration = anim.getClipDurationSeconds("jump");
      if (duration <= 0) return;

      this._grounded = false;

      anim.play("jump", {
        onComplete: () => anim.play("run"),
      });

      this._tweenJump(duration);
    }
  }

  /** Arc motion synced to jump clip: ease up (sine-out), ease down (sine-in). */
  private _tweenJump(duration: number) {
    const node = this.characterNode;
    if (!node || duration <= 0) return;

    Tween.stopAllByTarget(node);

    const p = node.position;
    const groundY = this._characterGroundY ?? p.y;
    const peakY = groundY + this.jumpHeight;
    const half = duration * 0.5;

    tween(node)
      .to(half, { position: new Vec3(p.x, peakY, p.z) }, { easing: "sineOut" })
      .to(half, { position: new Vec3(p.x, groundY, p.z) }, { easing: "sineIn" })
      .call(() => {
        this._grounded = true;
      })
      .start();
  }

  private _finishGame() {
    setGameState(GameState.FINISH);

    gameEventTarget.emit(GameEvents.GAME_SHOW_PACKSHOT);
  }
}
