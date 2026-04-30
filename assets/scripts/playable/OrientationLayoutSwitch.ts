import { _decorator, CCBoolean, Component, Sprite, SpriteFrame, UITransform, Vec2 } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";
import { getOrientation, ScreenOrientation } from "../utils/utils";

const { ccclass, property } = _decorator;

@ccclass("OrientationLayoutSwitch")
export class OrientationLayoutSwitch extends Component {
  @property(SpriteFrame)
  portraitSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  landscapeSpriteFrame: SpriteFrame | null = null;

  @property(CCBoolean)
  switchPosition = false;

  @property(Vec2)
  portraitPosition: Vec2 = new Vec2(0, 0);

  @property(Vec2)
  landscapePosition: Vec2 = new Vec2(0, 0);

  @property(CCBoolean)
  switchRotation = false;

  @property(Vec2)
  portraitRotation: Vec2 = new Vec2(0, 0);

  @property(Vec2)
  landscapeRotation: Vec2 = new Vec2(0, 0);

  @property(CCBoolean)
  switchScale = false;

  @property(Vec2)
  portraitScale: Vec2 = new Vec2(1, 1);

  @property(Vec2)
  landscapeScale: Vec2 = new Vec2(1, 1);

  @property(CCBoolean)
  switchContentSize = false;

  @property(Vec2)
  portraitContentSize: Vec2 = new Vec2(100, 100);

  @property(Vec2)
  landscapeContentSize: Vec2 = new Vec2(100, 100);

  onEnable() {
    gameEventTarget.on(GameEvents.ORIENTATION_CHANGED, this._onOrientation, this);
  }

  onDisable() {
    gameEventTarget.off(GameEvents.ORIENTATION_CHANGED, this._onOrientation, this);
  }

  start() {
    this._apply(getOrientation());
  }

  private _onOrientation = (orientation: ScreenOrientation): void => {
    this._apply(orientation);
  };

  private _apply(orientation: ScreenOrientation): void {
    const landscape = orientation === "landscape";

    if (this.switchPosition) {
      const v = landscape ? this.landscapePosition : this.portraitPosition;
      const p = this.node.position;
      this.node.setPosition(v.x, v.y, p.z);
    }

    if (this.switchRotation) {
      const v = landscape ? this.landscapeRotation : this.portraitRotation;
      const e = this.node.eulerAngles;
      this.node.setRotationFromEuler(v.x, v.y, e.z);
    }

    if (this.switchScale) {
      const v = landscape ? this.landscapeScale : this.portraitScale;
      const s = this.node.scale;
      this.node.setScale(v.x, v.y, s.z);
    }

    if (this.switchContentSize) {
      const v = landscape ? this.landscapeContentSize : this.portraitContentSize;
      const ui = this.node.getComponent(UITransform);
      if (ui) ui.setContentSize(v.x, v.y);
    }

    const sprite = this.node.getComponent(Sprite) ?? this.node.getComponentInChildren(Sprite);
    if (!sprite) return;
    const frame = landscape ? this.landscapeSpriteFrame : this.portraitSpriteFrame;
    if (frame) sprite.spriteFrame = frame;
  }
}
