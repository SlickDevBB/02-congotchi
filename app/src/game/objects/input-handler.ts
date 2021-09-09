// input-handler.ts
// looks after all input

import { PORTAL_OPEN } from 'game/assets';
import { GridObject, Player, GridLevel, GridPosition } from 'game/objects';

interface Props {
    scene: Phaser.Scene;
    gridLevel: GridLevel;
    player: Player;
}

export class InputHandler {
    private scene: Phaser.Scene;
    private gridLevel: GridLevel;
    private player: Player;
    private gotchiGOs: GridObject[] = [];
    private grenadeGOs: GridObject[] = [];
    private milkshakeGOs: GridObject[] = [];
    private cactiGOs: GridObject[] = [];
    private portalGOs: GridObject[] = [];
    private timer = 0;
    private pointerDownGridPosition: GridPosition = {row: 0, col: 0};
    private activeDragObjectGridPosition;
    private activeDragObjectAxis: 'X' | 'Y' | 'NOT_ASSIGNED' = 'NOT_ASSIGNED';
    private activeDragObjectX;
    private activeDragObjectY;
    private updateState;

    constructor({ scene, gridLevel, player} : Props) {
        this.scene = scene;
        this.gridLevel = gridLevel;
        this.player = player;
        this.gotchiGOs = gridLevel.getGridObjects('GOTCHIS');
        this.grenadeGOs = gridLevel.getGridObjects('GRENADES');
        this.milkshakeGOs = gridLevel.getGridObjects('MILKSHAKES');
        this.cactiGOs = gridLevel.getGridObjects('CACTI');
        this.portalGOs = gridLevel.getGridObjects('PORTALS');
        this.activeDragObjectGridPosition = {row: 0, col: 0};
        this.activeDragObjectX = 0;
        this.activeDragObjectY = 0;
        this.updateState = false;

        // set up what happens when we click down
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // get the time and grid we clicked in
            this.timer = new Date().getTime();
            this.pointerDownGridPosition = this.gridLevel.getGridPositionFromXY(pointer.x, pointer.y);
        });
    
        // setup what happens when pointer is lifted
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // see if we're close to a pointer down event for a single click
            const time2 = new Date().getTime();
            const delta = time2 - this.timer;
            if (delta < 200) {
                // get the new grid we've lifted the mouse pointer in
                const gp = this.gridLevel.getGridPositionFromXY(pointer.x, pointer.y);
                
                // if we have an empty grid position summon a portal
                if (this.player && this.player.getStat('PORTAL')) {
                    if (this.gridLevel.isGridPositionEmpty(gp.row, gp.col)) {

                        this.portalGOs[this.portalGOs.length] = new GridObject({
                            scene: this.scene,
                            gridLevel: this.gridLevel,
                            gridRow: gp.row,
                            gridCol: gp.col,
                            key: PORTAL_OPEN,
                            gridSize: this.gridLevel.getGridSize(),
                            objectType: 'PORTAL',
                        });
        
                    // decrease the players portal count
                    if (this.player) this.player.adjustStat('PORTAL', -1);
        
                    }
                }
        
                // see if we lifted the mouse on a gotchi and we've got rotate points left
                if (this.player && this.player.getStat('ROTATE') > 0) {
                    let i = 0;
                    let isGotchi = false;
                    while (i < this.gotchiGOs.length && !isGotchi) {
                        if (this.gotchiGOs[i].gridPosition.row === gp.row && this.gotchiGOs[i].gridPosition.col === gp.col) {
                            // we lifted the pointer on a gotchi!
                            isGotchi = true;
            
                            // if we haven't changed position we can rotate
                            if (this.gotchiGOs[i].gridPosition.row === this.pointerDownGridPosition.row && this.gotchiGOs[i].gridPosition.col === this.pointerDownGridPosition.col) {
                                this.gotchiGOs[i].rotateCW();
                                
                                // reduce our rotate state
                                if (this.player) this.player.adjustStat('ROTATE', -1);
                            }
                        }
                        i++;
                    }
                }
            }
            
        });
        
        // set up dragging for the grid objects
        this.scene.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: GridObject) => {
            this.activeDragObjectGridPosition = gameObject.getGridPosition();
            this.activeDragObjectX = gameObject.x;
            this.activeDragObjectY = gameObject.y;
        });
        
        // set up what happens while dragging
        this.scene.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: GridObject, dragX: number, dragY: number) => {
            // first see if we have any move points left
            if (this.player && this.player.getStat('MOVE') > 0) {
                // only drag objects into grids they have space for
                const gp = gameObject.getGridPosition();
                const aboveEmpty = gp.row > 1 && this.gridLevel.isGridPositionEmpty(gp.row-1, gp.col);
                const belowEmpty = gp.row < this.gridLevel.getNumberRows() && this.gridLevel.isGridPositionEmpty(gp.row+1, gp.col);
                const leftEmpty = gp.col > 1 && this.gridLevel.isGridPositionEmpty(gp.row, gp.col-1);
                const rightEmpty = gp.col < this.gridLevel.getNumberCols() && this.gridLevel.isGridPositionEmpty(gp.row, gp.col+1);
                
                const adoX = this.activeDragObjectX;
                const adoY = this.activeDragObjectY;
                const upLimit = aboveEmpty ? adoY - this.gridLevel.getGridSize() : adoY;
                const downLimit = belowEmpty ? adoY + this.gridLevel.getGridSize() : adoY;
                const leftLimit = leftEmpty ? adoX - this.gridLevel.getGridSize() : adoX;
                const rightLimit = rightEmpty ? adoX + this.gridLevel.getGridSize() : adoX;
        
                if (this.activeDragObjectAxis === 'NOT_ASSIGNED') {
                    // find the predominant drag axis
                    this.activeDragObjectAxis = Math.abs(dragX-this.activeDragObjectX) > Math.abs(dragY-this.activeDragObjectY) ? 'X' : 'Y';
                }
        
                // move along the dominant axis
                if (this.activeDragObjectAxis === 'X') {
                    if (dragX > leftLimit && dragX < rightLimit) gameObject.x = dragX;
                } else if (this.activeDragObjectAxis === 'Y') {
                    if (dragY > upLimit && dragY < downLimit) gameObject.y = dragY;
                }
            }
        });

        // set up what happens when dragging ends
        this.scene.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: GridObject, dragX: number, dragY: number) => {
            const finalGridPos = this.gridLevel.getGridPositionFromXY(gameObject.x, gameObject.y);
            const ogGridPos = this.activeDragObjectGridPosition;
            gameObject.setGridPosition(finalGridPos.row, finalGridPos.col);
            this.activeDragObjectAxis = 'NOT_ASSIGNED';
    
            // decrease the players move count
            if (this.player) {
                // check we didn't just end up back in original position
                if (!(finalGridPos.row === ogGridPos.row && finalGridPos.col === ogGridPos.col)) {
                    this.player.adjustStat('MOVE', -1);
                }
            }
            
        });
    
    }


    public update() {
        // if we've got an update condition for state do an update
        if (this.updateState) {


            this.updateState = false;
        }
    }

}