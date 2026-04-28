import { _decorator, Component, Input } from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";

const { ccclass } = _decorator;

@ccclass("ScreenInput")
export class ScreenInput extends Component {
  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    this.node[func](Input.EventType.TOUCH_END, this._onTouchEnd, this);
  }

  private _onTouchEnd() {
    gameEventTarget.emit(GameEvents.INPUT_UP);
  }
}
