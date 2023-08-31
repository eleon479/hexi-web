import { DefaultEventsMap } from '@socket.io/component-emitter';
import {
  Player,
  GameRoom,
  GameState,
  ClientActionType,
  ServerEventType,
  SocketEventType,
} from './types/client-models';
import { Socket, io } from 'socket.io-client';
import { Game } from './game';

class Client {
  private socket: Socket<DefaultEventsMap, DefaultEventsMap>;

  private history: {
    sent: any[];
    received: any[];
  };

  private player: Player;
  private gameRoom: GameRoom;
  private gameState: GameState;

  private clientGame: Game;

  constructor() {
    this.socket = io('ws://localhost:8000/', {
      withCredentials: true,
      extraHeaders: {
        'my-custom-header': 'abcd',
      },
    });

    this.history = {
      sent: [],
      received: [],
    };
    this.player = {} as Player;
    this.gameRoom = {} as GameRoom;
    this.gameState = {} as GameState;
    this.clientGame = new Game();
  }

  public connect() {
    console.log('client: connect()');

    this.socket.on(SocketEventType.Connect, () => {
      this.showServerMessage(SocketEventType.Connect, this.socket.id);
      console.log('client: emit findGame()');
      this.socket.emit(ClientActionType.FindGame, {
        color: this.getRandomColor(),
      });
    });

    this.socket.on(ServerEventType.FindingPlayers, (data: GameRoom) => {
      console.log('client: on FindingPlayers');
      this.showServerMessage(ServerEventType.FindingPlayers, data);
    });

    this.socket.on(ServerEventType.GameStarted, (data: GameRoom) => {
      console.log('client: on GameStarted');

      let playerIds = Object.keys(data.players);

      const text = `- roomId: ${data.id}
      - players: [${playerIds.join(', ')}]
      - status: ${data.status}
      - locked: ${data.locked}
      - isReady: ${data.isReady}
      - gameState.currentPlayer: ${data.gameState.currentPlayer.id}
      - stage: ${data.gameState.stage}
      `;

      this.showServerMessage(ServerEventType.GameStarted, text);
      this.sync(data);

      // start game
      this.clientGame.create(this.gameState, this.socket, this.player);
    });

    this.socket.on(ServerEventType.BoardChanged, (data: GameRoom) => {
      console.log('client: on BoardChanged', data);

      // sync Client state w/ new Server data
      this.sync(data);

      // update Game state
      this.clientGame.update(this.gameState, this.player);

      // render Game Board
    });

    this.socket.on(ServerEventType.PlayerJoined, (data: any) => {
      console.log('client: on PlayerJoined');
      this.showServerMessage(ServerEventType.PlayerJoined, data);
    });

    this.socket.on(ServerEventType.PlayerLeft, (data: any) => {
      console.log('client: on PlayerLeft');
      this.showServerMessage(ServerEventType.PlayerLeft, data);
    });

    this.socket.on(SocketEventType.Disconnect, (data: any) => {
      console.log('client: on Disconnect');
      this.showServerMessage(SocketEventType.Disconnect, data);
    });
  }

  sync(serverState: GameRoom) {
    this.gameRoom = serverState;
    this.gameState = serverState.gameState;
    this.player = serverState.players[this.socket.id];
  }

  // on(action: ClientAction, handlerFunction: Function) {
  //   this.socket.on(action.type, handlerFunction);
  // }

  public handleGameAction() {}
  public handleGameEvent() {}

  private getRandomColor() {
    return '#000000'.replace(/0/g, () => {
      return (~~(Math.random() * 16)).toString(16);
    });
  }

  private showServerMessage(type: string, message: any) {
    var ul = document.getElementById('server-messages');
    var li = document.createElement('li');
    li.appendChild(
      document
        .createElement('pre')
        .appendChild(document.createTextNode(`${type}: ${message}`))
    );

    ul?.append(li);
    ul?.appendChild(li);

    // console.log(`${type}: ${message}`);
  }
}

console.log('client.ts: new Client()!');
const client = new Client();
client.connect();

// const game = new Game();

// import { io } from 'socket.io-client';

// const dataTest = <HTMLSpanElement>document.querySelector('#data-test');

// const socket = io('ws://localhost:8000/', {
//   withCredentials: true,
//   extraHeaders: {
//     'my-custom-header': 'abcd',
//   },
// });

// socket.emit('connection');
// socket.on('connection-test', (data) => {
//   console.log(data);
//   dataTest.innerText = 'data from server: ' + data;
// });
