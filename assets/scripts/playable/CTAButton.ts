import { _decorator, CCInteger, Component, Node } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";
import { getGameState } from "../state/GameState";

const { ccclass, property } = _decorator;

@ccclass("CTAButton")
export class CTAButton extends Component {
  @property({ type: [CCInteger], min: 0 })
  statesToRun: number[] = [0];

  private _statesToRunSet = new Set<number>();

  onEnable() {
    this._statesToRunSet = new Set(this.statesToRun);
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean): void {
    const func: string = isOn ? "on" : "off";

    this.node[func](Node.EventType.TOUCH_END, this.onTouch, this);
  }

  onTouch(): void {
    if (!this._statesToRunSet.has(getGameState())) return;

    gameEventTarget.emit(GameEvents.REDIRECT_PROCESSING);
  }
}
