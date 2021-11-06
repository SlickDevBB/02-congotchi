// gui.ts
// this object controls display of all gui elements

import { GUI_0_STARS, GUI_1_STARS, GUI_2_STARS, GUI_3_STARS, GUI_SCORE_PANEL } from "game/assets";
import { getGameHeight, getGameWidth } from "game/helpers";
import { DEPTH_GUI_SCORE } from "game/helpers/constants";

interface Props {
    scene: Phaser.Scene;
    x: number;
    y: number;
  }

export class GuiScoreBoard extends Phaser.GameObjects.Image {
    private scorePanelStars: Phaser.GameObjects.Image;
    private scoreText;
    private score = 0;
    private xInit = 0;
    private yInit = 0;
    private scaleInit = 0;

    constructor({ scene, x, y }: Props) {
        super(scene, x, y, GUI_SCORE_PANEL);

        // set init variables
        this.xInit = x;
        this.yInit = y;

        // add the scoreboard to the scene
        this.scene.add.existing(this);

        // add the scorePanel for grid levels (it should start offscreen)
        this
            .setPosition(x, y)
            .setOrigin(0.5,0.5)
            .setScrollFactor(0)
            .setDisplaySize(getGameWidth(this.scene)*0.4, getGameWidth(this.scene)*0.126)
            .setDepth(DEPTH_GUI_SCORE)

        this.scaleInit = this.scale;
        
        // add the scorePanel for grid levels (it should start offscreen)
        this.scorePanelStars = this.scene.add.image(
            this.x,
            this.y,
            GUI_0_STARS,)
            .setScale(this.scale*0.4)
            .setOrigin(0.5,1.25)
            .setScrollFactor(0)
            .setDisplaySize(getGameWidth(this.scene)*0.25, getGameWidth(this.scene)*0.1)
            .setDepth(DEPTH_GUI_SCORE+1);
  
        // add the scoring text
        this.scoreText = this.scene.add.text(
            this.x,
            this.y,
            '0000000000',)
            .setVisible(true)
            .setStyle({
                fontFamily: 'Arial', 
                fontSize: Math.trunc(getGameHeight(this.scene)*0.03).toString() + 'px', 
                })
            .setOrigin(0.5,0.5)
            .setStroke('0x000000', 3)
            .setScrollFactor(0)
            .setDepth(DEPTH_GUI_SCORE+1);
        
    }

    public adjustScore(delta: number) {
        this.score += delta;
        this.scoreText.text = this.score.toString().padStart(10,'0');
    }

    public setStarScore(stars: 0 | 1 | 2 | 3) {
        if (stars === 0) this.scorePanelStars.setTexture(GUI_0_STARS);
        else if (stars === 1) this.scorePanelStars.setTexture(GUI_1_STARS);
        else if (stars === 2) this.scorePanelStars.setTexture(GUI_2_STARS);
        else if (stars === 3) this.scorePanelStars.setTexture(GUI_3_STARS);
    }

    public resetScore() {
        this.score = 0;
        this.scoreText.text = this.score.toString().padStart(10,'0');
        this.setStarScore(0);
    }

    public levelOver() {
        this.scene.add.tween({
            targets: [this],
            x: getGameWidth(this.scene)*0.5,
            y: getGameHeight(this.scene)*0.5,
            scale: 3,
            duration: 250,
        })
    }

    public returnHome() {
        this.scene.add.tween({
            targets: [this],
            x: this.xInit,
            y: this.yInit,
            scale: this.scaleInit,
            duration: 250,
        })
    }

    public update() {
        // ensure score text and stars follow around the panel
        this.scorePanelStars.setPosition(this.x, this.y);
        this.scorePanelStars.setScale(this.scale*0.4);
        this.scoreText.setPosition(this.x, this.y);
        this.scoreText.setFontSize(this.displayHeight*0.4);
    }

}