import { _decorator, CCFloat, Component, Label, Node, Sprite, Tween, tween, UITransform, Vec3 } from "cc";
import { CharacterCollision } from "./CharacterCollision";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { GameState, getGameState, setGameState } from "./state/GameState";
import { TexturePackSpriteAnimation } from "./TexturePackSpriteAnimation";
import { opacityTo } from "./utils/utils";

const { ccclass, property } = _decorator;

const CHARACTER_INSPECTOR_GROUP = { name: "Character", id: "character" };

@ccclass("GameManager")
export class GameManager extends Component {
  @property(CCFloat)
  opacityDuration: number = 0.25;

  @property(Sprite)
  hand: Sprite | null = null;

  @property(Label)
  actionText: Label | null = null;

  @property(CCFloat)
  gameScrollSpeed: number = 200;

  @property(Node)
  bgContainer: Node | null = null;

  @property({ type: [Sprite] })
  bgSprites: Sprite[] = [];

  @property({ type: Node, group: CHARACTER_INSPECTOR_GROUP })
  characterNode: Node | null = null;

  @property({ type: CCFloat, group: CHARACTER_INSPECTOR_GROUP })
  jumpHeight: number = 140;

  private _scrollBackground = false;
  private _characterGroundY: number | null = null;
  private _grounded = true;

  onLoad() {
    const char = this.characterNode;
    if (!char) return;
    if (!char.getComponent(CharacterCollision)) {
      char.addComponent(CharacterCollision);
    }
  }

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

    const dx = this.gameScrollSpeed * dt;

    const sprites = this.bgSprites;
    if (sprites.length >= 2) {
      const n1 = sprites[0]?.node;
      const n2 = sprites[1]?.node;
      if (n1 && n2) {
        this._moveBgNode(n1, dx);
        this._moveBgNode(n2, dx);

        if (this._imageRightX(n1) <= 0) {
          this._snapSegmentRightOf(n1, n2);
        } else if (this._imageRightX(n2) <= 0) {
          this._snapSegmentRightOf(n2, n1);
        }
      }
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

    if (state === GameState.TUTORIAL_PAUSE) {
      const label = this.actionText;
      if (label) {
        label.string = "Jump to avoid enemies";
      }
      opacityTo(this.hand?.node, 255, this.opacityDuration);
      opacityTo(this.actionText?.node, 255, this.opacityDuration);
    }
  }

  private _syncBgScrollFromState(state: GameState = getGameState()) {
    this._scrollBackground = state === GameState.GAMEPLAY || state === GameState.TUTORIAL;
  }

  private _onInputUp() {
    const state = getGameState();

    if (state === GameState.START) {
      setGameState(GameState.TUTORIAL);

      if (this.characterNode) {
        this._characterGroundY = this.characterNode.position.y;
      }

      this._grounded = true;

      this.characterNode?.getComponent(TexturePackSpriteAnimation)?.play("run");

      opacityTo(this.hand?.node, 0, this.opacityDuration);
      opacityTo(this.actionText?.node, 0, this.opacityDuration);
      return;
    }

    if (state === GameState.GAMEPLAY || state === GameState.TUTORIAL_PAUSE) {
      const anim = this.characterNode?.getComponent(TexturePackSpriteAnimation);
      if (!anim) return;

      if (!this._grounded) return;

      const duration = anim.getClipDurationSeconds("jump");
      if (duration <= 0) return;

      if (state === GameState.TUTORIAL_PAUSE) {
        setGameState(GameState.GAMEPLAY);
        opacityTo(this.hand?.node, 0, this.opacityDuration);
        opacityTo(this.actionText?.node, 0, this.opacityDuration);
      }

      this._grounded = false;

      anim.play("jump", {
        onComplete: () => anim.play("run"),
      });

      this._tweenJump(duration);
    }
  }

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
