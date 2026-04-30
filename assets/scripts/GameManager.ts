import {
  _decorator,
  BoxCollider2D,
  CCFloat,
  CCInteger,
  Component,
  instantiate,
  Label,
  Node,
  Prefab,
  Quat,
  RigidBody2D,
  Sprite,
  Tween,
  tween,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
  view,
} from "cc";
import { CharacterCollision } from "./CharacterCollision";
import { ConfettiBurst } from "./effects/ConfettiBurst";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { CardPickup } from "./marker/CardPickup";
import { EnemyHazard } from "./marker/EnemyHazard";
import { MoneyPickup } from "./marker/MoneyPickup";
import { GameState, getGameState, setGameState } from "./state/GameState";
import { TexturePackSpriteAnimation } from "./TexturePackSpriteAnimation";
import { getOrientation, opacityTo } from "./utils/utils";

const { ccclass, property } = _decorator;

const CHARACTER_INSPECTOR_GROUP = { name: "Character", id: "character" };
const CURRENCY_COLLECT_FLY_GROUP = { name: "Currency collect fly", id: "currency-collect-fly" };
const CURRENCY_CONGRATS_GROUP = { name: "Currency congrats", id: "currency-congrats" };

const CONGRATS_PHRASES = ["Fantastic!", "Great!", "Awesome!", "Perfect!"] as const;

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

  @property({ type: Node, group: CURRENCY_COLLECT_FLY_GROUP })
  currencyCollectFlyTarget: Node | null = null;

  @property({ type: CCFloat, group: CURRENCY_COLLECT_FLY_GROUP })
  currencyCollectFlyDuration: number = 0.38;

  @property({ type: Prefab, group: CURRENCY_CONGRATS_GROUP })
  congratsTextPrefab: Prefab | null = null;

  @property({ group: CURRENCY_CONGRATS_GROUP })
  congratsStartPos: Vec2 = new Vec2(0, 200);

  @property({ type: CCInteger, group: CURRENCY_CONGRATS_GROUP })
  congratsAnimateYStep: number = 80;

  @property({ type: CCFloat, group: CURRENCY_CONGRATS_GROUP })
  congratsPhaseDuration: number = 0.3;

  @property({ type: CCFloat, group: CURRENCY_CONGRATS_GROUP })
  congratsPauseDuration: number = 0.45;

  private _scrollBackground = false;
  private _characterGroundY: number | null = null;
  private _grounded = true;
  private _lastCongratsPhraseIndex = -1;
  private _jumpLocked = false;
  private _lastOrientation: ReturnType<typeof getOrientation> | null = null;

  onLoad() {
    this._ensureConfettiBurstLayer();
    const char = this.characterNode;
    if (!char) return;
    if (!char.getComponent(CharacterCollision)) {
      char.addComponent(CharacterCollision);
    }
  }

  /** One UI layer for win confetti if the scene has no {@link ConfettiBurst} yet. */
  private _ensureConfettiBurstLayer(): void {
    if (this.node.getComponentsInChildren(ConfettiBurst).length > 0) {
      return;
    }
    const layer = new Node("_ConfettiBurst");
    this.node.addChild(layer);
    layer.setSiblingIndex(this.node.children.length - 1);
    layer.addComponent(ConfettiBurst);
  }

  onEnable() {
    this._subscribeEvents(true);
    this._syncBgScrollFromState();
    this._onCanvasResize();
  }

  onDisable() {
    this._subscribeEvents(false);
    this._lastOrientation = null;
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
    gameEventTarget[func](GameEvents.COLLECTIBLE_FLY, this._onCollectibleFly, this);
    gameEventTarget[func](GameEvents.CURRENCY_CONGRATS, this._onCurrencyCongrats, this);
    gameEventTarget[func](GameEvents.NO_JUMP_LOCK, this._onNoJumpLock, this);
    view[func]("canvas-resize", this._onCanvasResize, this);
  }

  private _onNoJumpLock = (): void => {
    this._jumpLocked = true;
  };

  private _onCanvasResize = (): void => {
    const orientation = getOrientation();
    if (this._lastOrientation === orientation) return;
    this._lastOrientation = orientation;
    gameEventTarget.emit(GameEvents.ORIENTATION_CHANGED, orientation);
  };

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

  private _onGameStateSet(state: GameState, prevState: GameState) {
    if (state === GameState.START) {
      this._jumpLocked = false;
    }
    this._syncBgScrollFromState(state, prevState);

    if (state === GameState.TUTORIAL_PAUSE) {
      const label = this.actionText;
      if (label) {
        label.string = "Jump to avoid enemies";
      }
      this.characterNode?.getComponent(TexturePackSpriteAnimation)?.play("idle");
      this._freezeEnemiesAtFirstFrame();
      opacityTo(this.hand?.node, 255, this.opacityDuration);
      opacityTo(this.actionText?.node, 255, this.opacityDuration);
    }
  }

  private _syncBgScrollFromState(state: GameState = getGameState(), prevState?: GameState) {
    const scroll = state === GameState.GAMEPLAY || state === GameState.TUTORIAL;
    const wasScrolling = this._scrollBackground;
    this._scrollBackground = scroll;
    const skipStepFromPauseResume =
      prevState !== undefined && prevState === GameState.TUTORIAL_PAUSE && state === GameState.GAMEPLAY;
    if (scroll && !wasScrolling && this._grounded && !skipStepFromPauseResume) {
      gameEventTarget.emit(GameEvents.CHARACTER_STEP);
    } else if (!scroll && wasScrolling) {
      gameEventTarget.emit(GameEvents.CHARACTER_STOP);
    }
  }

  private _freezeEnemiesAtFirstFrame(): void {
    const root = this.node.scene;
    if (!root) return;
    this._visitEnemies(root, (node) => {
      const anim = node.getComponent(TexturePackSpriteAnimation) ?? node.getComponentInChildren(TexturePackSpriteAnimation);
      anim?.freezeAtFirstFrame();
    });
  }

  private _visitEnemies(node: Node, onEnemy: (enemyRoot: Node) => void): void {
    if (node.getComponent(EnemyHazard)) {
      onEnemy(node);
    }
    for (const child of node.children) {
      this._visitEnemies(child, onEnemy);
    }
  }

  private _resumeEnemyAnimations(): void {
    const root = this.node.scene;
    if (!root) return;
    this._visitEnemies(root, (node) => {
      const anim = node.getComponent(TexturePackSpriteAnimation) ?? node.getComponentInChildren(TexturePackSpriteAnimation);
      anim?.play("run");
    });
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

      if (this._jumpLocked && state === GameState.GAMEPLAY) {
        return;
      }

      const duration = anim.getClipDurationSeconds("jump");
      if (duration <= 0) {
        gameEventTarget.emit(GameEvents.CHARACTER_JUMP);
        return;
      }

      if (state === GameState.TUTORIAL_PAUSE) {
        setGameState(GameState.GAMEPLAY);
        this._resumeEnemyAnimations();
        opacityTo(this.hand?.node, 0, this.opacityDuration);
        opacityTo(this.actionText?.node, 0, this.opacityDuration);
      }

      gameEventTarget.emit(GameEvents.CHARACTER_JUMP);

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
        if (this._scrollBackground) {
          gameEventTarget.emit(GameEvents.CHARACTER_STEP);
        }
      })
      .start();
  }

  private _finishGame(fail: boolean = false) {
    this._jumpLocked = false;
    setGameState(GameState.FINISH);

    this.characterNode?.getComponent(TexturePackSpriteAnimation)?.play("idle");

    gameEventTarget.emit(fail ? GameEvents.GAME_FAIL : GameEvents.GAME_SUCCESS);
    if (!fail) {
      gameEventTarget.emit(GameEvents.CONFETTI_BURST);
    }
    gameEventTarget.emit(GameEvents.GAME_SHOW_PACKSHOT, fail);
  }

  private _onCollectibleFly = (pickupRoot: Node): void => {
    if (!pickupRoot?.isValid) return;

    if (pickupRoot.getComponent(MoneyPickup)) {
      gameEventTarget.emit(GameEvents.MONEY_COLLECTED, GameEvents.MONEY_COLLECTED);
    } else if (pickupRoot.getComponent(CardPickup)) {
      gameEventTarget.emit(GameEvents.CARD_COLLECTED, GameEvents.CARD_COLLECTED);
    }

    this._removeCollectibleWithFlyFx(pickupRoot);
  };

  private _removeCollectibleWithFlyFx(original: Node): void {
    const target = this.currencyCollectFlyTarget;
    if (!target?.isValid) {
      original.destroy();
      return;
    }

    const worldPos = new Vec3();
    const worldRot = new Quat();
    const worldScale = new Vec3();
    original.getWorldPosition(worldPos);
    original.getWorldRotation(worldRot);
    original.getWorldScale(worldScale);

    const copy = instantiate(original);
    this._stripPickupPhysicsAndMarkers(copy);

    original.destroy();

    target.addChild(copy);
    copy.setWorldPosition(worldPos);
    copy.setWorldRotation(worldRot);
    copy.setWorldScale(worldScale);
    copy.setSiblingIndex(-1);

    const dur = Math.max(0.05, this.currencyCollectFlyDuration);
    const end = new Vec3(0, 0, 0);
    const endScale = new Vec3(0, 0, copy.scale.z);
    const ez = copy.eulerAngles.z + 720;
    const endEuler = new Vec3(copy.eulerAngles.x, copy.eulerAngles.y, ez);

    tween(copy)
      .to(dur, { position: end, scale: endScale, eulerAngles: endEuler }, { easing: "quadIn" })
      .call(() => {
        if (copy.isValid) copy.destroy();
      })
      .start();
  }

  private _stripPickupPhysicsAndMarkers(node: Node): void {
    for (const c of node.getComponents(BoxCollider2D)) c.destroy();
    for (const c of node.getComponents(RigidBody2D)) c.destroy();
    const mp = node.getComponent(MoneyPickup);
    if (mp) mp.destroy();
    const cp = node.getComponent(CardPickup);
    if (cp) cp.destroy();
    for (const ch of node.children) {
      this._stripPickupPhysicsAndMarkers(ch);
    }
  }

  private _onCurrencyCongrats = (): void => {
    const prefab = this.congratsTextPrefab;
    if (!prefab) return;

    const node = instantiate(prefab);
    this.node.addChild(node);

    const label = node.getComponent(Label) ?? node.getComponentInChildren(Label);
    if (label) {
      const count = CONGRATS_PHRASES.length;
      const prev = this._lastCongratsPhraseIndex;
      let idx = 0;
      if (count <= 1) {
        idx = 0;
      } else {
        const choices: number[] = [];
        for (let i = 0; i < count; i++) {
          if (i !== prev) choices.push(i);
        }
        idx = choices[Math.floor(Math.random() * choices.length)]!;
      }
      this._lastCongratsPhraseIndex = idx;
      label.string = CONGRATS_PHRASES[idx]!;
    }

    const sx = this.congratsStartPos.x;
    const sy = this.congratsStartPos.y;
    const z = node.position.z;
    node.setPosition(sx, sy, z);

    const op = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    op.opacity = 0;

    const dy = this.congratsAnimateYStep;
    const dur = Math.max(0.01, this.congratsPhaseDuration);
    const pause = Math.max(0, this.congratsPauseDuration);
    const pMid = new Vec3(sx, sy + dy, z);
    const pEnd = new Vec3(sx, sy + dy + dy, z);

    Tween.stopAllByTarget(node);
    Tween.stopAllByTarget(op);

    tween(node)
      .parallel(tween(node).to(dur, { position: pMid }), tween(op).to(dur, { opacity: 255 }))
      .delay(pause)
      .parallel(tween(node).to(dur, { position: pEnd }), tween(op).to(dur, { opacity: 0 }))
      .call(() => {
        if (node.isValid) node.destroy();
      })
      .start();
  };
}
