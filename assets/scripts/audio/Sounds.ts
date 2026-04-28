import { _decorator, Component } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("Sounds")
export class Sounds extends Component {
  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.INPUT_UP, this._playMusic, this);
    gameEventTarget[func](GameEvents.TOGGLE_SOUND, this._playMusic, this);
  }

  private _playSound(key: string) {
    gameEventTarget.emit(GameEvents.SOUND_PLAY, key);
  }

  private _playMusic() {
    this._playSound("music");
  }
}
