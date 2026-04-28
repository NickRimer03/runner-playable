import { _decorator, Component, Node } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("AudionToggler")
export class AudionToggler extends Component {
  @property(Node)
  off: Node;

  @property(Node)
  on: Node;

  private _isMute: boolean = false;

  onLoad() {
    this.off.active = this._isMute;
    this.on.active = !this._isMute;
  }

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean): void {
    const func: string = isOn ? "on" : "off";

    this.node[func](Node.EventType.TOUCH_START, this.onTouch, this);
  }

  onTouch(): void {
    gameEventTarget.emit(GameEvents.TOGGLE_SOUND, this._isMute);

    this._isMute = !this._isMute;

    this.off.active = this._isMute;
    this.on.active = !this._isMute;
  }
}
