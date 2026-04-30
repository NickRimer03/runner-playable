import {
  _decorator,
  BoxCollider2D,
  CCFloat,
  Collider2D,
  Color,
  Component,
  Contact2DType,
  IPhysics2DContact,
  Node,
  Sprite,
  Tween,
  tween,
} from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { CardPickup } from "./marker/CardPickup";
import { ConeHazard } from "./marker/ConeHazard";
import { EnemyHazard } from "./marker/EnemyHazard";
import { FinishTrigger } from "./marker/FinishTrigger";
import { MoneyPickup } from "./marker/MoneyPickup";
import { GameState, getGameState, setGameState } from "./state/GameState";
import { TexturePackSpriteAnimation } from "./TexturePackSpriteAnimation";

const { ccclass, property } = _decorator;

const CHARACTER_INSPECTOR_GROUP = { name: "Character", id: "character" };

/** Attach to the character root: listens for physics contacts and handles responses (hazards, pickups, etc.). */
@ccclass("CharacterCollision")
export class CharacterCollision extends Component {
  @property({ group: CHARACTER_INSPECTOR_GROUP, displayName: "Hit Flash Tint" })
  hitFlashTint: Color = new Color(255, 0, 0, 255);

  @property({
    type: CCFloat,
    group: CHARACTER_INSPECTOR_GROUP,
    displayName: "Hit Flash Step (sec)",
  })
  hitFlashStepSec: number = 0.05;

  @property({
    type: CCFloat,
    group: CHARACTER_INSPECTOR_GROUP,
    displayName: "Finish line run-on (sec)",
    tooltip: "After touching the finish, scroll and run continue this long before the level ends.",
  })
  finishLineRunOnSeconds: number = 1;

  @property({ group: CHARACTER_INSPECTOR_GROUP, displayName: "Finish NoJump child name" })
  finishNoJumpNodeName: string = "NoJump";

  @property({ group: CHARACTER_INSPECTOR_GROUP, displayName: "Enemy pause child name" })
  enemyTutorialPauseNodeName: string = "Pause";

  private _finishGracePending = false;

  onEnable() {
    this._subscribeCollision(true);
  }

  onDisable() {
    this._subscribeCollision(false);
    this.unschedule(this._emitFinishAfterRunOn);
    this._finishGracePending = false;
    const flashSprite = this._getCharacterSprite();
    if (flashSprite) {
      Tween.stopAllByTarget(flashSprite);
    }
  }

  private _subscribeCollision(isOn: boolean): void {
    const collider = this.node.getComponent(BoxCollider2D) ?? this.node.getComponentInChildren(BoxCollider2D);
    if (!collider) return;

    const fn = isOn ? "on" : "off";
    collider[fn](Contact2DType.BEGIN_CONTACT, this._onCharacterBeginContact, this);
  }

  private _onCharacterBeginContact(
    _selfCollider: Collider2D,
    otherCollider: Collider2D,
    _contact: IPhysics2DContact | null,
  ): void {
    if (this._isEnemyTutorialPauseContact(otherCollider.node)) {
      const s = getGameState();
      if (s === GameState.TUTORIAL) {
        setGameState(GameState.TUTORIAL_PAUSE);
      }
      return;
    }

    const s = getGameState();
    if (s !== GameState.GAMEPLAY && s !== GameState.TUTORIAL) return;

    if (this._isFinishNoJumpContact(otherCollider.node)) {
      gameEventTarget.emit(GameEvents.NO_JUMP_LOCK);
      return;
    }

    if (this._nodeChainHasFinishTrigger(otherCollider.node)) {
      const finishRoot = this._findFinishTriggerRoot(otherCollider.node);
      finishRoot?.getComponent(FinishTrigger)?.playRip();
      if (this._finishGracePending) return;
      this._finishGracePending = true;
      this.scheduleOnce(this._emitFinishAfterRunOn, Math.max(0, this.finishLineRunOnSeconds));
      return;
    }

    const collectible = this._findCollectible(otherCollider.node);
    if (collectible) {
      gameEventTarget.emit(GameEvents.COLLECTIBLE_FLY, collectible.root);
      return;
    }

    if (!this._isHazardCollider(otherCollider)) return;

    const anim = this.node.getComponent(TexturePackSpriteAnimation);
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
    const anim = this.node.getComponent(TexturePackSpriteAnimation);
    return anim?.sprite ?? this.node.getComponent(Sprite) ?? this.node.getComponentInChildren(Sprite);
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

  private _findCollectible(start: Node): { root: Node } | null {
    let n: Node | null = start;
    while (n) {
      if (n.getComponent(MoneyPickup) || n.getComponent(CardPickup)) return { root: n };
      n = n.parent;
    }
    return null;
  }

  private _isHazardCollider(other: Collider2D): boolean {
    return this._nodeChainHasEnemyHazard(other.node) || this._nodeChainHasConeHazard(other.node);
  }

  private _nodeChainHasEnemyHazard(start: Node | null): boolean {
    let n: Node | null = start;
    while (n) {
      if (n.getComponent(EnemyHazard)) return true;
      n = n.parent;
    }
    return false;
  }

  private _nodeChainHasConeHazard(start: Node | null): boolean {
    let n: Node | null = start;
    while (n) {
      if (n.getComponent(ConeHazard)) return true;
      n = n.parent;
    }
    return false;
  }

  private _isEnemyTutorialPauseContact(start: Node | null): boolean {
    if (!start) return false;
    const pauseName = (this.enemyTutorialPauseNodeName || "Pause").trim() || "Pause";
    let n: Node | null = start;
    while (n) {
      if (n.name === pauseName) {
        const hasBox = n.getComponent(BoxCollider2D) != null || n.getComponentInChildren(BoxCollider2D) != null;
        if (!hasBox) {
          n = n.parent;
          continue;
        }
        let p: Node | null = n.parent;
        while (p) {
          if (p.getComponent(EnemyHazard)) return true;
          p = p.parent;
        }
        return false;
      }
      n = n.parent;
    }
    return false;
  }

  private _isFinishNoJumpContact(start: Node | null): boolean {
    if (!start) return false;
    const jumpName = (this.finishNoJumpNodeName || "NoJump").trim() || "NoJump";
    let n: Node | null = start;
    while (n) {
      if (n.name === jumpName) {
        const hasBox = n.getComponent(BoxCollider2D) != null || n.getComponentInChildren(BoxCollider2D) != null;
        if (!hasBox) {
          n = n.parent;
          continue;
        }
        let p: Node | null = n.parent;
        while (p) {
          if (p.getComponent(FinishTrigger)) return true;
          p = p.parent;
        }
        return false;
      }
      n = n.parent;
    }
    return false;
  }

  private _nodeChainHasFinishTrigger(start: Node | null): boolean {
    let n: Node | null = start;
    while (n) {
      if (n.getComponent(FinishTrigger)) return true;
      n = n.parent;
    }
    return false;
  }

  private _findFinishTriggerRoot(start: Node | null): Node | null {
    let n: Node | null = start;
    while (n) {
      if (n.getComponent(FinishTrigger)) return n;
      n = n.parent;
    }
    return null;
  }

  private _emitFinishAfterRunOn = (): void => {
    this._finishGracePending = false;
    gameEventTarget.emit(GameEvents.GAME_FINISH);
  };
}
