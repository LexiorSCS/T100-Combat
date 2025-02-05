/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

import Phaser from 'phaser';
import * as GVC from '../GlobalVariablesCombat';

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

export default class CombatUI extends Phaser.Scene {
    private windowStack: (() => void)[] = [];

    constructor() {
        super("CombatUI");
    }

    editorCreate(): void {
        this.events.emit("scene-awake");
    }

    create() {
        this.editorCreate();
    }

    preload() {
        this.load.pack("assets-tokens-pack", "assets/assets-tokens-pack.json");
        this.load.pack("asset-UI-pack", "assets/asset-UI-pack.json");
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
