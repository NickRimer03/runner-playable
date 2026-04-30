export enum GameEvents {
  NONE = 0,

  INPUT_UP,

  CHARACTER_HIT,
  CHARACTER_JUMP,
  CHARACTER_STEP,
  CHARACTER_STOP,

  MONEY_COLLECTED,
  CARD_COLLECTED,
  COLLECTIBLE_FLY,

  /** Player entered finish-line NoJump zone; jump disabled until level ends / new run. */
  NO_JUMP_LOCK,

  GAME_FINISH,
  GAME_SHOW_PACKSHOT,
  GAME_FAIL,
  GAME_SUCCESS,

  /** Fired when the character wins (after {@link GAME_SUCCESS}). Listeners: {@link ConfettiBurst}. */
  CONFETTI_BURST,

  FINAL_CURRENCY_ANIMATE,

  CURRENCY_CONGRATS,

  GAME_STATE_SET,

  /** `emit` passes `"portrait" | "landscape"` when canvas size / orientation changes. */
  ORIENTATION_CHANGED,

  REDIRECT_PROCESSING,

  TOGGLE_SOUND,
  SOUND_PLAY,
  SOUND_STOP,
}
