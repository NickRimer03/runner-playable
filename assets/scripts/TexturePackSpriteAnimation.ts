import { _decorator, CCBoolean, CCFloat, CCString, Component, JsonAsset, Rect, Size, Sprite, SpriteFrame, Vec2 } from "cc";

const { ccclass, property } = _decorator;

interface TPRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TPFrameEntry {
  frame: TPRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: TPRect;
  sourceSize: { w: number; h: number };
}

/** TexturePacker JSON (CodeAndWeb / Pixi format used by Playbox): frames + animations + meta */
interface TexturePackSheet {
  frames: Record<string, TPFrameEntry>;
  animations: Record<string, string[]>;
  meta: {
    image: string;
    size: { w: number; h: number };
    scale?: number;
  };
}

/** Builds trimmed SpriteFrames from `character-sheet.json` + shared atlas texture; cycles clips like StopFrameAnimation. */
@ccclass("TexturePackSpriteAnimation")
export class TexturePackSpriteAnimation extends Component {
  @property(JsonAsset)
  sheetJson: JsonAsset | null = null;

  @property(Sprite)
  sprite: Sprite | null = null;

  /** Multiply baked coords when atlas resolution differs from JSON meta.size */
  @property(CCFloat)
  coordScale: number = 1;

  @property(CCFloat)
  fps: number = 10;

  @property(CCString)
  initialClip: string = "idle";

  @property(CCBoolean)
  autoplay: boolean = true;

  /** Matches Playbox: jump/hurt clips don't loop unless overridden */
  @property(CCBoolean)
  builtinNonLoopClips: boolean = true;

  private readonly _clips = new Map<string, SpriteFrame[]>();
  private _clipNames: string[] = [];

  /** Matches `SpriteFrame.texture` (engine uses TextureBase; not all subclasses are exported from `"cc"` typings). */
  private _texture: NonNullable<SpriteFrame["texture"]> | null = null;
  private _playing = false;
  private _frameIndex = 0;
  private _elapsed = 0;
  private _currentClip = "";
  private _loop = true;
  private _onClipComplete: (() => void) | null = null;

  onLoad() {
    if (!this.sprite) {
      this.sprite = this.node.getComponent(Sprite);
    }
    if (!this.sprite?.spriteFrame?.texture || !this.sheetJson?.json) {
      console.warn("TexturePackSpriteAnimation: assign Sprite with character texture and JsonAsset character-sheet.json");
      return;
    }

    const data = this.sheetJson.json as TexturePackSheet;
    const tex = this.sprite.spriteFrame.texture;
    const meta = data.meta?.size;
    if (meta) {
      const tw = tex.width * this.coordScale;
      const th = tex.height * this.coordScale;
      if (Math.abs(tw - meta.w) > 1 || Math.abs(th - meta.h) > 1) {
        console.warn(
          `TexturePackSpriteAnimation: texture ${tex.width}x${tex.height} vs meta ${meta.w}x${meta.h} — adjust coordScale`,
        );
      }
    }

    this._texture = tex;

    for (const [name, keys] of Object.entries(data.animations ?? {})) {
      const frames: SpriteFrame[] = [];
      for (const key of keys) {
        const fd = data.frames[key];
        if (!fd) {
          console.warn(`TexturePackSpriteAnimation: missing frame "${key}"`);
          continue;
        }
        frames.push(this._makeSpriteFrame(fd));
      }
      if (frames.length > 0) {
        this._clips.set(name, frames);
        this._clipNames.push(name);
      }
    }

    if (this.autoplay && this.initialClip && this._clips.has(this.initialClip)) {
      this.play(this.initialClip);
    }
  }

  /**
   * Play named clip from JSON `animations`.
   * By default `jump` and `hurt` play once if `builtinNonLoopClips` is set.
   * `onComplete` runs once when a non-looping clip reaches its last frame.
   */
  play(clip: string, opts?: { loop?: boolean; onComplete?: () => void }) {
    const frames = this._clips.get(clip);
    if (!frames?.length || !this.sprite) {
      return;
    }

    let loop = opts?.loop;
    if (loop === undefined && this.builtinNonLoopClips) {
      loop = clip !== "jump" && clip !== "hurt";
    } else if (loop === undefined) {
      loop = true;
    }

    this._onClipComplete = opts?.onComplete ?? null;

    this._currentClip = clip;
    this._loop = loop;
    this._frameIndex = 0;
    this._elapsed = 0;
    this._playing = true;
    this._applyFrame();
  }

  stop() {
    this._playing = false;
    this._onClipComplete = null;
  }

  get clipNames(): string[] {
    return [...this._clipNames];
  }

  get currentClip(): string {
    return this._currentClip;
  }

  /** Timeline length for one full playthrough of `clip` at current `fps`. */
  getClipDurationSeconds(clip: string): number {
    const frames = this._clips.get(clip);
    if (!frames?.length) return 0;
    return frames.length / Math.max(0.001, this.fps);
  }

  update(deltaTime: number) {
    if (!this._playing || !this.sprite) {
      return;
    }

    const frames = this._clips.get(this._currentClip);
    if (!frames?.length) {
      return;
    }

    const frameDuration = 1 / Math.max(0.001, this.fps);
    this._elapsed += deltaTime;

    while (this._elapsed >= frameDuration) {
      this._elapsed -= frameDuration;
      this._frameIndex += 1;

      if (this._frameIndex >= frames.length) {
        if (this._loop) {
          this._frameIndex = 0;
        } else {
          this._frameIndex = frames.length - 1;
          this._playing = false;
          const done = this._onClipComplete;
          this._onClipComplete = null;
          done?.();
          return;
        }
      }

      this._applyFrame();
    }
  }

  private _applyFrame() {
    const frames = this._clips.get(this._currentClip);
    if (!frames?.length || !this.sprite) {
      return;
    }
    const sf = frames[this._frameIndex];
    if (sf) {
      this.sprite.spriteFrame = sf;
    }
  }

  private _makeSpriteFrame(tp: TPFrameEntry): SpriteFrame {
    const f = tp.frame;
    const ss = tp.spriteSourceSize;
    const os = tp.sourceSize;
    const s = this.coordScale;

    const sf = new SpriteFrame();
    sf.texture = this._texture!;
    sf.rect = new Rect(f.x * s, f.y * s, f.w * s, f.h * s);
    sf.originalSize = new Size(os.w * s, os.h * s);
    sf.rotated = tp.rotated;

    const ox = (ss.x + ss.w / 2 - os.w / 2) * s;
    const oy = (ss.y + ss.h / 2 - os.h / 2) * s;
    sf.offset = new Vec2(ox, -oy);

    sf.packable = false;

    return sf;
  }
}
