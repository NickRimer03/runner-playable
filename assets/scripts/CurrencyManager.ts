import { _decorator, CCFloat, CCInteger, Component, Label, Tween, tween } from "cc";
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

  @property(Label)
  finalCurrencyLabel: Label | null = null;

  @property(CCFloat)
  finalCurrencyAnimateDuration: number = 1.25;

  @property({ type: CCInteger, min: 1 })
  currencyCongratsMilestone: number = 50;

  @property
  textPrefix: string = "$";

  private _currency = 0;
  private readonly _finalCurrencyTweenTarget = { value: 0 };

  onLoad() {
    this._currency = this.startCurrencyAmount;
  }

  onEnable() {
    this._subscribeEvents(true);
  }

  onDisable() {
    this._subscribeEvents(false);
    Tween.stopAllByTarget(this._finalCurrencyTweenTarget);
  }

  start() {
    this._updateLabel();
  }

  private _subscribeEvents(isOn: boolean): void {
    const fn = isOn ? "on" : "off";
    gameEventTarget[fn](GameEvents.MONEY_COLLECTED, this._onCurrencyCollected, this);
    gameEventTarget[fn](GameEvents.CARD_COLLECTED, this._onCurrencyCollected, this);
    gameEventTarget[fn](GameEvents.FINAL_CURRENCY_ANIMATE, this._onFinalCurrencyAnimate, this);
  }

  private _onCurrencyCollected = (evt: GameEvents): void => {
    const isMoney = evt === GameEvents.MONEY_COLLECTED;
    this._addCurrency(isMoney ? this.moneyValue : this._rollCardAmount());
  };

  private _onFinalCurrencyAnimate = (): void => {
    const label = this.finalCurrencyLabel;
    if (!label) return;

    Tween.stopAllByTarget(this._finalCurrencyTweenTarget);
    const end = this._currency;
    this._finalCurrencyTweenTarget.value = 0;
    label.string = `${this.textPrefix}0.00`;

    tween(this._finalCurrencyTweenTarget)
      .to(this.finalCurrencyAnimateDuration, { value: end }, {
        onUpdate: () => {
          label.string = `${this.textPrefix}${this._finalCurrencyTweenTarget.value.toFixed(2)}`;
        },
      })
      .call(() => {
        label.string = `${this.textPrefix}${end.toFixed(2)}`;
      })
      .start();
  };

  private _rollCardAmount(): number {
    const lo = Math.min(this.cardMin, this.cardMax);
    const hi = Math.max(this.cardMin, this.cardMax);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  private _addCurrency(amount: number): void {
    const prev = this._currency;
    this._currency += amount;

    const step = Math.max(1, this.currencyCongratsMilestone);
    const prevMilestone = Math.floor(prev / step);
    const curMilestone = Math.floor(this._currency / step);
    for (let k = prevMilestone; k < curMilestone; k++) {
      gameEventTarget.emit(GameEvents.CURRENCY_CONGRATS);
    }

    this._updateLabel();
  }

  private _updateLabel(): void {
    const label = this.currencyTextLabel;
    if (!label) return;

    label.string = `${this.textPrefix}${this._currency}`;
  }
}
