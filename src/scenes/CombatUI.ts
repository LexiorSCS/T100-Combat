/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

import Phaser from 'phaser';
import * as GVC from '../GlobalVariablesCombat';
// Import the Unit template.
import { Unit } from '../scripts/tactical/Unit';
import { UnitTier } from '../scripts/tactical/Unit'; 
import { AttackElement } from '../scripts/tactical/Unit';
import { AttackType } from '../scripts/tactical/Unit'; 

export class PopupWindow {
    private scene: Phaser.Scene;
    private popupBackground: Phaser.GameObjects.Graphics;
    private popupTitle: Phaser.GameObjects.Text;
    private buttons: Phaser.GameObjects.Text[] = [];
    private cancelButton: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, title: string, options: string[], onOptionSelected: (option: string) => void, onCancel: () => void) {
        this.scene = scene;
        console.log('PopupWindow created with title:', title); // Add this line

        // Popup Window Dimensions
        const popupWidth = this.scene.cameras.main.width / 3; // 1/3 of the screen width
        const popupHeight = this.scene.cameras.main.height / 3; // 1/3 of the screen height
        const popupX = (this.scene.cameras.main.width - popupWidth) / 2; // Center horizontally
        const popupY = (this.scene.cameras.main.height - popupHeight) / 2; // Center vertically

        // Background (30% Transparency)
        this.popupBackground = this.scene.add.graphics().setDepth(5);
        this.popupBackground.fillStyle(0x000000, 0.7);
        this.popupBackground.fillRect(popupX, popupY, popupWidth, popupHeight);

        // Title
        this.popupTitle = this.scene.add.text(popupX + popupWidth / 2, popupY + 20, title, {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(6);

        // Create Option Buttons
        options.forEach((option, index) => {
            const button = this.scene.add.text(popupX + 40, popupY + 80 + index * 40, option, {
                fontSize: '24px',
                color: '#ffffff',
            })
                .setInteractive()
                .on('pointerover', () => button.setColor('#ffff66')) // Yellowish white on hover
                .on('pointerout', () => button.setColor('#ffffff')) // Default back to white
                .on('pointerdown', () => {
                    this.destroy();
                    onOptionSelected(option); // Execute callback for option
                })
                .setDepth(6);
            this.buttons.push(button);
        });

        // Cancel Button (Reddish White on Hover)
        this.cancelButton = this.scene.add.text(popupX + popupWidth - 100, popupY + popupHeight - 40, 'CANCEL', {
            fontSize: '24px',
            color: '#ffffff',
        })
            .setInteractive()
            .on('pointerover', () => this.cancelButton.setColor('#ffcccc')) // Reddish white on hover
            .on('pointerout', () => this.cancelButton.setColor('#ffffff')) // Default back to white
            .on('pointerdown', () => {
                console.log('CANCELLED');
                this.destroy();
                onCancel();
            })
            .setDepth(6);
    }

    destroy() {
        this.popupBackground.destroy();
        this.popupTitle.destroy();
        this.buttons.forEach(button => button.destroy());
        this.cancelButton.destroy();
    }
}

export class PopupTargeting {
    private scene: Phaser.Scene;
    private barBackground: Phaser.GameObjects.Graphics;
    private barText: Phaser.GameObjects.Text;
    private cancelButton: Phaser.GameObjects.Text;
    private recreatePreviousWindow: () => void;

    constructor(scene: Phaser.Scene, title: string | null, options: string [] | null, onCancel: () => void, onOptionSelected: (option: string) => void, recreatePreviousWindow: () => void) {
        this.scene = scene;
        this.recreatePreviousWindow = recreatePreviousWindow;

        const barWidth = GVC.GRID_WIDTH * GVC.CELL_SIZE; // Exactly 8 cells wide
        const barHeight = GVC.CELL_SIZE * 0.65;
        const barX = (this.scene.cameras.main.width - barWidth) / 2; // Center horizontally with the grid
        const barY = this.scene.cameras.main.height - (GVC.CELL_SIZE / 1.25); // Align at the bottom, covering 1/2 of the lowest row

        // Background bar
        this.barBackground = this.scene.add.graphics().setDepth(3);
        this.barBackground.fillStyle(0x000000, 0.25);
        this.barBackground.fillRect(barX, barY, barWidth, barHeight);

        // Text
        this.barText = this.scene.add.text(barX + barWidth / 2, barY + 20, `${title} - Targeting...`, {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(4);

		// Cancel button
		this.cancelButton = this.scene.add.text(barX + barWidth / 2, barY + (barHeight / 1.3), 'CANCEL', {
			fontSize: '22px',
			color: '#ffffff',
		})
			.setOrigin(0.5)
			.setInteractive()
			.on('pointerover', () => this.cancelButton.setColor('#ffcccc')) // Reddish white on hover
            .on('pointerout', () => this.cancelButton.setColor('#ffffff')) // Default back to white
            .on('pointerdown', () => {
				console.log('CANCELLED');
                this.destroy();
                onCancel();
                this.recreatePreviousWindow(); // Recreate the previous window
            })
            .setDepth(4);
    }

    destroy() {
        this.barBackground.destroy();
        this.barText.destroy();
        this.cancelButton.destroy();
    }
}

export class InitiativeLadder {
    private scene: Phaser.Scene;
    private entryContainer: Phaser.GameObjects.Container;
    private unitEntries: Phaser.GameObjects.Container[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // Starting position of the whole Tracker
        this.entryContainer = this.scene.add.container(GVC.CELL_SIZE * 1.515, 24).setDepth(5);
    }

    updateInitiativeLadder(queue: { name: string, initiative: number, portraitKey: string, faction: number, element: AttackElement }[], activeUnitIndex: number) {
        queue.forEach((unit, index) => {
            let entryContainer = this.unitEntries[index];

            if (!entryContainer) {
                entryContainer = this.scene.add.container(index * 128, 0);
                this.unitEntries[index] = entryContainer;
                this.entryContainer.add(entryContainer);
            }

            // Ensure the texture exists before creating the image
            if (!this.scene.textures.exists(unit.portraitKey)) {
                console.error(`Texture not found: ${unit.portraitKey}`);
                return;
            }

            const factionColor = this.getFactionColor(unit.faction);
            let factionIndicator = entryContainer.list.find(obj => obj instanceof Phaser.GameObjects.Rectangle) as Phaser.GameObjects.Rectangle;
            if (!factionIndicator) {
                factionIndicator = this.scene.add.rectangle(-28, 0, 18, 78, factionColor).setOrigin(0.5);
                entryContainer.add(factionIndicator);
            } else {
                factionIndicator.setFillStyle(factionColor);
            }

            let unitImage = entryContainer.list.find(obj => obj instanceof Phaser.GameObjects.Image && !obj.texture.key.startsWith('Element_Crystal_')) as Phaser.GameObjects.Image;
            if (!unitImage) {
                unitImage = this.scene.add.image(0, 7, unit.portraitKey)
                    .setDisplaySize(64, 64);
                entryContainer.add(unitImage);
                console.log(`Avatar missing. Unit texture equal to = ${unit.portraitKey}`);
            } else {
                unitImage.setTexture(unit.portraitKey);
                console.log(`Avatar exists. Unit texture equal to = ${unit.portraitKey}`);
            }
            unitImage.setTint(index === activeUnitIndex ? 0xffff00 : 0xffffff);

            const unitElement = this.getUnitElement(unit.element);
            let elementIndicator = entryContainer.list.find(obj => obj instanceof Phaser.GameObjects.Image && obj.texture.key.startsWith('Element_Crystal_')) as Phaser.GameObjects.Image;
            if (!elementIndicator) {
                elementIndicator = this.scene.add.image(-52, 24, `Element_Crystal_${unitElement}`).setDisplaySize(18, 27).setOrigin(0.5);
                entryContainer.add(elementIndicator);
                console.log(`Element missing. Element texture equal to = Element_Crystal_${unitElement}`);
            } else {
                elementIndicator.setTexture(`Element_Crystal_${unitElement}`);
                console.log(`Element exists. Element texture equal to = Element_Crystal_${unitElement}`);
            }

            let unitInit = entryContainer.list.find(obj => obj instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
            if (!unitInit) {
                unitInit = this.scene.add.text(-52, 0, `${unit.initiative}`, {
                    fontSize: '20px',
                    color: index === activeUnitIndex ? '#ffff00' : '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 5,
                }).setOrigin(0.7, 1);
                entryContainer.add(unitInit);
            } else {
                unitInit.setText(`${unit.initiative}`);
                unitInit.setColor(index === activeUnitIndex ? '#ffff00' : '#ffffff');
            }

            let unitName = entryContainer.list.find(obj => obj instanceof Phaser.GameObjects.Text && obj.angle === -90) as Phaser.GameObjects.Text;
            if (index === activeUnitIndex) {
                if (!unitName) {
                    unitName = this.scene.add.text(-40, 0, `${unit.name || 'Unknown'} `, {
                        fontSize: '18px',
                        color: '#ffff00',
                        wordWrap: { width: 100, useAdvancedWrap: true },
                        stroke: '#000000',
                        strokeThickness: 2,
                        align: 'center'
                    }).setOrigin(0.75, 0).setAngle(-90);
                    entryContainer.add(unitName);
                } else {
                    unitName.setText(`${unit.name || 'Unknown'} `);
                }

                // Move factionIndicator to y: -45 at the start of the turn
                this.scene.tweens.add({
                    targets: factionIndicator,
                    y: -45,
                    duration: 300,
                    ease: 'Power2'
                });

                // Move unitName to x: 24 at the start of the turn
                this.scene.tweens.add({
                    targets: unitName,
                    x: 24,
                    duration: 300,
                    ease: 'Power2'
                });
            } else {
                if (unitName) {
                    unitName.destroy();
                }

                // Move factionIndicator back to y: 0 at the end of the turn
                this.scene.tweens.add({
                    targets: factionIndicator,
                    y: 0,
                    duration: 300,
                    ease: 'Power2'
                });
            }
        });

        // Remove any extra entries
        for (let i = queue.length; i < this.unitEntries.length; i++) {
            this.unitEntries[i].destroy();
        }
        this.unitEntries.length = queue.length;
    }

    clearLadder() {
        this.unitEntries.forEach(entry => entry.destroy());
        this.unitEntries = [];
    }

    getFactionColor(faction: number): number {
        switch (faction) {
            case 0:
                return 0x09abe8; // Blue for faction 0
            case 1:
                return 0xcc382d; // Red for faction 1
            case 2:
                return 0x00ff00; // Green for faction 2
            case 3:
                return 0xffff00; // Yellow for faction 3
            default:
                return 0xffffff; // White for unknown factions
        }
    }

    getUnitElement(element: AttackElement): string {
        switch (element) {
            case AttackElement.EARTH:
                console.log('Element is Earth');
                return 'E';
            case AttackElement.FIRE:
                console.log('Element is Fire');
                return 'F';
            case AttackElement.WATER:
                console.log('Element is Water');
                return 'W';
            case AttackElement.NEUTRAL:
                console.log('Element is Neutral');
                return 'N';
            case AttackElement.LIFE:
                console.log('Element is Life');
                return 'L';
            case AttackElement.DEATH:
                console.log('Element is Death');
                return 'D';
            case AttackElement.BALANCE:
                console.log('Element is Balance');
                return 'B';
            default:
                console.log('Element is Default (Neutral)');
                return 'N';
        }
    }

    getEntryByUnit(unit: Unit): { factionIndicator: Phaser.GameObjects.Rectangle } | null {
        const index = this.unitEntries.findIndex(entry => entry.getData('unit') === unit);
        if (index !== -1) {
            const entry = this.unitEntries[index];
            const factionIndicator = entry.list.find(obj => obj instanceof Phaser.GameObjects.Rectangle) as Phaser.GameObjects.Rectangle;
            return { factionIndicator };
        }
        return null;
    }
}

export default class CombatUI extends Phaser.Scene {
    private initiativeLadder: InitiativeLadder;
    private windowStack: (() => void)[] = [];

    constructor() {
        super("CombatUI");
    }

    editorCreate(): void {
        this.events.emit("scene-awake");
    }

    create() {
        this.initiativeLadder = new InitiativeLadder(this);
        this.editorCreate();

        // Ensure the initiative ladder is updated after creation
        this.events.on('updateInitiative', (queue: { name: string, initiative: number, portraitKey: string, faction: number, element: AttackElement }[], activeUnitIndex: number) => {
            this.updateInitiative(queue, activeUnitIndex);
        });

        // Emit an event to update the initiative ladder after creation
        this.events.emit('updateInitiative', [], 0);

        this.events.on('moveFactionIndicator', (unit: Unit, y: number) => {
            this.moveFactionIndicator(unit, y);
        });
    }

    preload() {
        this.load.pack("assets-tokens-pack", "assets/assets-tokens-pack.json");
        this.load.pack("asset-UI-pack", "assets/asset-UI-pack.json");
    }

    updateInitiative(queue: { name: string, initiative: number, portraitKey: string, faction: number, element: AttackElement }[], activeUnitIndex: number) {
        if (this.initiativeLadder) {
            this.initiativeLadder.updateInitiativeLadder(queue, activeUnitIndex);
        } else {
            console.error('InitiativeLadder is not initialized.');
        }
    }

    moveFactionIndicator(unit: Unit, y: number) {
        const entry = this.initiativeLadder.getEntryByUnit(unit);
        if (entry) {
            this.tweens.add({
                targets: entry.factionIndicator,
                y: y,
                duration: 300,
                ease: 'Power2'
            });
        }
    }

    // Method to create a Popup Window
    createPopupWindow(title: string, options: string[], onOptionSelected: (option: string) => void, onCancel: () => void) {
        this.scene.bringToTop(); // Bring the CombatUI scene to the top
        const recreateWindow = () => this.createPopupWindow(title, options, onOptionSelected, onCancel);
        this.windowStack.push(recreateWindow);
        return new PopupWindow(this, title, options, onOptionSelected, () => {
            onCancel();
            this.windowStack.pop();
            if (this.windowStack.length > 0) {
                this.windowStack[this.windowStack.length - 1]();
            }
        });
    }

    // Method to create a Popup Targeting
    createPopupTargeting(title: string | null, options: string[] | null, onCancel: () => void, onOptionSelected: (option: string) => void) {
        const recreateWindow = () => this.createPopupTargeting(title, options, onCancel, onOptionSelected);
        this.windowStack.push(recreateWindow);
        return new PopupTargeting(this, title, options, onCancel, onOptionSelected, () => {
            this.windowStack.pop();
            if (this.windowStack.length > 0) {
                this.windowStack[this.windowStack.length - 1]();
            }
        });
    }

	// Method to clear the popup window stack
	clearPopupWindowStack() {
		while (this.windowStack.length > 0) {
			this.windowStack.pop();
		}
	}
}

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
////////// TARGETING WINDOWS //////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////


/* END OF COMPILED CODE */
