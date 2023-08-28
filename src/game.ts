import { DefaultEventsMap } from '@socket.io/component-emitter';
import { Socket, io } from 'socket.io-client';
import {
  ClientAction,
  ClientActionType,
  GameState,
  GameMap,
  Player,
  palette,
} from './types/client-models';

export class Game {
  private clientSocket: Socket<DefaultEventsMap, DefaultEventsMap>;
  private gameState: GameState;

  private isEndAttackButtonDisabled: boolean;
  private isEndTurnButtonDisabled: boolean;

  private board: Board;
  // private client: Client;

  constructor() {
    this.clientSocket = {} as Socket<DefaultEventsMap, DefaultEventsMap>;
    this.gameState = {} as GameState;
    this.board = {} as Board;
    // this.client = {} as Client;
    this.isEndAttackButtonDisabled = true;
    this.isEndTurnButtonDisabled = true;
  }

  // public bind(client: Client): GameController {
  //   this.client = client;
  //   return this;
  // }

  public start() {}

  public create(
    gameState: GameState,
    socket: Socket<DefaultEventsMap, DefaultEventsMap>
  ) {
    this.clientSocket = socket;
    this.gameState = { ...gameState };
    this.board = new Board(this.gameState.map);
    this.board.buildCanvas();

    this.update();

    this.board.canvas.addEventListener('click', (event) => {
      const x = event.offsetX;
      const y = event.offsetY;

      const { col, row } = this.findTileByCoords(x, y);

      this.handleAction({
        type: ClientActionType.ClickTile,
        data: { col, row },
      });
    });
  }

  public update() {
    this.board.render();
  }

  public handleEvent() {}

  public handleAction(action: ClientAction) {
    switch (action.type) {
      case ClientActionType.ClickTile:
        this.handleClick(action.data);
        break;
      case ClientActionType.EndTurn:
        this.handleEndTurn(action.data);
        break;
      case ClientActionType.EndAttack:
        this.handleEndAttack(action.data);
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
    });
  }

  private handleEndTurn(data: any) {
    // perform client side check?
    // send action to server

    this.clientSocket.emit(ClientActionType.EndTurn, {
      player: this.clientSocket.id,
    });
  }

  private handleEndAttack(data: any) {
    // perform client side check?
    // send action to server

    this.clientSocket.emit(ClientActionType.EndAttack, {
      player: this.clientSocket.id,
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
