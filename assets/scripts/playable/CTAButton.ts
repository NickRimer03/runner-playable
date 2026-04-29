import { _decorator, Component, Enum, Node } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";
import { GameState, getGameState } from "../state/GameState";

const { ccclass, property } = _decorator;

@ccclass("CTAButton")
export class CTAButton extends Component {
  @property({ type: [Enum(GameState)] })
  statesToRun: GameState[] = [GameState.NONE];

  private _statesToRunSet = new Set<GameState>();

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
