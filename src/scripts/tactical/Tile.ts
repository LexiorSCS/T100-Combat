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
	   terrain: Terrain | null = null; // Add this line to define the terrain property and check for collision
	   unit: Unit | null = null; // Add this line to define the unit property and check for collision
	   isHazard: boolean = false; // Add this line to define the hazard property
	   // Trap properties
	   isTrapped: boolean = false;
	   		 trapSprite: Phaser.GameObjects.Sprite | null = null; // Sprite for the trap visual
   			 trapOwner: Unit | null = null; // Owner of the trap
    		 trapDamage: number = 0; // Damage dealt by the trap
    		 trapConditions: string[] = []; // Conditions applied by the trap
    		 isFriendlySafe: boolean = false; // Whether friendly units avoid the trap

		// Add new properties for debugging tilemap properties
		private debugText: Phaser.GameObjects.Text | null = null;
		private tileDebugInfo: string | null = null;

	constructor(scene: Phaser.Scene, x: number, y: number, size: number, gridX: number, gridY: number) 
	   {
		   super(scene, x, y, size, size, GVC.TILE_COLOR_DEFAULT, GVC.TILE_ALPHA_DEFAULT);
		   this.gridX = gridX;
		   this.gridY = gridY;
		   scene.add.existing(this);
		   this.setOrigin(0);
		   this.isWalkable = true; // Default to walkable
		   this.faction = -1; // Default to no faction
		   this.terrain = null; // Initialize terrain as null
		   this.isHazard = false; // Initialize hazard as false

		// Initialize hovering UI elements
		this.hoverSprite = this.scene.add.sprite(this.x + this.width / 2, this.y + this.height / 2, 'UI_Mark_W');
        this.hoverSprite.setDisplaySize(this.width, this.height);
        this.hoverSprite.setVisible(false);
        this.hoverSprite.setDepth(2); // Ensure the sprite is above the tile

		 // Create but hide the debug text - position it below the tile for top row
		 const isTopRow = gridY === 0;
		 this.debugText = this.scene.add.text(
			this.x + this.width / 2,
			this.y + (isTopRow ? this.height + 10 : -10), // Position below for top row, above for other rows
			"",
			{ 
				fontSize: '12px', 
				backgroundColor: '#000000',
				padding: { x: 5, y: 2 },
				color: '#ffffff'
			}
		).setOrigin(0.5, isTopRow ? 0 : 1) // Adjust origin based on position
		 .setDepth(100)
		 .setVisible(false);

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

	   resetTileState() {
        // Only reset if there's no terrain or hazard
        if (!this.terrain && !this.isHazard) {
            this.isWalkable = true;
        }
        this.unit = null;
    }

	// Override the setInteractive method to ensure proper event handling
    setInteractive() {
        super.setInteractive();
        // Make sure the tile is actually interactive
		if (this.input) {
			this.input.enabled = true;
		}
        return this;
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
        
        // Add tile property debugging
        this.showTileProperties();
    }

    onHoverOut() {
        this.hoverSprite.setVisible(false);
        
        // Hide the debug text
        if (this.debugText) {
            this.debugText.setVisible(false);
        }
    }

    // New method to fetch and display tile properties
    showTileProperties() {
        if (!this.debugText) return;
        
        // Get the CombatScene instance
        const combatScene = this.scene.scene.get('CombatScene') as CombatScene;
        
        // Only show debug info if debug mode is enabled
        if (!combatScene.debugModeEnabled) {
            if (this.debugText.visible) {
                this.debugText.setVisible(false);
            }
            return;
        }
        
        try {
            // Try to get the tilemap
            const mapLayout = this.scene.scene.get('CS_Biome01_StraightRoad');
            
            if (mapLayout && (mapLayout as any).m_CS_B01_StraightR02) {
                const map = (mapLayout as any).m_CS_B01_StraightR02;
                
                // Convert the combat grid position to tilemap position
                // We need to adjust for the tilemap offset vs. combat grid offset
                const tilemapOffsetX = -58;
                const tilemapOffsetY = -23;
                const gridOffsetX = 1.5 * GVC.CELL_SIZE;
                const gridOffsetY = 64;
                
                // Calculate the pixel position in the tilemap's coordinate system
                const pixelX = this.x + this.width/2 - tilemapOffsetX;
                const pixelY = this.y + this.height/2 - tilemapOffsetY;
                
                // Convert to tile coordinates in the tilemap
                const tileX = Math.floor(pixelX / map.tileWidth);
                const tileY = Math.floor(pixelY / map.tileHeight);
                
                // Try to get tiles from both layers
                const groundLayer = map.getLayer("Ground00");
                const cropsLayer = map.getLayer("Crops00");
                
                let infoText = `Grid: (${this.gridX},${this.gridY})\nMap: (${tileX},${tileY})\n`;
                
                // Check ground layer
                if (groundLayer) {
                    const groundTile = map.getTileAt(tileX, tileY, false, groundLayer.name);
                    if (groundTile) {
                        infoText += `Ground: ID ${groundTile.index}\n`;
                        if (groundTile.properties) {
                            infoText += `Properties: `;
                            for (const prop in groundTile.properties) {
                                infoText += `${prop}:${groundTile.properties[prop]} `;
                            }
                        }
                    }
                }
                
                // Check crops layer
                if (cropsLayer) {
                    const cropsTile = map.getTileAt(tileX, tileY, false, cropsLayer.name);
                    if (cropsTile) {
                        infoText += `\nCrops: ID ${cropsTile.index}\n`;
                        if (cropsTile.properties) {
                            infoText += `Properties: `;
                            for (const prop in cropsTile.properties) {
                                infoText += `${prop}:${cropsTile.properties[prop]} `;
                            }
                        }
                    }
                }
                
                // Add gameplay state info
                infoText += `\nWalkable: ${this.isWalkable}`;
                if (this.unit) infoText += `\nUnit: ${this.unit.name}`;
                if (this.terrain) infoText += `\nTerrain: ${this.terrain.name}`;
                if (this.isTrapped) infoText += `\nTrapped: Yes`;
                
                // Update and show the debug text
                this.debugText.setText(infoText);
                this.debugText.setVisible(true);
                
                // Ensure text doesn't go off-screen by adjusting position if needed
                const bounds = this.debugText.getBounds();
                
                // If text goes off top of screen, move it below the tile
                if (bounds.top < 0) {
                    this.debugText.setY(this.y + this.height + 10);
                    this.debugText.setOrigin(0.5, 0); // Top-center origin
                }
                
				// If text goes off bottom of screen, move it above the tile
				if (bounds.bottom > Number(this.scene.sys.game.config.height)) {
                    this.debugText.setY(this.y - 10);
                    this.debugText.setOrigin(0.5, 1); // Bottom-center origin
                }
            }
        } catch (error) {
            console.error("Error showing tile properties:", error);
            if (this.debugText) {
                this.debugText.setText(`Grid: (${this.gridX},${this.gridY})\nError: Couldn't access map data`);
                this.debugText.setVisible(true);
            }
        }
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
			this.setFillStyle(GVC.TILE_COLOR_TRAP, 0.7); // Slight Gold tint for trapped tile visual
			
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
			this.setFillStyle(GVC.TILE_COLOR_DEFAULT).setAlpha(GVC.TILE_ALPHA_DEFAULT); // Reset to default

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