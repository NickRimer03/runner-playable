import {
  _decorator,
  CCFloat,
  Component,
  Sprite,
} from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";
import { GameState, setGameState } from "./state/GameState";

const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  @property(CCFloat)
  opacityDuration: number = 0.25;

  @property(Sprite)
  hand: Sprite | null = null;

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean) {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.GAME_FINISH, this._finishGame, this);
  }

  start() {
    setGameState(GameState.START);
  }

  private _finishGame() {
    setGameState(GameState.FINISH);

    gameEventTarget.emit(GameEvents.GAME_SHOW_PACKSHOT);
  }
}
