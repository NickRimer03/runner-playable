import {
  _decorator,
  BoxCollider2D,
  CCFloat,
  Collider2D,
  Color,
  Component,
  Contact2DType,
  IPhysics2DContact,
  Label,
  Node,
  Sprite,
  Tween,
  tween,
  UITransform,
  Vec3,
} from "cc";
import { ConeHazard } from "./ConeHazard";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { GameState, getGameState, setGameState } from "./state/GameState";
import { TexturePackSpriteAnimation } from "./TexturePackSpriteAnimation";
import { opacityTo } from "./utils/utils";

const { ccclass, property } = _decorator;

const ENEMY_INSPECTOR_GROUP = { name: "Enemy", id: "enemy" };

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

  /** Vertical offset at jump apex (pixels); tween duration matches jump clip length × fps. */
  @property({ type: CCFloat, group: CHARACTER_INSPECTOR_GROUP })
  jumpHeight: number = 140;

  @property({ group: CHARACTER_INSPECTOR_GROUP, displayName: "Hit Flash Tint" })
  hitFlashTint: Color = new Color(255, 0, 0, 255);

  @property({ type: CCFloat, group: CHARACTER_INSPECTOR_GROUP, displayName: "Hit Flash Step (sec)" })
  hitFlashStepSec: number = 0.05;

  @property({ type: Node, group: ENEMY_INSPECTOR_GROUP })
  enemyNode: Node | null = null;

  @property({ type: CCFloat, group: ENEMY_INSPECTOR_GROUP })
  enemyScrollSpeed: number = 200;

  @property({
    group: ENEMY_INSPECTOR_GROUP,
    displayName: "Use Global Game Scroll Speed",
  })
  enemyUseGlobalGameScrollSpeed: boolean = false;

  private _scrollBackground = false;
  private _characterGroundY: number | null = null;
  private _grounded = true;

  onEnable() {
    this._subscribeEvents(true);
    this._syncBgScrollFromState();
    this._subscribeCharacterCollision(true);
  }

  onDisable() {
    this._subscribeEvents(false);
    this._subscribeCharacterCollision(false);
    if (this.characterNode) {
      Tween.stopAllByTarget(this.characterNode);
      const flashSprite = this._getCharacterSprite();
      if (flashSprite) {
        Tween.stopAllByTarget(flashSprite);
      }
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

  private _subscribeCharacterCollision(isOn: boolean): void {
    const charNode = this.characterNode;
    if (!charNode) return;

    const collider =
      charNode.getComponent(BoxCollider2D) ?? charNode.getComponentInChildren(BoxCollider2D);
    if (!collider) return;

    const fn = isOn ? "on" : "off";
    collider[fn](Contact2DType.BEGIN_CONTACT, this._onCharacterContactHazard, this);
  }

  private _onCharacterContactHazard(
    _selfCollider: Collider2D,
    otherCollider: Collider2D,
    _contact: IPhysics2DContact | null,
  ): void {
    if (getGameState() !== GameState.GAMEPLAY) return;
    if (!this._isDamageFromCollider(otherCollider)) return;

    const anim = this.characterNode?.getComponent(TexturePackSpriteAnimation);
    if (!anim) return;

    if (anim.currentClip === "hurt") return;

    gameEventTarget.emit(GameEvents.CHARACTER_HIT);

    anim.play("hurt", {
      onComplete: () => {
        const state = getGameState();
        if (state === GameState.GAMEPLAY || state === GameState.TUTORIAL) {
          anim.play("run");
        } else if (state === GameState.FINISH) {
          anim.play("idle");
        }
      },
    });

    const sprite = this._getCharacterSprite();
    if (sprite) {
      this._playCharacterHitFlash(sprite);
    }
  }

  private _getCharacterSprite(): Sprite | null {
    const node = this.characterNode;
    if (!node) return null;
    const anim = node.getComponent(TexturePackSpriteAnimation);
    return (
      anim?.sprite ?? node.getComponent(Sprite) ?? node.getComponentInChildren(Sprite)
    );
  }

  private _playCharacterHitFlash(sprite: Sprite): void {
    Tween.stopAllByTarget(sprite);
    const base = sprite.color.clone();
    const flash = this.hitFlashTint.clone();
    const step = this.hitFlashStepSec;

    tween(sprite)
      .to(step, { color: flash })
      .to(step, { color: base })
      .to(step, { color: flash })
      .to(step, { color: base })
      .start();
  }

  private _isDamageFromCollider(other: Collider2D): boolean {
    return this._isColliderUnderEnemy(other) || this._colliderBelongsToConeHazard(other);
  }

  private _isColliderUnderEnemy(other: Collider2D): boolean {
    const root = this.enemyNode;
    if (!root) return false;
    let n: Node | null = other.node;
    while (n) {
      if (n === root) return true;
      n = n.parent;
    }
    return false;
  }

  private _colliderBelongsToConeHazard(other: Collider2D): boolean {
    let n: Node | null = other.node;
    while (n) {
      if (n.getComponent(ConeHazard)) return true;
      n = n.parent;
    }
    return false;
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

    const enemy = this.enemyNode;
    if (enemy) {
      const enemySpeed = this.enemyUseGlobalGameScrollSpeed
        ? this.gameScrollSpeed
        : this.enemyScrollSpeed;
      const enemyDx = enemySpeed * dt;
      const ep = enemy.position;
      enemy.setPosition(ep.x - enemyDx, ep.y, ep.z);
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
