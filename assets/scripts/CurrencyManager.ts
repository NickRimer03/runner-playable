import { _decorator, CCInteger, Component, Label } from "cc";
import { GameEvents } from "./events/GameEvents";
import { gameEventTarget } from "./events/GameEventTarget";

const { ccclass, property } = _decorator;

@ccclass("CurrencyManager")
export class CurrencyManager extends Component {
  @property(CCInteger)
  startCurrencyAmount: number = 0;

  @property(CCInteger)
  moneyValue: number = 20;

  @property(CCInteger)
  cardMin: number = 20;

  @property(CCInteger)
  cardMax: number = 40;

  @property(Label)
  currencyTextLabel: Label | null = null;

  @property
  textPrefix: string = "$";

  private _currency = 0;

  onLoad() {
    this._currency = this.startCurrencyAmount;
  }

  onEnable() {
    this._subscribeCollectEvents(true);
  }

  onDisable() {
    this._subscribeCollectEvents(false);
  }

  start() {
    this._updateLabel();
  }

  private _subscribeCollectEvents(isOn: boolean): void {
    const fn = isOn ? "on" : "off";
    gameEventTarget[fn](GameEvents.MONEY_COLLECTED, this._onCurrencyCollected, this);
    gameEventTarget[fn](GameEvents.CARD_COLLECTED, this._onCurrencyCollected, this);
  }

  private _onCurrencyCollected = (evt: GameEvents): void => {
    const isMoney = evt === GameEvents.MONEY_COLLECTED;
    this._addCurrency(isMoney ? this.moneyValue : this._rollCardAmount());
  };

  private _rollCardAmount(): number {
    const lo = Math.min(this.cardMin, this.cardMax);
    const hi = Math.max(this.cardMin, this.cardMax);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  private _addCurrency(amount: number): void {
    this._currency += amount;
    this._updateLabel();
  }

  private _updateLabel(): void {
    const label = this.currencyTextLabel;
    if (!label) return;

    label.string = `${this.textPrefix}${this._currency}`;
  }
}
