import { _decorator, Component, sys } from "cc";
import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("Redirector")
export class Redirector extends Component {
  @property
  iOsUrl: string = "https://apps.apple.com/";

  @property
  androidUrl: string = "https://play.google.com/";

  private _currentStoreLink: string = "";

  protected onLoad() {
    //@ts-ignore
    window.gameReady && window.gameReady();

    //@ts-ignore
    window.super_html && window.super_html.game_ready();

    //@ts-ignore
    window.super_html && (window.super_html.appstore_url = this.iOsUrl);

    //@ts-ignore
    window.super_html && (window.super_html.google_play_url = this.androidUrl);
  }

  protected onEnable() {
    this._currentStoreLink = /android/i.test(navigator.userAgent) ? this.androidUrl : this.iOsUrl;

    this._subscribeEvents(true);
  }

  protected onDisable() {
    this._subscribeEvents(false);
  }

  private _subscribeEvents(isOn: boolean): void {
    const func = isOn ? "on" : "off";

    gameEventTarget[func](GameEvents.REDIRECT_PROCESSING, this.onRedirectProcessing, this);
  }

  onRedirectProcessing() {
    console.log("[Redirector] onRedirectProcessing");

    // @ts-ignore
    window.gameEnd && window.gameEnd();

    //@ts-ignore
    window.super_html && window.super_html.game_end();

    try {
      // @ts-ignore
      window.AdRedirectProcessing && window.AdRedirectProcessing();

      //@ts-ignore
      window.super_html && window.super_html.download();
    } catch (e) {
      if (sys.platform === "EDITOR_PAGE") {
        alert("REDIRECT");
      } else {
        window[decodeURIComponent("%6c") + "ocation"].href = this._currentStoreLink;
      }
    }
  }
}
