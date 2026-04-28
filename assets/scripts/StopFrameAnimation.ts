import { _decorator, CCBoolean, CCInteger, Color, Component, Sprite, SpriteFrame, UIOpacity } from "cc";
import { opacityTo, opacityToPromise } from "./utils/utils";

const { ccclass, property } = _decorator;

@ccclass("StopFrameAnimation")
export class StopFrameAnimation extends Component {
  @property([SpriteFrame])
  frames: SpriteFrame[] = [];

  @property(CCBoolean)
  loop: boolean = true;

  @property(CCInteger)
  fps: number = 12;

  @property(CCBoolean)
  autoplay: boolean = true;

  @property(Color)
  tint: Color = new Color(255, 255, 255, 255);

  @property(CCBoolean)
  smoothAppearance: boolean = false;

  @property(CCBoolean)
  hideOnComplete: boolean = true;

  @property(CCBoolean)
  hideSmoothly: boolean = false;

  @property(CCBoolean)
  destroyAfterHide: boolean = false;

  @property(Sprite)
  sprite: Sprite | null = null;

  private readonly _hideOpacityDuration = 0.5;

  private _frameIndex: number = 0;
  private _elapsed: number = 0;
  private _playing: boolean = false;

  start() {
    if (!this.sprite) {
      this.sprite = this.node.getComponent(Sprite);
    }
    if (!this.sprite) return;

    this.sprite.color = this.tint.clone();
    this._applyFrame();

    if (this.smoothAppearance) {
      const o = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
      o.opacity = 0;
    }

    if (this.autoplay && this.frames.length > 0) {
      this.play();
    }
  }

  update(deltaTime: number) {
    if (!this._playing || !this.sprite || this.frames.length === 0) return;

    const frameDuration = 1 / this.fps;
    this._elapsed += deltaTime;

    while (this._elapsed >= frameDuration) {
      this._elapsed -= frameDuration;
      this._frameIndex += 1;

      if (this._frameIndex >= this.frames.length) {
        if (this.loop) {
          this._frameIndex = 0;
        } else {
          this._playing = false;
          if (this.hideOnComplete) {
            void this._hideAfterComplete();
          }

          return;
        }
      }

      this._applyFrame();
    }
  }

  play() {
    if (!this.sprite || this.frames.length === 0) return;

    const o = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    if (this.smoothAppearance) {
      o.opacity = 0;
      opacityTo(this.node, 255, this._hideOpacityDuration);
    } else {
      o.opacity = 255;
    }

    this._playing = true;
    this._frameIndex = 0;
    this._elapsed = 0;
    this.node.active = true;
    this._applyFrame();
  }

  stop() {
    this._playing = false;
  }

  setFrame(index: number) {
    if (this.frames.length === 0) return;
    this._frameIndex = Math.max(0, Math.min(index, this.frames.length - 1));
    this._applyFrame();
  }

  private _applyFrame() {
    if (!this.sprite || this.frames.length === 0) return;
    const frame = this.frames[this._frameIndex];
    if (frame) {
      this.sprite.spriteFrame = frame;
    }
  }

  private async _hideAfterComplete() {
    if (this.hideSmoothly) {
      await opacityToPromise(this.node, 0, this._hideOpacityDuration, "linear");
    }

    if (this.destroyAfterHide) {
      this.node.destroy();
    } else {
      this.node.active = false;
    }
  }
}
