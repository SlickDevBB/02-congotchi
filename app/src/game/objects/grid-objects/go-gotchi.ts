// grid-object-base-class.ts - base class for all grid objects

import { GO_Empty, GO_Props, GridLevel, GridObject } from 'game/objects';
import { GridPosition } from '../grid-level';
import { GOTCHI_BACK, GOTCHI_FRONT, GOTCHI_LEFT, GOTCHI_RIGHT } from 'game/assets';
import { GameScene } from 'game/scenes/game-scene';
import { DEPTH_GO_GOTCHI } from 'game/helpers/constants';
import { AavegotchiGameObject } from 'types';
import { timeStamp } from 'console';
import { queryAllByDisplayValue } from '@testing-library/dom';

export interface GO_Gotchi_Props {
    scene: Phaser.Scene;
    gridLevel: GridLevel;
    gridRow: number;
    gridCol: number;
    key: string;
    gotchi: AavegotchiGameObject;
    frame?: number;
    gridSize: number;
    objectType: 'BASE_CLASS' | 'INACTIVE' | 'EMPTY' | 'GOTCHI' | 'PORTAL' | 'GRENADE' | 'MILKSHAKE' | 'CACTI',
  }

interface CountGotchi {
    count: number,
    gotchi: GO_Gotchi | 0,
}
  
  export class GO_Gotchi extends GridObject {
    private direction: 'DOWN' | 'LEFT' | 'UP' | 'RIGHT' = 'DOWN';
    private leader: GridObject | 0 = 0;
    private followers: Array<GridObject | 0> = [0, 0, 0, 0]; // element 0 is down, 1 is left, 2 is up, 3 is right
    private gotchi: AavegotchiGameObject;

    // conga side is a variable for tracking which side we conga on
    private congaSide: 'LEFT' | 'RIGHT' = Math.round(Math.random()) === 1 ? 'LEFT' : 'RIGHT';

    // variable to see if we're jumping
    // public congaJumping = false;

    // timer is for click events
    private timer = 0;

    // define variables for dragging object
    private ogDragGridPosition = { row: 0, col: 0 };
    private dragAxis: 'X' | 'Y' | 'NOT_ASSIGNED' = 'NOT_ASSIGNED';
    private dragX = 0;
    private dragY = 0;

    // define public variables for conga
    public newRow = 0;
    public newCol = 0;
    public newDir: 'DOWN' | 'LEFT' | 'UP' | 'RIGHT' = 'DOWN';
    public status: 'READY' | 'CONGOTCHING' | 'JUMPING' | 'WAITING' = 'READY';

    constructor({ scene, gridLevel, gridRow, gridCol, key, gotchi, gridSize, objectType }: GO_Gotchi_Props) {
        super({scene, gridLevel, gridRow, gridCol, key, gridSize,objectType: 'GOTCHI'});

        // save our gridlevel
        this.gridLevel = gridLevel;  
        this.gridSize = gridSize;
        this.objectType = objectType;
        this.gotchi = gotchi;
        
        // set our grid position
        this.gridPosition = {row: gridRow, col: gridCol };

        // lets set our origin about our base point
        this.setOrigin(0.5, 0.5);

        // physics
        this.scene.physics.world.enable(this);
  
        // set to size of grids from game
        this.setDisplaySize(gridSize, gridSize);

        // set a specific depth
        this.setDepth(DEPTH_GO_GOTCHI);
    
        // add to the scene
        this.scene.add.existing(this);

        // enable draggable input
        this.setInteractive();
        this.scene.input.setDraggable(this);

        // set behaviour for pointer click down
        this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // get the time and grid we clicked in
            this.timer = new Date().getTime();
        });

        // set behaviour for pointer up event
        this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // See if we're close to a pointer down event for a single click
            const delta = new Date().getTime() - this.timer;
            if (delta < 200) {
                // this is where object interaction menu pops up
            }
        });

        // dragstart
        this.on('dragstart', () => {
            // store our initial drag positions
            this.ogDragGridPosition = this.getGridPosition();
            this.dragX = this.x;
            this.dragY = this.y;
        })

        // set behaviour for dragging
        this.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            const gameScene = this.scene as GameScene;
            const player = gameScene.getPlayer();

            if (gameScene && player) {    
                // if we've got movement points left we can drag
                if (player.getStat('MOVE_GOTCHI') > 0) {
                    // only drag objects into grids they have space for
                    const gp = this.getGridPosition();
                    const aboveEmpty = gp.row > 0 && this.gridLevel.isGridPositionEmpty(gp.row-1, gp.col);
                    const belowEmpty = gp.row < this.gridLevel.getNumberRows()-1 && this.gridLevel.isGridPositionEmpty(gp.row+1, gp.col);
                    const leftEmpty = gp.col > 0 && this.gridLevel.isGridPositionEmpty(gp.row, gp.col-1);
                    const rightEmpty = gp.col < this.gridLevel.getNumberCols()-1 && this.gridLevel.isGridPositionEmpty(gp.row, gp.col+1);
                    
                    const adoX = this.dragX;
                    const adoY = this.dragY;
                    const upLimit = aboveEmpty ? adoY - this.gridLevel.getGridSize() : adoY;
                    const downLimit = belowEmpty ? adoY + this.gridLevel.getGridSize() : adoY;
                    const leftLimit = leftEmpty ? adoX - this.gridLevel.getGridSize() : adoX;
                    const rightLimit = rightEmpty ? adoX + this.gridLevel.getGridSize() : adoX;
            
                    if (this.dragAxis === 'NOT_ASSIGNED') {
                        // find the predominant drag axis
                        this.dragAxis = Math.abs(dragX-this.dragX) > Math.abs(dragY-this.dragY) ? 'X' : 'Y';
                    }
            
                    // move along the dominant axis
                    if (this.dragAxis === 'X') {
                        if (dragX > leftLimit && dragX < rightLimit) this.x = dragX;
                    } else if (this.dragAxis === 'Y') {
                        if (dragY > upLimit && dragY < downLimit) this.y = dragY;
                    }
                }
            }
        });

        this.on('dragend', (pointer: Phaser.Input.Pointer) => {
            // store the grid position dragging finished in
            const finalGridPos = this.gridLevel.getGridPositionFromXY(this.x, this.y);
            this.setGridPosition(finalGridPos.row, finalGridPos.col);
            this.dragAxis = 'NOT_ASSIGNED';

            // get the player
            const player = (this.scene as GameScene).getPlayer();
    
            // decrease the players move count
            if (player) {
                // check we didn't just end up back in original position
                if (!(finalGridPos.row === this.ogDragGridPosition.row && finalGridPos.col === this.ogDragGridPosition.col)) {
                    player.adjustStat('MOVE_GOTCHI', -1);
                }
            }
        })

        // // Add animations
        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers(key || '', { start: 0, end: 1 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers(key || '', { start: 2, end: 3 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers(key || '', { start: 4, end: 5 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers(key || '', { start: 6, end: 7 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'down_happy',
            frames: this.anims.generateFrameNumbers(key || '', { start: 8, end: 9 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'left_happy',
            frames: this.anims.generateFrameNumbers(key || '', { start: 10, end: 11 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'right_happy',
            frames: this.anims.generateFrameNumbers(key || '', { start: 12, end: 13 }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: 'up_happy',
            frames: this.anims.generateFrameNumbers(key || '', { start: 14, end: 15 }),
            frameRate: 2,
            repeat: -1,
        });
    
        this.anims.play('down');

    }

    public findLeader() {
        // start by setting leader to 0
        this.leader = 0;

        // go to the cell our gotchi is facing and see if there's a gotchi in it
        let potentialLeader;
        switch (this.getDirection()) {
            case 'DOWN': potentialLeader = this.gridLevel.getGridObject(this.gridPosition.row+1, this.gridPosition.col) as GridObject; break;
            case 'LEFT': potentialLeader = this.gridLevel.getGridObject(this.gridPosition.row, this.gridPosition.col-1) as GridObject; break;
            case 'UP': potentialLeader = this.gridLevel.getGridObject(this.gridPosition.row-1, this.gridPosition.col) as GridObject; break;
            case 'RIGHT': potentialLeader = this.gridLevel.getGridObject(this.gridPosition.row, this.gridPosition.col+1) as GridObject; break;
            default: break;
            
        }

        // double check the grid object we found is a gotchi
        if (potentialLeader?.getType() === 'GOTCHI') {
            // check the gotchi isn't looking straight back at us
            let lookingAtUs = false;
            switch (this.getDirection()) {
                case 'DOWN': if ( (potentialLeader as GO_Gotchi).getDirection() === 'UP') lookingAtUs = true; break;
                case 'LEFT': if ( (potentialLeader as GO_Gotchi).getDirection() === 'RIGHT') lookingAtUs = true; break;
                case 'UP': if ( (potentialLeader as GO_Gotchi).getDirection() === 'DOWN') lookingAtUs = true; break;
                case 'RIGHT': if ( (potentialLeader as GO_Gotchi).getDirection() === 'LEFT') lookingAtUs = true; break;
                default: break;
            }
            if (!lookingAtUs) this.setLeader(potentialLeader as GO_Gotchi);
            else this.setLeader(0);
        } else {
            this.setLeader(0);
        }
    }

    public findFollowers() {
        // check each direction to see if there is a gotchi looking at us
        const downGotchi = this.gridLevel.getGridObject(this.gridPosition.row+1, this.gridPosition.col);
        this.followers[0] = (downGotchi && downGotchi.getType() === 'GOTCHI' && (downGotchi as GO_Gotchi).getDirection() === 'UP') ? 
            downGotchi : 0;

        const leftGotchi = this.gridLevel.getGridObject(this.gridPosition.row, this.gridPosition.col-1);
        this.followers[1] = (leftGotchi && leftGotchi.getType() === 'GOTCHI' && (leftGotchi as GO_Gotchi).getDirection() === 'RIGHT') ? 
            leftGotchi : 0;

        const upGotchi = this.gridLevel.getGridObject(this.gridPosition.row-1, this.gridPosition.col);
        this.followers[2] = (upGotchi && upGotchi.getType() === 'GOTCHI' && (upGotchi as GO_Gotchi).getDirection() === 'DOWN') ? 
            upGotchi : 0;

        const rightGotchi = this.gridLevel.getGridObject(this.gridPosition.row, this.gridPosition.col+1);
        this.followers[3] = (rightGotchi && rightGotchi.getType() === 'GOTCHI' && (rightGotchi as GO_Gotchi).getDirection() === 'LEFT') ? 
            rightGotchi : 0;
    }

    public setLeader(leader: GO_Gotchi | 0) {
        this.leader = leader;
        return this;
    }

    public getLeader() {
        return this.leader;
    }

    public hasLeader() {
        if (this.leader) return true;
        else return false;
    }

    public getFollowers() {
        return this.followers;
    }

    public hasFollower() {
        let haveFollower = false;
        this.followers.map( follower => { if (follower) haveFollower = true; });
        return haveFollower;
    }

    public getDirection() {
        return this.direction;
    }

    public setDirection(direction: 'DOWN' | 'LEFT' | 'RIGHT' | 'UP') {
        this.direction = direction;
        switch (direction) {
            case 'DOWN': {
                this.anims.play('down');
                break;
            }
            case 'LEFT': {
                this.anims.play('left');
                break;
            }
            case 'RIGHT': {
                this.anims.play('right');
                break;
            }
            case 'UP': {
                this.anims.play('up');
                break;
            }
            default: {
                
                break;
            }
        }
        return this;
    }

    public rotateCW() {
        if (this.direction === 'UP') this.setDirection('RIGHT');
        else if (this.direction === 'RIGHT') this.setDirection('DOWN');
        else if (this.direction === 'DOWN') this.setDirection('LEFT');
        else if (this.direction === 'LEFT') this.setDirection('UP');
        return this;
    }

    public rotateACW() {
        if (this.direction === 'UP') this.setDirection('LEFT');
        else if (this.direction === 'LEFT') this.setDirection('DOWN');
        else if (this.direction === 'DOWN') this.setDirection('RIGHT');
        else if (this.direction === 'RIGHT') this.setDirection('UP');
        return this;
    }

    public setRandomDirection() {
        const rand = Math.floor(Math.random()*4);
        if (rand === 0) this.setDirection('DOWN');
        else if (rand === 1) this.setDirection('LEFT');
        else if (rand === 2) this.setDirection('RIGHT');
        else this.setDirection('UP');
        return this;
    }

    public congaIntoPosition(row: number, col: number) {
        // define duration of one conga move
        const duration = 250;

        // call our set grid position that moves our gotchi
        this.setGridPosition(
            row,
            col,
            () => {
                this.setDirection(this.newDir);
                this.status = 'READY';
            },
            false,
            duration,
        )

        // add another tween for our gotchi which rotates him a bit to look conga'ish
        this.scene.add.tween({
            targets: this,
            angle: this.congaSide === 'LEFT' ? -10 : 10,
            duration: duration,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // change conga side
                this.congaSide = this.congaSide === 'LEFT' ? 'RIGHT' : 'LEFT';
            }
        })

        return this;

    }

    public congaJump() {

        // change anim to happy
        this.anims.play(this.getDirection().toLowerCase() + '_happy');

        const prevStatus = this.status;

        this.status = 'JUMPING';
        
        const duration = 125;

        this.scene.add.tween({
            targets: this,
            y: this.y - this.displayHeight*0.3,
            duration: duration,
            ease: 'Quad.easeOut',
            yoyo: true,
            onComplete: () => {
                this.status = prevStatus;
            }
        })

        this.scene.add.tween({
            targets: this,
            angle: 0,
            duration: duration,
        })
    }

    public congaIntoPortal(row: number, col: number) {
        this.setGridPosition(
            row,
            col,
            () => {
                (this.scene as GameScene).getGui()?.adjustScore(20);
                this.scene.add.tween({
                    targets: this,
                    scale: 0,
                    angle: 720,
                    duration: 500,
                    onComplete: () => {
                        this.destroy();
                    }
                });
            },
            true,
            250,
        )

        return this;
    }

    public calcCongaChain(gotchiChain: Array<GO_Gotchi>) {
        // call our recursive function
        this.getCongaChain(gotchiChain);
    }

    // get conga chain
    private getCongaChain(gotchiChain: Array<GO_Gotchi>) {
        // for each follower that is a gotchi add them to the chain and call their followers too
        if (this.followers[0]) {
            // add to the gotchi chain and check the follower for followers
            gotchiChain.push((this.followers[0] as GO_Gotchi));
            (this.followers[0] as GO_Gotchi).getCongaChain(gotchiChain);
        }
        if (this.followers[1]) {
            // add to the gotchi chain and check the follower for followers
            gotchiChain.push((this.followers[1] as GO_Gotchi));
            (this.followers[1] as GO_Gotchi).getCongaChain(gotchiChain);
        }
        if (this.followers[2]) {
            // add to the gotchi chain and check the follower for followers
            gotchiChain.push((this.followers[2] as GO_Gotchi));
            (this.followers[2] as GO_Gotchi).getCongaChain(gotchiChain);
        }
        if (this.followers[3]) {
            // add to the gotchi chain and check the follower for followers
            gotchiChain.push((this.followers[3] as GO_Gotchi));
            (this.followers[3] as GO_Gotchi).getCongaChain(gotchiChain);
        }

    }        

   public getStatus() {
       return this.status;
   }
  
    update(): void {
      // do something
    }
  }
  