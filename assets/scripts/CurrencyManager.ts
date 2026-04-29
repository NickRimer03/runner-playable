import { _decorator, CCInteger, Component, Label } from "cc";

const { ccclass, property } = _decorator;

@ccclass("CurrencyManager")
export class CurrencyManager extends Component {
  @property(CCInteger)
  startCurrencyAmount: number = 0;

  @property(Label)
  currencyTextLabel: Label | null = null;

  @property
  textPrefix: string = "$";

  private _currency = 0;

  start() {
    this._currency = this.startCurrencyAmount;
    this._updateLabel();
  }

  addCurrency(amount: number): void {
    this._currency += amount;
    this._updateLabel();
  }

  getCurrency(): number {
    return this._currency;
  }

  private _updateLabel(): void {
    const label = this.currencyTextLabel;
    if (!label) return;

    label.string = `${this.textPrefix}${this._currency}`;
  }
}
