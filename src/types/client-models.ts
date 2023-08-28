export const palette = {
  background: '#0d0d0d',
  blue: '#29C2DE',
  green: '#26C99E',
  indigo: '#CC78FA',
  violet: '#C724B1',
  dark_teal: '#005151',
  light_teal: '#30CEBB',
  red: '#DD5E89',
  white: '#FFFFFF',
  dark_gray: '#53565A',
};

export type Player = {
  id: string;
  color: string;
  assignedRoom: string;
  gameState: {
    availablePower: number;
  };
};

export type PlayerInfo = {
  name?: string;
  color: string;
};

export type GameRoom = {
  id: string;
  players: { [id: string]: Player };
  status: string;
  locked: boolean;
  gameState: GameState;
  isReady: boolean;
};

export type GameState = {
  map: GameMap;
  stage: Stage;
  currentPlayer: Player;
  currentAttackNodeSelected: boolean;
  currentAttackNodeColumn: number;
  currentAttackNodeRow: number;
  currentAttackNodePower: number;
};

export enum Stage {
  Attack = 'Attack',
  Allocate = 'Allocate',
}

export type GameMap = {
  size: number;
  columns: number;
  rows: number;
  tiles: GameTile[][];
};

export type GameTile = {
  id: string;
  x: number;
  y: number;
  type: string;
  color: string;
  player: Player | null;
  power: number;
  active: boolean;
};

export type ClientAction = {
  type: ClientActionType;
  data: any;
};

export enum ClientActionType {
  FindGame = 'player:findGame',
  ClickTile = 'player:clickTile',
  EndTurn = 'player:endTurn',
  EndAttack = 'player:endAttack',
}

export type ServerEvent = {
  type: ServerEventType;
  data: any;
};

export enum ServerEventType {
  FindingPlayers = 'game.findingPlayers',
  GameStarted = 'game.started',
  GameEnded = 'game.ended',
  PlayerJoined = 'game.playerJoined',
  PlayerLeft = 'game.playerLeft',
  BoardChanged = 'game.boardChanged',
}

export enum SocketEventType {
  Connect = 'connect',
  Disconnect = 'disconnect',
  Disconnecting = 'disconnecting',
}
