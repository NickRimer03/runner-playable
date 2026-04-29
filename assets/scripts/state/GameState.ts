import { GameEvents } from "../events/GameEvents";
import { gameEventTarget } from "../events/GameEventTarget";

export enum GameState {
  NONE = 0,

  START,
  TUTORIAL,
  GAMEPLAY,
  FINISH,
}

let gameState: GameState = GameState.NONE;
let prevGameState: GameState = GameState.NONE;

export function setGameState(state: GameState) {
  prevGameState = gameState;
  gameState = state;
  console.warn("Game state set to:", gameState);

  gameEventTarget.emit(GameEvents.GAME_STATE_SET, gameState, prevGameState);
}

export function getGameState() {
  return gameState;
}
