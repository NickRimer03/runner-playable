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
    gameEventTarget[func](GameEvents.MONEY_COLLECTED, this._onCollect, this);
    gameEventTarget[func](GameEvents.CARD_COLLECTED, this._onCollect, this);
    gameEventTarget[func](GameEvents.CHARACTER_HIT, this._onHit, this);
    gameEventTarget[func](GameEvents.CHARACTER_JUMP, this._onJump, this);
    gameEventTarget[func](GameEvents.CHARACTER_STEP, this._onStep, this);
    gameEventTarget[func](GameEvents.CHARACTER_STOP, this._onCharacterStop, this);
    gameEventTarget[func](GameEvents.GAME_FAIL, this._onGameFail, this);
    gameEventTarget[func](GameEvents.GAME_SUCCESS, this._onGameSuccess, this);
  }

  private _onGameFail = (): void => {
    this._stopSound("music");
    this._playSound("lose");
  };

  private _onGameSuccess = (): void => {
    this._stopSound("music");
    this._playSound("win");
  };

  private _onJump = (): void => {
    this._stopSound("step");
    this._playSound("jump");
  };

  private _onStep = (): void => {
    this._playSound("step");
  };

  private _onCharacterStop = (): void => {
    this._stopSound("step");
  };

  private _onHit = (): void => {
    this._playSound("hit");
    this._playSound("hurt");
  };

  private _onCollect = (): void => {
    this._playSound("collect");
  };

  private _playSound(key: string) {
    gameEventTarget.emit(GameEvents.SOUND_PLAY, key);
  }

  private _stopSound(key: string) {
    gameEventTarget.emit(GameEvents.SOUND_STOP, key);
  }

  private _playMusic() {
    this._playSound("music");
  }
}
