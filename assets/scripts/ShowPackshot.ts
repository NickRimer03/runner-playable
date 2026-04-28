import { _decorator, Component, Sprite } from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("ShowPackshot")
export class ShowPackshot extends Component {
  @property(Sprite)
  blackening: Sprite | null = null;

  @property([Sprite])
  gameLogo: Sprite[] = [];

  @property(Sprite)
  CTAButton: Sprite | null = null;

  private readonly _animationDuration = 0.5;

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.GAME_SHOW_PACKSHOT, this._onShowPackshot, this);
  }

  private async _onShowPackshot() {
    gameEventTarget.emit(GameEvents.REDIRECT_PROCESSING);
  }
}
