import { _decorator, Animation, CCFloat, Component, Label, Node, Sprite, tween, Vec3 } from "cc";
import { Appearance } from "../Appearance";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";
import { opacityTo, opacityToPromise, promiseTween } from "../utils/utils";

const { ccclass, property } = _decorator;

@ccclass("ShowPackshot")
export class ShowPackshot extends Component {
  @property(CCFloat)
  animationDuration: number = 0.25;

  @property(Sprite)
  blackening: Sprite | null = null;

  @property({ type: CCFloat, min: 0, max: 1 })
  blackeningOpacity: number = 0.5;

  @property(Sprite)
  failSign: Sprite | null = null;

  @property({ type: [Node] })
  showOnFail: Node[] = [];

  @property({ type: [Node] })
  showOnSuccess: Node[] = [];

  @property(CCFloat)
  appearTimeGap: number = 0.15;

  @property(Sprite)
  ctaFail: Sprite | null = null;

  @property(Sprite)
  ctaSuccess: Sprite | null = null;

  @property({ type: [Node] })
  hide: Node[] = [];

  @property(Label)
  timerLabel: Label | null = null;

  @property(Label)
  nextPaymentLabel: Label | null = null;

  private async _cascadeAppear(nodes: (Node | null | undefined)[]): Promise<void> {
    const items = nodes.filter((x): x is Node => !!x);
    const gapSec = this.appearTimeGap;
    const dur = this.animationDuration;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const z = item.scale.z;
      const target = item.getComponent(Appearance)?.appearScale ?? 1;

      tween(item)
        .to(dur, { scale: new Vec3(target, target, z) }, { easing: "backOut" })
        .start();

      if (i < items.length - 1 && gapSec > 0) {
        await new Promise<void>((resolve) => {
          this.scheduleOnce(() => resolve(), gapSec);
        });
      }
    }
  }

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
    this._stopOfferCountdown();
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.GAME_SHOW_PACKSHOT, this._onShowPackshot, this);
  }

  private async _onShowPackshot(fail: boolean) {
    const dur = this.animationDuration;

    for (const n of this.hide) {
      opacityTo(n, 0, dur);
    }
    await opacityToPromise(this.blackening?.node, this.blackeningOpacity * 255, dur);

    if (fail) {
      const n = this.failSign?.node;
      if (n) {
        const s = n.getComponent(Appearance)?.appearScale ?? 1;
        await promiseTween(tween(n).to(dur, { scale: new Vec3(s, s, n.scale.z) }, { easing: "backOut" }));
      }

      await new Promise<void>((resolve) => {
        this.scheduleOnce(() => resolve(), 0.6);
      });

      n && (await promiseTween(tween(n).to(dur, { scale: new Vec3(0, 0, n.scale.z) })));

      await this._cascadeAppear(this.showOnFail);

      this.scheduleOnce(() => {
        void this.ctaFail?.getComponent(Animation)?.play();
      }, dur);
    } else {
      await this._cascadeAppear(this.showOnSuccess);

      this.scheduleOnce(() => {
        void this.ctaSuccess?.getComponent(Animation)?.play();
      }, dur);

      this._startOfferCountdown();
    }

    gameEventTarget.emit(GameEvents.FINAL_CURRENCY_ANIMATE);
  }

  private _offerSecondsRemaining = 0;

  private _formatMMSS(totalSeconds: number): string {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  private _startOfferCountdown(): void {
    const tl = this.timerLabel;
    if (!tl) return;

    this._stopOfferCountdown();
    opacityTo(tl.node, 255, 0);
    opacityTo(this.nextPaymentLabel?.node, 255, 0);

    this._offerSecondsRemaining = 60;
    tl.string = this._formatMMSS(60);
    this.schedule(this._onOfferCountdownTick, 1);
  }

  private _stopOfferCountdown(): void {
    this.unschedule(this._onOfferCountdownTick);
  }

  private _onOfferCountdownTick = (): void => {
    this._offerSecondsRemaining -= 1;
    const tl = this.timerLabel;
    if (tl) {
      tl.string = this._formatMMSS(this._offerSecondsRemaining);
    }
    if (this._offerSecondsRemaining > 0) return;

    this._stopOfferCountdown();
    opacityTo(this.timerLabel?.node, 0, 0);
    opacityTo(this.nextPaymentLabel?.node, 0, 0);
    const cta = this.ctaSuccess?.node;
    if (cta) {
      const p = cta.position;
      cta.setPosition(p.x, p.y + 130, p.z);
    }
  };
}
