// Import all Variables stored for running Combat commands as "GVC".
		import * as GVC from '../../GlobalVariablesCombat';
// Import the Unit type
		import { Unit } from './Unit';
		import { AttackType, AttackElement } from './Unit'; // Import the AttackType and AttackElement enums
// Import the Terrain type
		import { Terrain } from './Terrain';
		import { TerrainType } from './Terrain';
// Import the Phaser Scene for use in the Tile Class.
		import CombatScene from '../../scenes/CombatScene';
///////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////
		 // Combat Grid Tile configuration.
		 // Defines what a default interactive tile is, including being walkable by default.
	///////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////		 
	export class Tile extends Phaser.GameObjects.Rectangle 
	{
	   isWalkable: boolean;
	   hoverSprite: Phaser.GameObjects.Sprite;
	   faction: number;
	   gridX: number;
	   gridY: number;
	   terrain: Terrain | null = null; // Add this line to define the terrain property
	   // Trap properties
	   isTrapped: boolean = false;
	   		 trapSprite: Phaser.GameObjects.Sprite | null = null; // Sprite for the trap visual
   			 trapOwner: Unit | null = null; // Owner of the trap
    		 trapDamage: number = 0; // Damage dealt by the trap
    		 trapConditions: string[] = []; // Conditions applied by the trap
    		 isFriendlySafe: boolean = false; // Whether friendly units avoid the trap

	constructor(scene: Phaser.Scene, x: number, y: number, size: number, gridX: number, gridY: number) 
	   {
		   super(scene, x, y, size, size, GVC.TILE_COLOR_DEFAULT); // Default color (light gray)
		   this.gridX = gridX;
		   this.gridY = gridY;
		   scene.add.existing(this);
		   this.setOrigin(0);
		   this.isWalkable = true; // Default to walkable
		   this.faction = -1; // Default to no faction
		   this.terrain = null; // Initialize terrain as null

		// Initialize hovering UI elements
		this.hoverSprite = this.scene.add.sprite(this.x + this.width / 2, this.y + this.height / 2, 'UI_Mark_W');
        this.hoverSprite.setDisplaySize(this.width, this.height);
        this.hoverSprite.setVisible(false);
        this.hoverSprite.setDepth(2); // Ensure the sprite is above the tile

		// Set up UI hover events
		this.setInteractive();
        this.on('pointerover', () => this.onHover());
        this.on('pointerout', () => this.onHoverOut());

		   


			// OLD HIGHLIGHT SYSTEM
				// Add interactivity for testing (hover effect)
					//this.setInteractive();
					//let ogFillStyle = this.getFillStyle(); // Store the original fill style

			/*if (this.isWalkable == true) {
				this.on('pointerover', () => this.setFillStyle(GVC.TILE_COLOR_HIGHLIGHT_OK)); // highlight on hover
			} else {
				this.on('pointerover', () => this.setFillStyle(GVC.TILE_COLOR_DEFAULT_INVALID)); // Red highlight on hover
			}

			this.on('pointerout', () => this.setFillStyle(ogFillStyle)); // Revert to the original fill style on exit*/
	   }

	   // Hover event handlers
	   onHover() {
        if (this.isWalkable && this.fillColor === GVC.TILE_COLOR_HIGHLIGHT_OK) {
            this.hoverSprite.setTexture('UI_Mark_B');
        } else if (this.isWalkable && this.fillColor === GVC.TILE_COLOR_TRAP) {
			this.hoverSprite.setTexture('UI_Mark_Y');
		}
		else {
            switch (this.faction) {
                case 0:
                    this.hoverSprite.setTexture('UI_Mark_B');
                    break;
                case 1:
                    this.hoverSprite.setTexture('UI_Mark_R');
                    break;
                case 2:
                    this.hoverSprite.setTexture('UI_Mark_G');
                    break;
                case 3:
                    this.hoverSprite.setTexture('UI_Mark_Y');
                    break;
                default:
                    this.hoverSprite.setTexture('UI_Mark_W');
                    break;
            }
        }
        this.hoverSprite.setVisible(true);
    }

    onHoverOut() {
        this.hoverSprite.setVisible(false);
    }

	   setFillStyle(color: number, alpha?: number): this {
        this.fillColor = color; // Store the fill color
        return super.setFillStyle(color, alpha);
		}

		getFillStyle(): number {
			return this.fillColor; // Return the stored fill color
		}

		// Trapper SetTrap methods UI indicators
		setTrapVisual(faction: number) {
			this.setFillStyle(GVC.TILE_COLOR_TRAP, 0.8); // Slight Gold tint for trapped tile visual
			
			let spriteKey = '';
			switch (faction) {
				case 0:
					spriteKey = 'UI_Trap_B';
					break;
				case 1:
					spriteKey = 'UI_Trap_R';
					break;
				case 2:
					spriteKey = 'UI_Trap_G';
					break;
				case 3:
					spriteKey = 'UI_Trap_Y';
					break;
				default:
					spriteKey = 'UI_Trap_W'; /* Default to white if faction is unknown
					  							(or is 'wild' AKA faction 4+)*/
					break;
			}
			if (this.trapSprite) {
				this.trapSprite.destroy();
			}
	
			this.trapSprite = this.scene.add.sprite(this.x + this.width / 2, this.y + this.height / 2, spriteKey);
			this.trapSprite.setDisplaySize(this.width * 0.75 , this.height * 0.75);
			this.trapSprite.setDepth(1); // Ensure the sprite is above the decorations
			
		}
		
		clearTrapVisual() {
			this.setFillStyle(GVC.TILE_COLOR_DEFAULT); // Reset to default

			if (this.trapSprite) {
				this.trapSprite.destroy();
				this.trapSprite = null;
			}
			
		}
		
		/*
		triggerTrap(unit: Unit) {
			if (this.isTrapped && (!this.isFriendlySafe || this.trapOwner?.faction !== unit.faction)) {
				console.log(`${unit.name} triggered a trap at (${this.gridX}, ${this.gridY})`);
				unit.takeDamage(this.trapDamage);
				this.trapConditions.forEach(condition => unit.conditions.push(condition));
				this.clearTrapVisual();
				this.isTrapped = false;
				this.trapOwner = null;
			}
		}
			*/

		triggerTrap(target: Unit | Terrain) {
			console.log(`${target.type} triggers a trap!`);
		
			if (target instanceof Unit) {
				if (this.isTrapped && (!this.isFriendlySafe || this.trapOwner?.faction !== target.faction)){
					console.log(`${target.name} triggered a trap at (${this.gridX}, ${this.gridY})`);
					if (this.trapOwner) {
						target.takeDamage(this.scene as CombatScene, this.trapDamage /*damage*/, this.trapOwner /*attacker*/, AttackType.TERRAIN, AttackElement.NEUTRAL , false /*isUpgradeActive*/  ); // damage the unit
					}
					this.trapConditions.forEach(condition => target.conditions.push(condition));
					this.clearTrapVisual();
					this.isTrapped = false;
					this.trapOwner = null;
				}
			} else if (target instanceof Terrain && target.isDestructible) {
				if (this.isTrapped){
				console.log(`${target.name} triggered a trap at (${this.gridX}, ${this.gridY})`);
				target.takeDamage(this.scene, this.trapDamage); // Damage the terrain
					this.clearTrapVisual();
					this.isTrapped = false;
					this.trapOwner = null;
				}
			}
		}

		removeTargetingListeners() {
			this.off('pointerdown'); // Remove only the pointerdown event listener
		}
		
   }