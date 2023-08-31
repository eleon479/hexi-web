import { DefaultEventsMap } from '@socket.io/component-emitter';
import { Socket, io } from 'socket.io-client';
import {
  ClientAction,
  ClientActionType,
  GameState,
  GameMap,
  Player,
  palette,
  Stage,
} from './types/client-models';

export class Game {
  private clientSocket: Socket<DefaultEventsMap, DefaultEventsMap>;
  private gameState: GameState;
  private board: Board;
  private player: Player;

  constructor() {
    this.clientSocket = {} as Socket<DefaultEventsMap, DefaultEventsMap>;
    this.gameState = {} as GameState;
    this.board = {} as Board;
    this.player = {} as Player;
  }

  public start() {}

  public create(
    gameState: GameState,
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
    player: Player
  ) {
    this.clientSocket = socket;
    this.gameState = { ...gameState };
    this.player = { ...player };

    // provide board with map data
    this.board = new Board(this.gameState.map);

    // build canvas and render
    this.board.buildCanvas();
    this.updateButtons();
    this.updateDetails();
    this.board.render();

    // add event listeners
    this.listen();
  }

  public update(newGameState: GameState, newPlayerState: Player) {
    console.log('update(): ');

    this.gameState = { ...newGameState };
    this.player.gameState.availablePower =
      newPlayerState.gameState.availablePower;

    // update board with new map data from
    // this.board ...

    this.updateButtons();
    this.updateDetails();
    this.board.render();
  }

  public updateButtons() {
    const endAttack = document.getElementById('endAttack') as HTMLButtonElement;
    const endTurn = document.getElementById('endTurn') as HTMLButtonElement;

    if (this.gameState.currentPlayer.id === this.player.id) {
      if (this.gameState.stage === Stage.Attack) {
        console.log('its my turn: enable attack button');
        endAttack.removeAttribute('disabled');
        endTurn.setAttribute('disabled', 'true');
      } else {
        console.log('its my turn: enable end turn button');
        endAttack.setAttribute('disabled', 'true');
        endTurn.removeAttribute('disabled');
      }
    } else {
      console.log('its not my turn: disable all buttons');
      endAttack.setAttribute('disabled', 'true');
      endTurn.setAttribute('disabled', 'true');
    }
  }

  public updateDetails() {
    const myPlayerText = document.getElementById(
      'my-player'
    ) as HTMLSpanElement;
    const currentPlayerText = document.getElementById(
      'current-player'
    ) as HTMLSpanElement;
    const stageText = document.getElementById('stage') as HTMLSpanElement;
    const powerText = document.getElementById('power') as HTMLSpanElement;
    const attackHelp = document.getElementById(
      'details-help-attack'
    ) as HTMLSpanElement;
    const allocateHelp = document.getElementById(
      'details-help-allocate'
    ) as HTMLSpanElement;

    myPlayerText.innerText = this.player.id;
    currentPlayerText.innerText = this.gameState.currentPlayer.id;
    stageText.innerText = this.gameState.stage;
    powerText.innerText = this.player.gameState.availablePower.toString();

    if (this.gameState.stage === Stage.Attack) {
      attackHelp.style.display = 'inline';
      allocateHelp.style.display = 'none';
    } else if (this.gameState.stage === Stage.Allocate) {
      attackHelp.style.display = 'none';
      allocateHelp.style.display = 'inline';
    } else {
      attackHelp.style.display = 'none';
      allocateHelp.style.display = 'none';
    }
  }

  // add event listeners for player actions like clicks, end turn, etc.
  // which are then handled by handleAction() (and later sent to server)
  public listen() {
    this.board.canvas.addEventListener('click', (event) => {
      const x = event.offsetX;
      const y = event.offsetY;

      const { col, row } = this.findTileByCoords(x, y);

      // check if any tile was clicked?

      this.handleAction({
        type: ClientActionType.ClickTile,
        data: { col, row },
      });
    });

    const endAttack = document.getElementById('endAttack') as HTMLButtonElement;
    const endTurn = document.getElementById('endTurn') as HTMLButtonElement;

    // endAttack.removeAttribute('disabled');
    // endTurn.setAttribute('disabled', 'false');

    endAttack.addEventListener('click', () => {
      console.log('clicked end attack');
      this.handleAction({
        type: ClientActionType.EndAttack,
        data: null,
      });
    });

    endTurn.addEventListener('click', () => {
      console.log('clicked end turn');
      this.handleAction({
        type: ClientActionType.EndTurn,
        data: null,
      });
    });
  }

  public handleAction(action: ClientAction) {
    switch (action.type) {
      case ClientActionType.ClickTile:
        this.handleClick(action.data);
        break;
      case ClientActionType.EndTurn:
        this.handleEndTurn();
        break;
      case ClientActionType.EndAttack:
        this.handleEndAttack();
        break;
      default:
        console.error('Invalid action type', action);
    }
  }

  private handleClick(data: any) {
    console.log(`clicked tile: ${data.col}, ${data.row}`);
    // perform client side check ?

    // send action to server
    this.clientSocket.emit(ClientActionType.ClickTile, {
      col: data.col,
      row: data.row,
      player: this.clientSocket.id,
      room: this.player.assignedRoom,
    });
  }

  private handleEndAttack() {
    // perform client side check?
    // send action to server
    console.log(
      `handleEndAttack() - player: ${this.clientSocket.id} - room: ${this.player.assignedRoom}`
    );

    this.clientSocket.emit(ClientActionType.EndAttack, {
      player: this.clientSocket.id,
      room: this.player.assignedRoom,
    });
  }

  private handleEndTurn() {
    // perform client side check?
    // send action to server

    console.log(
      `handleEndTurn() - player: ${this.clientSocket.id} - room: ${this.player.assignedRoom}`
    );

    this.clientSocket.emit(ClientActionType.EndTurn, {
      player: this.clientSocket.id,
      room: this.player.assignedRoom,
    });
  }

  /*
    redo tile/canvas click handler:
    - Board will receive the click event
    - Board will calculate which hexagon was clicked based on 
    the click event's offsetX and offsetY
      - ex: (361, 318) -> (col: 4, row: 3)

    x,y to hex grid calculation: 
      https://stackoverflow.com/questions/7705228/hexagonal-grids-how-do-you-find-which-hexagon-a-point-is-in

    Also: Maybe just make this draw function 
    part of the Board class altogether?
  */

  private findTileByCoords(x: number, y: number): { col: number; row: number } {
    let tiles = this.gameState.map.tiles;
    let size = this.gameState.map.size;

    const getCenter = (col: number, row: number) => {
      let x = size + col * (size + size / 2);
      let y =
        size +
        row * (size * Math.sqrt(3)) +
        (col % 2) * (size * (Math.sqrt(3) / 2));

      return { x, y };
    };

    for (let c = 0; c < tiles.length; c++) {
      for (let r = 0; r < tiles[c].length; r++) {
        let center = getCenter(c, r);
        let distance = Math.sqrt(
          Math.pow(center.x - x, 2) + Math.pow(center.y - y, 2)
        );
        if (distance < size) {
          console.log('clicked on tile', c, r);
          return { col: c, row: r };
        }
      }
    }

    // not an optimal solution, but it works for now
    // ref for better algo: https://www.redblobgames.com/grids/hexagons/#pixel-to-hex

    return { col: -1, row: -1 };
  }
}

class Board {
  public canvasTiles: CanvasTile[][];
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  constructor(private tileSetup: GameMap) {
    this.canvasTiles = [];
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  public buildCanvas() {
    const centerList = [];
    const getCenter = (col: number, row: number) => {
      let x =
        this.tileSetup.size +
        col * (this.tileSetup.size + this.tileSetup.size / 2);

      let y =
        this.tileSetup.size +
        row * (this.tileSetup.size * Math.sqrt(3)) +
        (col % 2) * (this.tileSetup.size * (Math.sqrt(3) / 2));

      return { x, y };
    };

    for (let col = 0; col < this.tileSetup.columns; col++) {
      this.canvasTiles.push([]);
      for (let row = 0; row < this.tileSetup.rows; row++) {
        const { x, y } = getCenter(col, row);
        const newTile = new CanvasTile(
          col,
          row,
          x,
          y,
          this.tileSetup.size,
          this.tileSetup.tiles[col][row].color,
          this.tileSetup.tiles[col][row].power,
          this.tileSetup.tiles[col][row].active,
          this.tileSetup.tiles[col][row].player
        );

        this.canvasTiles[col].push(newTile);
      }
    }

    this.canvas.width = this.tileSetup.columns * this.tileSetup.size * 2;
    this.canvas.height = this.tileSetup.rows * this.tileSetup.size * 2;

    this.canvas.setAttribute('width', `${this.canvas.width}px`);
    this.canvas.setAttribute('height', `${this.canvas.height}px`);
  }

  public render() {
    this.canvasTiles.forEach((column) => {
      column.forEach((tile) => {
        tile.draw(this.canvas, this.ctx);
      });
    });
  }
}

class CanvasTile {
  private hexagon: Path2D;
  private drawSize: number;
  // private hasEventListener: boolean;
  private attacking: boolean;

  constructor(
    private col: number,
    private row: number,
    private x: number,
    private y: number,
    private size: number,
    private color: string,
    private power: number,
    private active: boolean,
    private player: Player | null
  ) {
    this.drawSize = this.size - 0.15 * this.size;
    this.hexagon = new Path2D();
    // this.hasEventListener = false;
    this.attacking = false;
  }

  public draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    if (!this.active) return;

    this.hexagon = new Path2D();
    ctx.beginPath();

    this.hexagon.moveTo(
      this.x + this.drawSize * Math.cos(0),
      this.y + this.drawSize * Math.sin(0)
    );

    for (let i = 1; i <= 6; i += 1) {
      this.hexagon.lineTo(
        this.x + this.drawSize * Math.cos((i * Math.PI) / 3),
        this.y + this.drawSize * Math.sin((i * Math.PI) / 3)
      );
    }

    ctx.closePath();

    let playerLineColor = palette.dark_gray;
    let playerFillColor = palette.background;

    if (this.player !== null) {
      playerLineColor = this.color;
      playerFillColor = this.color;
    }

    if (this.attacking) {
      playerLineColor = palette.white;
    }

    // console.log('playerFillColor', playerFillColor);

    // player fill
    ctx.fillStyle = playerFillColor;
    ctx.fill(this.hexagon);

    // gap / outline
    ctx.strokeStyle = palette.background;
    ctx.lineWidth = 15;
    ctx.stroke(this.hexagon);

    // player outline
    ctx.strokeStyle = playerLineColor;
    ctx.lineWidth = 3;
    ctx.stroke(this.hexagon);

    // power text
    let fontStyle = `${Math.floor(this.drawSize / 3)}px sans-serif`;
    ctx.font = fontStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(`${this.power}`, this.x, this.y, this.drawSize);

    // if (!this.hasEventListener) {
    //   canvas.addEventListener('click', this.handleCanvasClick);
    //   // add  event listener to hexagon?
    //   this.hasEventListener = true;
    // }
  }

  // public handleCanvasClick = (event: any) => {
  //   console.warn('clicked', event.offsetX, event.offsetY);

  //   // if (this.ctx.isPointInPath(this.hexagon, event.offsetX, event.offsetY)) {
  //   //   // this.canvas.removeEventListener('click', this.handleCanvasClick);
  //   //   console.warn('clicked on hexagon', this.col, this.row);
  //   // }
  //   //   // bubble up event to board/game/client?
  //   //   // fire off some event?
  //   // }
  // };
}
