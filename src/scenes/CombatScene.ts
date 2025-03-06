// Import all Variables stored for running Combat commands as "GVC".
import * as GVC from '../GlobalVariablesCombat';
// Import the Combat Grid Tile configuration.
import { Tile } from '../scripts/tactical/Tile';    
// Import the Unit template.
import { Unit } from '../scripts/tactical/Unit';
import { UnitTier } from '../scripts/tactical/Unit'; 
import { AttackElement } from '../scripts/tactical/Unit';
import { AttackType } from '../scripts/tactical/Unit'; 
// Import the Terrain elements.
import { Terrain } from '../scripts//tactical/Terrain';
import { TerrainType } from '../scripts//tactical/Terrain'
// Import Combat User Interface (UI) Scene.
// import CombatUI from './CombatUI';
import { InitiativeLadder, PopupTargeting, PopupWindow } from './CombatUI';
import CombatUI from './CombatUI';
import CS_Tutorial from './CS_Tutorial';
import CS_Biome01_StraightRoad from './CS_Biome01_StraightRoad';

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class CombatScene extends Phaser.Scene {

	constructor() {
		super("CombatScene");

		/* START-USER-CTR-CODE */
        // Write your code here.
        /* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// battlemapHORIZ
		const battlemapHORIZ = this.add.image(0, 0, "BattlemapHORIZ");
		battlemapHORIZ.setOrigin(0, 0);
		battlemapHORIZ.visible = false;

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */
    // Move all your property declarations here
    grid: Tile[][] = [];
    private walkableGrid: number[][] = []; // 2D array to store walkability data
    units: Unit[] = []; // Array to hold units on the scene.
    terrains: Terrain[] = []; // Array to hold terrain elements on the scene.
    actionPanelContainer: Phaser.GameObjects.Container | null = null; // Container for action buttons
    isActionComplete: boolean = true; // Property to track if action is complete
    // Debug mode properties
    debugModeEnabled: boolean = true; // Debug mode enabled by default
    debugElements: Phaser.GameObjects.GameObject[] = []; // Store all debug elements here
    debugToggleButton: Phaser.GameObjects.Text | null = null; // Button to toggle debug mode
    // Path animation properties
    private pathIndicators: Phaser.GameObjects.Graphics[] = [];
    private pathAnimationActive: boolean = false;
    private pathAnimationTween: Phaser.Tweens.Tween | null = null;
    // Targeting System
    isTargetingMode: boolean = false; // Whether we are currently in targeting mode
    logTargetingModeON: string = 'Targeting mode is already inbound !' // Text for debugging working Targeting Mode
    currentTarget: Unit | Terrain | null = null; // Currently selected target
    currentSkill: string | null = null; // Current skill being used
    popupTargetingInstance: PopupTargeting | null = null;
    // Initiative System
    initiativeQueue: Unit[] = []; // Priority queue for turn order
    currentUnitIndex: number = 0; // Tracks whose turn it is
    hasTurnStarted: boolean;
    round: number = 1; // Track the current round
    // Add a property to track valid movement tiles
    private validMovementTiles: Set<Tile> = new Set();
    // Move all your methods and implementation code here
    preload() {
        // Load Unit token assets
        this.load.pack("assets-tokens-pack", "assets/assets-tokens-pack.json");
        this.load.pack("asset-UI-pack", "assets/asset-UI-pack.json");
        this.load.pack("asset-SplashPortraits-pack", "assets/asset-SplashPortraits-pack.json");
        this.load.pack("asset-tileset-pack","assets/asset-tileset-pack.json");
        // Ensure portrait textures are loaded
    }

    create() {
        // Launch the CombatUI scene
        this.scene.launch('CombatUI');
        // Set CombatUI scene to be on top of CombatScene
        this.scene.bringToTop('CombatUI');
       // const mapLayout = this.scene.get('CS_Tutorial') as CS_Tutorial; // Terrain Layout Scene
       const mapLayout = this.scene.get('CS_Biome01_StraightRoad') as CS_Biome01_StraightRoad; // Terrain Layout Scene
        this.scene.launch(mapLayout);
        this.scene.sendToBack(mapLayout);

        // Wait for the map to be loaded before drawing the debug grid
        mapLayout.events.once('create', () => {
            console.log("Map layout scene created, tilemap should be available now");
        });

        // Add debug toggle button
        this.createDebugToggleButton();

        // Ensure CombatUI is fully created before proceeding
        this.scene.get('CombatUI').events.once('create', () => {
            // Declare variable for Token Assets
            const tokenManifest = this.cache.json.get("assets-tokens-pack");

            this.editorCreate();

            // Default Combat Scene Initialization
            // Calculate offsets to center the grid
            const screenWidth = this.sys.game.config.width as number; // Screen width (1280px)
            const screenHeight = this.sys.game.config.height as number; // Screen height (760px)
            const gridWidthPx = GVC.GRID_WIDTH * GVC.CELL_SIZE; // Total grid width in pixels
            const gridHeightPx = GVC.GRID_HEIGHT * GVC.CELL_SIZE; // Total grid height in pixels

            // const offsetX = (screenWidth - gridWidthPx) / 2; // Offset to center the grid horizontally
            // const offsetY = (screenHeight - gridHeightPx) / 2;
            const offsetX = 1.5 * GVC.CELL_SIZE;
            const offsetY = 64;

            // Generate the Tiled Battlefield
            for (let y = 0; y < GVC.GRID_HEIGHT; y++) {
                const row: Tile[] = [];
                for (let x = 0; x < GVC.GRID_WIDTH; x++) {
                    const tile = new Tile(this, offsetX + x * GVC.CELL_SIZE, offsetY + y * GVC.CELL_SIZE, GVC.CELL_SIZE, x, y).setOrigin(0);
                    tile.setDepth(0); // Set the Grid to Layer 0 (Background)
                    row.push(tile);
                }
                this.grid.push(row);
            }
            // Draw the grid lines
            this.drawGrid();
            
            // Add debug grid lines to show alignment if debug mode is enabled
            if (this.debugModeEnabled) {
                this.drawDebugAlignmentGrid();
            }

            this.placeTerrain(this);

            // Helper function to get the first letter of the attack element
            const getElementLetter = (element: AttackElement) => {
                switch (element) {
                    case AttackElement.NEUTRAL:
                        return 'N';
                    case AttackElement.FIRE:
                        return 'F';
                    case AttackElement.WATER:
                        return 'W';
                    case AttackElement.EARTH:
                        return 'E';
                    case AttackElement.LIFE:
                        return 'L';
                    case AttackElement.BALANCE:
                        return 'B';
                    case AttackElement.DEATH:
                        return 'D';
                    default:
                        return 'N';
                }
            };

            // Spawn units
            // FACTION 0: Blue Team
            const unit00Element = AttackElement.FIRE;
            const huntressTile = this.grid[4][2]; // Starting Position [Y][X]
            const huntress = new Unit(this /*scene*/, UnitTier.C , "Huntress" /*name*/, "Trapper" /*type (Character Class)*/, 'Ranged' /*Role*/, unit00Element /*Element*/, 2 /*hp*/, 2 /*maxHp*/, 5 /*dexterity*/,
                huntressTile /*Tile*/, 0 /*faction*/, `T_Huntress_${getElementLetter(unit00Element)}` /*spriteKey*/, `S_Huntress_${getElementLetter(unit00Element)}` /*splashArtKey*/, `P_Huntress_${getElementLetter(unit00Element)}` /*portraitKey*/);
            this.units.push(huntress);

            const unit01Element = AttackElement.WATER;
            const sniperTile = this.grid[3][1]; // Starting Position
            const sniper = new Unit(this /*scene*/, UnitTier.C , "Sniper" /*name*/, "Expert" /*type (Character Class)*/, 'Ranged' /*Role*/, unit01Element /*Element*/, 2 /*hp*/, 2 /*maxHp*/, 3 /*dexterity*/,
                sniperTile /*Tile*/, 0 /*faction*/, `T_Sniper_${getElementLetter(unit01Element)}` /*spriteKey*/, `S_Sniper_${getElementLetter(unit01Element)}` /*splashArtKey*/, `P_Sniper_${getElementLetter(unit01Element)}` /*portraitKey*/);
            this.units.push(sniper);

            const unit02Element = AttackElement.WATER;
            const lindaTile = this.grid[4][3]; // Starting Position
            const linda = new Unit(this /*scene*/, UnitTier.C ,"Linda of the South" /*name*/, "Defender" /*type (Character Class)*/,'Melee' /*Role*/, unit02Element /*Element*/, 3 /*hp*/, 3 /*maxHp*/, 1 /*dexterity*/,
                lindaTile /*Tile*/, 0 /*faction*/, `T_Linda_${getElementLetter(unit02Element)}` /*spriteKey*/, `S_Linda_${getElementLetter(unit02Element)}` /*splashArtKey*/, `P_Linda_${getElementLetter(unit02Element)}` /*portraitKey*/);
            this.units.push(linda);

            const unit03Element = AttackElement.EARTH;
            const tamerTile = this.grid[2][2]; // Starting Position
            const tamer = new Unit(this /*scene*/, UnitTier.C , "Tamer" /*name*/, "Healer" /*type (Character Class)*/,'Melee' /*Role*/, unit03Element /*Element*/, 1 /*hp*/, 1 /*maxHp*/, 2 /*dexterity*/,
                tamerTile /*Tile*/, 0 /*faction*/, `T_Tamer_${getElementLetter(unit03Element)}` /*spriteKey*/, `S_Tamer_${getElementLetter(unit03Element)}` /*splashArtKey*/, `P_Tamer_${getElementLetter(unit03Element)}` /*portraitKey*/);
            this.units.push(tamer);

            const unit04Element = AttackElement.EARTH;
            const aandheeTile = this.grid[1][1]; // Starting Position
            const aandhee = new Unit(this /*scene*/, UnitTier.C,  "Aandhee" /*name*/, "Warper" /*type (Character Class)*/,'Ranged' /*Role*/, unit04Element /*Element*/, 1 /*hp*/, 1 /*maxHp*/, 5 /*dexterity*/,
                aandheeTile /*Tile*/, 0 /*faction*/, `T_Aandhee_${getElementLetter(unit04Element)}` /*spriteKey*/, `S_Aandhee_${getElementLetter(unit04Element)}` /*splashArtKey*/, `P_Aandhee_${getElementLetter(unit04Element)}` /*portraitKey*/);
            this.units.push(aandhee);

            // FACTION 1: Red Team
            const unit10Element = AttackElement.EARTH;
            const penumbraTile = this.grid[2][6]; // Starting Position
            const penumbra = new Unit(this /*scene*/, UnitTier.C , "Penumbra" /*name*/, "Expert" /*type (Character Class)*/, 'Ranged' /*Role*/ , unit10Element /*Element*/, 1 /*hp*/, 2 /*maxHp*/, 3 /*dexterity*/,
                penumbraTile /*Tile*/, 1 /*faction*/, `T_Penumbra_${getElementLetter(unit10Element)}` /*spriteKey*/, `S_Penumbra_${getElementLetter(unit10Element)}` /*splashArtKey*/, `P_Penumbra_${getElementLetter(unit10Element)}` /*portraitKey*/);
            this.units.push(penumbra);

            const unit11Element = AttackElement.FIRE;
            const penumbra2Tile = this.grid[4][5]; // Starting Position
            const penumbra2 = new Unit(this /*scene*/, UnitTier.C , "Penumbra" /*name*/, "Expert" /*type (Character Class)*/, 'Ranged' /*Role*/ , unit11Element /*Element*/, 1 /*hp*/, 2 /*maxHp*/, 3 /*dexterity*/,
                penumbra2Tile /*Tile*/, 1 /*faction*/, `T_Penumbra_${getElementLetter(unit11Element)}` /*spriteKey*/, `S_Penumbra_${getElementLetter(unit11Element)}` /*splashArtKey*/, `P_Penumbra_${getElementLetter(unit11Element)}` /*portraitKey*/);
            this.units.push(penumbra2);

            const unit12Element = AttackElement.NEUTRAL;
            const potatoTile = this.grid[3][6]; // Starting Position
            const coachPotato = new Unit(this /*scene*/, UnitTier.C , "Coach Potato" /*name*/, "Trapper" /*type (Character Class)*/, 'Melee' /*Role*/, unit12Element /*Element*/, 2 /*hp*/, 2 /*maxHp*/, 5 /*dexterity*/,
                potatoTile /*Tile*/, 1 /*faction*/, `T_CoachPotato_${getElementLetter(unit12Element)}` /*spriteKey*/, `S_CoachPotato_${getElementLetter(unit12Element)}` /*splashArtKey*/, `P_CoachPotato_${getElementLetter(unit12Element)}` /*portraitKey*/);
            this.units.push(coachPotato);

            console.log("Units:", this.units);

            // Update health blocks after units are created
            this.units.forEach(unit => this.updateHealthBlocks(unit));

            // COMBAT START
            this.startBattle(); // Roll Initiative & Start the FIRST turn
        });
    }

    // Function which draws the grid on the screen.
    drawGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x000000, 0.5); // Black lines with 50% opacity
        const screenWidth = this.sys.game.config.width as number; // Screen width (1280px)
        const screenHeight = this.sys.game.config.height as number; // Screen height (760px)
        const gridWidthPx = GVC.GRID_WIDTH * GVC.CELL_SIZE; // Total grid width in pixels
        const gridHeightPx = GVC.GRID_HEIGHT * GVC.CELL_SIZE; // Total grid height in pixels

        //const offsetX = (screenWidth - gridWidthPx) / 2; // Offset to center the grid horizontally
        //const offsetY = (screenHeight - gridHeightPx) / 2;
        const offsetX = 1.5 * GVC.CELL_SIZE;
        const offsetY = 64;

        // Draw horizontal lines
        for (let y = 0; y <= GVC.GRID_HEIGHT; y++) {
            const posY = offsetY + y * GVC.CELL_SIZE;
            graphics.lineBetween(offsetX, posY, offsetX + gridWidthPx, posY);
        }

        // Draw vertical lines
        for (let x = 0; x <= GVC.GRID_WIDTH; x++) {
            const posX = offsetX + x * GVC.CELL_SIZE;
            graphics.lineBetween(posX, offsetY, posX, offsetY + gridHeightPx);
        }

        graphics.strokePath();
    }

    // Method to check if a unit is a valid target
    isValidTarget(attacker: Unit, target: Unit): boolean {
        // Healers are non-targetable if Patronage is active
        if (target.type === 'Healer') {
            const adjacentDefender = this.units.find(
                unit => unit.type === 'Defender' && this.isAdjacent(unit.position, target.position) && unit.faction === target.faction
            );
            if (adjacentDefender) {
                console.log(`${target.type} is protected by ${adjacentDefender.type} (Patronage).`);
                return false; // Healer is not a valid target
            }
        }

        // Additional conditions for valid targeting can be added here
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // USER INTERFACE
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Basic Interface Buttons
    createActionPanel(unit: Unit) {
        const panelX = 5; // X-position of the panel
        const panelY = 32; // Y-position of the panel
        const buttonSpacing = 50;

        console.log('Creating Action Panel at:', panelX, panelY);

        // Create the End Turn button
        const endTurnButton = this.add.text(panelX, panelY, 'End Turn', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000', // Black outline
            strokeThickness: 4, // Thickness of the outline  
        }).setDepth(2)
            .setInteractive()
            .on('pointerdown', () => {
                console.log('End Turn button clicked');
                this.leaveModeTargeting();
                this.isActionComplete = true;
                this.startNextTurn();
            });

        // Move Button
        const moveButton = this.add.text(panelX, panelY + buttonSpacing, 'Move', { 
            fontSize: '20px',
            color: '#ffffff', // White text
            stroke: '#092ee8', // Black outline
            strokeThickness: 4, // Thickness of the outline 
        })
            .setDepth(2)
            .setInteractive()
            .on('pointerdown', () => {
                const currentUnit = this.initiativeQueue[this.currentUnitIndex];
                if (currentUnit.movementPoints >= 1 && this.isTargetingMode === false)
                {
                    this.enterModeTargeting('Move');
                    this.popupTargetingInstance = new PopupTargeting(this, /*BUTTON TEXT*/ this.currentSkill, /*options []*/ null, /*onCancel*/ () => {
                        // On Cancel
                        this.leaveModeTargeting(); // Delete all of highlights & exit targeting mode; Re-highlight Current unit
                    }, /*option click*/ () => {}, () => {})

                    console.log('Move button clicked for:', currentUnit.name);
                    if (currentUnit.type === 'Expert' ){
                        this.highlightMovementRange(currentUnit, currentUnit.movementPoints)
                    }
                    else
                        this.highlightMovementRange(currentUnit, currentUnit.movementPoints)
                }
                else{
                    if (currentUnit.movementPoints <= 0)
                        console.log(currentUnit.name + ' has no movement points left to move !')
                    else
                        console.log(this.logTargetingModeON)
                }
            });

        // Bash Button
        const bashButtonText = unit.type === 'Defender' ? 'Pushing Bash' : (unit.type === 'Trapper' && unit.role === 'Ranged' ? 'Ranged Bash' : 'Bash');
        const bashButton = this.add.text(panelX, panelY + 2 * buttonSpacing, bashButtonText, { 
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#e80941', // Black outline
            strokeThickness: 4, // Thickness of the outline  	
        })
            .setInteractive()
            .on('pointerdown', () => {
                const currentUnit = this.initiativeQueue[this.currentUnitIndex];
                // Targeting Mode
                if (this.isTargetingMode === false) {
                    this.enterModeTargeting(bashButtonText);
                    this.popupTargetingInstance = new PopupTargeting(this, /*BUTTON TEXT*/ this.currentSkill, /*options []*/ null, /*onCancel*/ () => {
                        // On Cancel
                        this.leaveModeTargeting(); // Delete all of highlights & exit targeting mode; Re-highlight Current unit
                    }, () => {}, () => {});

                    // Defender's PUSHING Bash variant
                    if (currentUnit.type === "Defender") {
                        const validTargets = this.units.filter(target =>
                            this.isAdjacent(unit.position, target.position) && this.isValidTarget(unit, target)
                        );

                        const destructibleTerrain = this.terrains.filter(terrain =>
                            terrain.isDestructible && this.isAdjacent(unit.position, terrain.position)
                        );

                        [...validTargets, ...destructibleTerrain].forEach(target => {
                            target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET); // Highlight valid targets in red
                            target.sprite.setInteractive();
                            target.sprite.once('pointerdown', () => {
                                this.clearAllInteractivity(); // Clear all interactivity before executing action
                                unit.pushingBash(this, target);
                                this.leaveModeTargeting();
                                this.clearHighlights();
                                if (this.isActionComplete === true)
                                    this.startNextTurn();
                            });
                        });
                    }
                    // Trapper's MELEE/RANGED Bash variant
                    else if (currentUnit.type === 'Trapper') {
                        currentUnit.handleTrapperAttack(currentUnit);
                    }
                    // Generic Bash
                    else {
                        // Get adjacent units
                        const validUnits = this.units.filter(target =>
                            this.isAdjacent(currentUnit.position, target.position) && this.isValidTarget(unit, target)
                        );
                        // Get adjacent destructible terrain
                        const validTerrain = this.terrains.filter(terrain =>
                            terrain.isDestructible && this.isAdjacent(currentUnit.position, terrain.position)
                        );
                        // Combine all valid targets
                        const validTargets = [...validUnits, ...validTerrain];

                        if (validTargets.length === 0) {
                            console.log(`No valid targets for ${currentUnit.name}!`);
                            return;
                        }
                        // Highlight valid targets
                        validTargets.forEach(target => {
                            target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET); // Highlight in red
                            target.sprite.setInteractive();
                            target.sprite.once('pointerdown', () => {
                                this.clearAllInteractivity(); // Clear all interactivity before executing action
                                target.sprite.removeInteractive();
                                this.leaveModeTargeting();
                                currentUnit.bash(target, 1, currentUnit); // Perform the bash action
                                this.clearHighlights();
                                if (this.isActionComplete === true)
                                    this.startNextTurn();
                            });
                        });
                    }
                }
                else {
                    console.log(this.logTargetingModeON);
                }
            });

        ////////////////////////// CLASS-SPECIFIC ABILITIES //////////////////////////
        // DEFENDER - Fortify
        let fortifyButton;
        if (unit.type === 'Defender') {
            // Fortify button for Defender
            fortifyButton = this.add.text(panelX, panelY + 3 * buttonSpacing, 'Fortify', { 
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#e80941', // Black outline
                strokeThickness: 4, // Thickness of the outline  	
            })
                .setInteractive()
                .on('pointerdown', () => {
                    // Targeting Mode check
                    if (this.isTargetingMode === false){
                        const isQuizActive = true; // Placeholder: Check if quiz is active
                        const isUpgradeActive = false; // Placeholder: Check if upgrade is active
                        const isQuizCorrect = true; // Placeholder: Check if quiz answer is correct
                        unit.fortify(this, isQuizActive, isUpgradeActive, isQuizCorrect);
                        if (this.isActionComplete === true) //Check if action was completed correctly; ends turn on true.
                            this.startNextTurn(); // End turn after using Fortify
                    }
                    else {
                        console.log(this.logTargetingModeON);
                    }
                });
        }

        // EXPERT - Pull
        let pullButton;
        const currentUnit = this.initiativeQueue[this.currentUnitIndex];
        // Targeting Mode
        if (unit.type === 'Expert') {
            // Pull button for Expert
            pullButton = this.add.text(panelX, panelY + 3 * buttonSpacing, 'Pull', { 
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#e80941', // Black outline
                strokeThickness: 4, // Thickness of the outline  	
            })
                .setInteractive()
                .on('pointerdown', () => {
                    // Targeting Mode
                    if (this.isTargetingMode === false){
                        this.enterModeTargeting('Pull');
                        this.popupTargetingInstance = new PopupTargeting(this, /*BUTTON TEXT*/ this.currentSkill, /*options []*/ null, /*onCancel*/ () => {
                            // On Cancel
                            this.leaveModeTargeting(); // Delete all of highlights & exit targeting mode; Re-highlight Current unit
                        }, () => {}, () => {});

                        // Highlight adjacent units
                        const validUnits = this.units.filter(target =>
                            this.getTilesInRange(currentUnit.position.gridX, currentUnit.position.gridY, 3)
                                .filter(tile => tile !== currentUnit.position)
                                .includes(target.position)
                        );
                        // Highlight adjacent destructible terrain
                        const validTerrain = this.terrains.filter(target =>
                            target.isDestructible && this.getTilesInRange(currentUnit.position.gridX, currentUnit.position.gridY, 3)
                                .filter(tile => tile !== currentUnit.position)
                                .includes(target.position)
                        );
                        // Combine all valid targets
                        const validTargets = [...validUnits, ...validTerrain];

                        validTargets.forEach(target => {
                            target.sprite.setInteractive();
                            target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET); // Highlight in red
                            target.sprite.once('pointerdown', () => {
                                this.clearAllInteractivity(); // Clear all interactivity before executing action
                                const isQuizActive = true; // Placeholder: Check if quiz is active
                                const isUpgradeActive = false; // Placeholder: Check if upgrade is active
                                this.leaveModeTargeting();
                                currentUnit.pull(this, target, 3 /*range*/, isQuizActive, isUpgradeActive); // Perform pull action
                                this.clearHighlights();
                                if (this.isActionComplete === true)//Check if action was completed correctly; ends turn on true.
                                    this.startNextTurn(); // End turn after pull
                            });
                        });
                    }
                });
        }

        // HEALER - Heal
        let healButton;
        if (unit.type === 'Healer') {
            healButton = this.add.text(panelX, panelY + 3 * buttonSpacing, 'Heal', { 
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#e80941', // Black outline
                strokeThickness: 4, // Thickness of the outline  	
            })
                .setInteractive()
                .on('pointerdown', () => {
                    this.enterModeTargeting('Heal');
                    this.popupTargetingInstance = new PopupTargeting(this, /*BUTTON TEXT*/ this.currentSkill, /*options []*/ null, /*onCancel*/ () => {
                        // On Cancel
                        this.leaveModeTargeting(); // Delete all of highlights & exit targeting mode; Re-highlight Current unit
                    }, () => {}, () => {});
                    const validTargets = this.units.filter(target =>
                        target !== unit && this.isAdjacent(unit.position, target.position)
                    );

                    validTargets.forEach(target => {
                        target.sprite.setInteractive();
                        target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET); // Highlight in green
                        target.sprite.once('pointerdown', () => {
                            this.clearAllInteractivity(); // Clear all interactivity before executing action
                            this.leaveModeTargeting();
                            const isQuizActive = true; // Placeholder: Check if quiz is active
                            const isUpgradeActive = false; // Placeholder: Check if upgrade is active
                            const isQuizCorrect = true; // Placeholder: Check if quiz answer is correct	
                            unit.heal(this, target, isQuizActive, isUpgradeActive, isQuizCorrect);
                            this.clearHighlights();
                            if (this.isActionComplete === true) //Check if action was completed correctly; ends turn on true.	
                                this.startNextTurn();
                        });
                    });
                });
        }

        // TRAPPER - Disarm/Set Trap
        let setTrapButton;
        if (unit.type === 'Trapper') {
            // Set Trap button for Trapper
            setTrapButton = this.add.text(panelX, panelY + 3 * buttonSpacing, 'Disarm/Set Trap: ' + unit.remainingTraps, { 
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#e80941', // Black outline
                strokeThickness: 4, // Thickness of the outline  	
            })
                .setInteractive()
                .on('pointerdown', () => {
                    if (this.isTargetingMode === false && !this.popupTargetingInstance) {
                        const combatUI = this.scene.get('CombatUI') as CombatUI;
                        if (combatUI) {
                            const popup = combatUI.createPopupWindow('Choose one:', ['Disarm Trap', 'Set Trap'], (option) => {
                                // Only proceed if popup was created successfully
                                if (popup) {
                                    this.enterModeTargeting(option);
                                    this.popupTargetingInstance = combatUI.createPopupTargeting(this.currentSkill, null, () => {
                                        this.leaveModeTargeting();
                                    }, () => {});

                                    if (option === 'Set Trap') {
                                        console.log('Set Trap selected.');
                                        if (unit.remainingTraps > 0) {
                                            console.log('User has traps remaining.');
                                            const adjacentDefender = this.units.find(
                                                defender => defender.type === 'Defender' && this.isAdjacent(unit.position, defender.position) && unit.faction === defender.faction
                                            );
                                            const validTiles = this.getTilesInRange(unit.position.gridX, unit.position.gridY, 1).filter(
                                                tile => tile.isWalkable && !tile.isTrapped
                                            );
                                            if (adjacentDefender) {
                                                const defenderAdjacentTiles = this.getTilesInRange(adjacentDefender.position.gridX, adjacentDefender.position.gridY, 1).filter(
                                                    tile => tile.isWalkable && !tile.isTrapped
                                                );
                                                validTiles.push(...defenderAdjacentTiles);
                                            }

                                            validTiles.forEach(tile => {
                                                tile.setFillStyle(GVC.TILE_COLOR_TRAP).setAlpha(GVC.TILE_ALPHA_HIGHLIGHT); // Highlight valid tiles
                                                tile.setInteractive();
                                                tile.once('pointerdown', () => {
                                                    this.clearAllInteractivity(); // Clear all interactivity before executing action
                                                    this.leaveModeTargeting();
                                                    unit.setTrap(this /*scene*/, tile /*where*/, true /*isQuizActive*/, false /*isUpgradeActive*/, false /*isQuizCorrect*/);
                                                    this.clearHighlights();
                                                    if (unit.isActionComplete) {
                                                        this.startNextTurn(); // End turn after placing trap
                                                    }
                                                });
                                            });	
                                        }
                                        else {
                                            console.log('User has no traps remaining.');
                                            this.isActionComplete = false; // Prevent ending turn if no traps are available
                                        }
                                    } else if (option === 'Disarm Trap') {
                                        // Call the disarm trap method here
                                        console.log('Disarm Trap selected');
                                        const validTiles = this.getTilesInRange(unit.position.gridX, unit.position.gridY, 1).filter(
                                            tile => tile.isWalkable && tile.isTrapped
                                        );

                                        validTiles.forEach(tile => {
                                            tile.setFillStyle(GVC.TILE_COLOR_TRAP).setAlpha(GVC.TILE_ALPHA_HIGHLIGHT); // Highlight valid tiles
                                            tile.setInteractive();
                                            tile.once('pointerdown', () => {
                                                this.clearAllInteractivity(); // Clear all interactivity before executing action
                                                this.leaveModeTargeting();
                                                unit.disarmTrap(this /*scene*/, tile /*where*/);
                                                this.clearHighlights();
                                                if (unit.isActionComplete) {
                                                    this.startNextTurn(); // End turn after disarming trap
                                                }
                                            });
                                        });
                                    }
                                }
                            }, () => {
                                // onCancel
                                combatUI.clearPopupWindowStack(); // Clear the popup window stack
                            });
                        } else {
                            console.error('CombatUI scene not found.');
                        }
                    }
                    else
                        console.log(this.logTargetingModeON);
                });
        }
        ///////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////
        // Add buttons to the scene
        const buttons = [endTurnButton, moveButton, bashButton];
        const buttonNames = ['End Turn', 'Move', 'Bash'];
        if (fortifyButton) {
            buttons.push(fortifyButton);
            buttonNames.push('Fortify');
        }
        if (pullButton) {
            buttons.push(pullButton);
            buttonNames.push('Pull');
        }
        if (setTrapButton) {
            buttons.push(setTrapButton);
            buttonNames.push('Disarm/Set Trap');
        }
        if (healButton) {
            buttons.push(healButton);
            buttonNames.push('Heal');
        }
        this.actionPanelContainer = this.add.container(panelX, panelY, buttons).setDepth(2);

        console.log('Action Panel created for:', unit.name, 'and contains the following buttons:', buttonNames.join(', '));
    }

    ////////////////////// CLASS-SPECIFIC ACTION VARIANTS ////////////////////////
    handleTrapperAttack(unit: Unit) {
        const isRanged = unit.role === 'Ranged';
        const range = isRanged ? 3 : 1; // Set range based on role

        const validTargets = this.units.filter(target =>
            this.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                .filter(tile => tile !== unit.position)
                .includes(target.position)
        );

        validTargets.forEach(target => {
            target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET); // Highlight in red
            target.sprite.setInteractive();
            target.sprite.once('pointerdown', () => {
                this.clearAllInteractivity(); // Clear all interactivity before executing action
                this.leaveModeTargeting();
                unit.resolveTrapperAttack(unit, target, isRanged);
                this.clearHighlights();
                this.startNextTurn();
            });
        });
    }
    //////////////////////////////////////////////////////////////////////////////

    deleteActionPanel() {
        if (this.actionPanelContainer){
            this.actionPanelContainer.destroy();
            this.actionPanelContainer = null;
            console.log('Action Panel deleted');
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // TURN BASED SYSTEM
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Declare the current turn index
    //currentTurnIndex = 1;

    // Roll Initiative
    rollInitiative() {
        this.units.forEach(unit => {
            unit.initiative = Phaser.Math.Between(1, 10) + unit.dexterity;
            console.log(`${unit.name} | Initiative roll: ${unit.initiative - unit.dexterity} + ${unit.dexterity} = ${unit.initiative}`);
        });

        // Sort by initiative and dexterity
        this.initiativeQueue = [...this.units].sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative; // Higher initiative goes first
            } else if (b.dexterity !== a.dexterity) {
                console.log(`Initiative tie at score: ${a.initiative}! Dexterity contest | ${b.name}: ${b.dexterity} vs ${a.name}: ${a.dexterity}.`);
                if (a.dexterity > b.dexterity) {
                    console.log(`${a.name} goes before ${b.name}.`);
                } else {
                    console.log(`${b.name} goes before ${a.name}.`);
                }
                return b.dexterity - a.dexterity; // Higher dexterity goes first if initiative is tied
            } else {
                // Resolve remaining ties with d10 rolls
                console.log(`Double Initiative tie at score: ${a.initiative}! 1d10 dice roll contest | ${b.name} vs ${a.name}.`);
                let rollA, rollB;
                do {
                    rollA = Phaser.Math.Between(1, 10);
                    console.log(`${a.name} rolls ${rollA}.`);
                    rollB = Phaser.Math.Between(1, 10);
                    console.log(`${b.name} rolls ${rollB}.`);
                    if (rollA === rollB)
                        console.log('Reroll!');
                } while (rollA === rollB);
                if (rollA > rollB) {
                    console.log(`${a.name} goes before ${b.name}.`);
                } else {
                    console.log(`${b.name} goes before ${a.name}.`);
                }
                return rollB - rollA; // Higher d10 roll goes first
            }
        });

        console.log("Initiative Order:", this.initiativeQueue.map(u => `${u.name} (${u.initiative})`));
    }

    // Initiate Combat
    startBattle() {
        this.rollInitiative();
        this.currentUnitIndex = 0; // Ensure the first unit in the initiative queue starts
        this.startTurn();
        this.roundStart(); // Trigger round start event
    }
    // Advance Turns
    startNextTurn() {
        if (this.initiativeQueue.length === 0) return;

        this.clearHighlights();
        this.clearActiveUnitHighlight();
        this.clearAllInteractivity(); // Clear all interactivity from previous turn

        // Get the next current unit
        this.currentUnitIndex = (this.currentUnitIndex + 1) % this.initiativeQueue.length;
        const currentUnit = this.initiativeQueue[this.currentUnitIndex];
        console.log(`It's ${currentUnit.name}'s turn!`);
        // remove the current unit's UI buttons
        this.deleteActionPanel();
        // Check if the current unit is still alive
        if (currentUnit) {
            // Remove temporary health from the unit at the start of their turn
            currentUnit.removeTemporaryHealth();

            currentUnit.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_CURRENT); // Highlight active unit
            const previousUnit = this.initiativeQueue[(this.currentUnitIndex - 1 + this.initiativeQueue.length) % this.initiativeQueue.length];
            this.moveFactionIndicator(previousUnit, 0); // Move previous unit's indicator back to 0
        }

        // Check if a new round should start
        if (this.currentUnitIndex === 0) {
            this.roundEnd(); // Trigger round end event
            this.round++;
            this.roundStart(); // Trigger round start event
        }

        this.startTurn();
    }

    // Round start event
    roundStart() {
        console.log(`Round ${this.round} starts!`);
        this.updateRoundCounter();
        // Additional logic for round start can be added here
    }

    // Round end event
    roundEnd() {
        console.log(`Round ${this.round} ends!`);
        // Additional logic for round end can be added here
    }

    // Update the round counter in the UI
    updateRoundCounter() {
        const combatUI = this.scene.get('CombatUI') as CombatUI;
        if (combatUI && combatUI.scene.isActive()) {
            combatUI.events.emit('updateRoundCounter', this.round);
        }
    }

    // Initiating the start of the Turn
    startTurn() {
        this.clearHighlights(); // Clear highlights at the start of the turn
        this.clearActiveUnitHighlight();
        this.isTargetingMode = false;
        this.currentTarget = null;
        this.currentSkill = null;
        this.updateUI();

        // Create the Action Panel for the starting unit
        if (this.initiativeQueue.length > 0) {
            const currentUnit = this.initiativeQueue[this.currentUnitIndex];
            currentUnit.turn = this.round; // Update the unit's turn count
            this.createActionPanel(currentUnit);
            // Apply lava damage if the unit is standing in lava
            if (currentUnit.position.terrain?.type === TerrainType.LAVA) {
                console.log(`${currentUnit.name} takes 2 damage from standing in lava!`);
                currentUnit.takeDamage(this /*scene*/, 2 /*damage*/, currentUnit /*attacker*/, AttackType.TERRAIN, AttackElement.FIRE , false /*isUpgradeActive*/  );
                this.updateHealthBlocks(currentUnit);
                // Check if the unit is still alive after taking damage
                if (currentUnit.hp <= 0) {
                    this.removeUnit(currentUnit);
                    this.startNextTurn(); // Move to the next turn if the unit dies
                    return;
                }
            }
            currentUnit.gainMovementPoints();
            currentUnit.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_CURRENT); // Highlight active unit
            console.log(`Starting turn ${currentUnit.turn} for ${currentUnit.name}`);
            this.moveFactionIndicator(currentUnit, -45); // Move current unit's indicator to -45
        }
    }

    // Update the Initiative Ladder UI
    updateUI(){
        const combatUI = this.scene.get('CombatUI') as CombatUI;
        if (combatUI && combatUI.scene.isActive()) {
            combatUI.events.emit('updateInitiative', this.initiativeQueue.map(unit => ({
                name: unit.name,
                initiative: unit.initiative,
                portraitKey: unit.portrait ? unit.portrait.texture.key : unit.sprite.texture.key, // Ensure portrait is used if available
                faction: unit.faction, // Ensure faction is passed
                element: unit.element // Ensure element is passed
            })), this.currentUnitIndex);
        }
    }

    // Remove Units from the Initiative Tracker
    /*removeUnit(unit: Unit) {
        // Make the tile walkable before removing the unit (unless it's a hazard)
        if (unit.position && !unit.position.isHazard) {
            unit.position.isWalkable = true;
            unit.position.unit = null;  // Clear the unit reference
        }
        this.units = this.units.filter(u => u !== unit);
        this.initiativeQueue = this.initiativeQueue.filter(u => u !== unit);
        console.log(`${unit.name} has been removed from the units array and initiative queue.`);
        unit.sprite.destroy();
        unit.targetingHoverSprite.destroy();
        this.clearHighlights();
        this.clearAllInteractivity();
        this.updateUI();
    }*/
        removeUnit(unit: Unit) {
            if (unit.position) {
                const tile = unit.position;
                console.log('DETAILED Tile state in removeUnit:', {
                    gridPos: `(${tile.gridX}, ${tile.gridY})`,
                    isWalkable: tile.isWalkable,
                    hasUnit: tile.unit !== null,
                    unitRef: tile.unit ? tile.unit.name : 'null',
                    hasTerrain: tile.terrain !== null,
                    terrainType: tile.terrain?.type ?? 'none',
                    isHazard: tile.isHazard,
                    parent: Object.getPrototypeOf(tile).constructor.name
                });

                // Reset tile state using the new method
                tile.resetTileState();

                console.log('DETAILED Tile state AFTER changes:', {
                    gridPos: `(${tile.gridX}, ${tile.gridY})`,
                    isWalkable: tile.isWalkable,
                    hasUnit: tile.unit !== null,
                    hasTerrain: tile.terrain !== null,
                    terrainType: tile.terrain?.type ?? 'none',
                    isHazard: tile.isHazard,
                    parent: Object.getPrototypeOf(tile).constructor.name
                });

                // Complete the unit removal process
                this.units = this.units.filter(u => u !== unit);
                this.initiativeQueue = this.initiativeQueue.filter(u => u !== unit);
                unit.sprite.destroy();
                unit.targetingHoverSprite.destroy();
                if (unit.healthContainer) {
                    unit.healthContainer.destroy();
                }
                if (unit.container) {
                    unit.container.destroy();
                }
                this.clearHighlights();
                this.clearAllInteractivity();
                this.updateUI();
            }
        }

    // Clear all interactivity from previous turn
    clearAllInteractivity() {
        this.units.forEach(unit => {
            if (unit.sprite.input) {
                unit.sprite.removeAllListeners();
                unit.sprite.disableInteractive();
            }
            unit.targetingHoverSprite.setVisible(false);
        });
        this.terrains.forEach(terrain => {
            if (terrain.sprite && terrain.sprite.input) {
                terrain.sprite.removeAllListeners();
                terrain.sprite.disableInteractive();
            }
            // Just hide the sprite instead of destroying it
            terrain.targetingHoverSprite.setVisible(false);
        });
        this.grid.forEach(row => {
            row.forEach(tile => {
                tile.removeTargetingListeners(); // Use the new method to remove targeting listeners
            });
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    // HEALTH BLOCKS LOGIC
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Health Blocks CORE
    updateHealthBlocks(unit: Unit) {
        if (unit.healthContainer) {
            // Clear existing health blocks
            unit.healthContainer.removeAll(true);

            const blockSize = 10;
            const blockSpacing = 30;

            // Create base health blocks
            const totalWidth = unit.hp * blockSize + (unit.hp - 1) * blockSpacing;
            const startX = -totalWidth / 2 + blockSize / 2;

            // Add base health blocks with higher depth
            for (let i = 0; i < unit.hp; i++) {
                // Black border with higher depth
                const border = this.add.rectangle(
                    startX + i * (blockSize + blockSpacing),
                    0,
                    (blockSize * 3) * 1.2,
                    (blockSize) * 1.4,
                    0x080808
                ).setDepth(1); // Relative to healthContainer
                
                // Red health block with higher depth
                const block = this.add.rectangle(
                    startX + i * (blockSize + blockSpacing),
                    0,
                    blockSize * 3,
                    blockSize,
                    0xff0000
                ).setDepth(1); // Relative to healthContainer

                unit.healthContainer.add([border, block]);
            }

            // Add temporary health blocks if any
            if (unit.tempHp > 0) {
                const blockSizeTEMP = 12;
                const totalWidthTEMP = unit.tempHp * blockSizeTEMP + (unit.tempHp - 1) * blockSpacing;
                const startXTEMP = -totalWidthTEMP / 2 + blockSizeTEMP / 2;

                for (let i = 0; i < unit.tempHp; i++) {
                    // Black border
                    const border = this.add.rectangle(
                        startXTEMP + i * (blockSizeTEMP + blockSpacing),
                        0,
                        (blockSizeTEMP * 3) * 1.2,
                        (blockSizeTEMP) * 1.4,
                        0x080808
                    );

                    // Cyan temp health block
                    const block = this.add.rectangle(
                        startXTEMP + i * (blockSizeTEMP + blockSpacing),
                        0,
                        blockSizeTEMP * 3,
                        blockSize,
                        0x63f7ed
                    ).setAlpha(0.55);

                    unit.healthContainer.add([border, block]);
                }
            }
        }
    }

    // TEMPORARY HEALTH EXECUTION
    grantTemporaryHealthToUnit(unit: Unit, amount: number) {
        unit.grantTemporaryHealth(amount);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // MOVEMENT SYSTEM
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Method for moving a unit to a specific tile

    moveUnitToTile(unit: Unit, tile: Tile) {
        console.log(`Attempting to move ${unit.name} from (${unit.position.gridX},${unit.position.gridY}) to (${tile.gridX},${tile.gridY})`);
    
        // Clear any path indicators before starting movement
        this.clearPathIndicators();
        this.validMovementTiles.clear(); // Clear valid movement tiles
        
        // Validate that the target tile is walkable
        if (!this.canMoveTo(tile.gridX, tile.gridY)) {
            console.warn(`Target tile (${tile.gridX},${tile.gridY}) is not walkable!`);
            return;
        }
        
        // Find a path to the tile
        const path = this.calculatePath(unit.position, tile);
        console.log(`Path length: ${path.length}, path:`, path.map(t => `(${t.gridX},${t.gridY})`));
        
        if (path.length <= 1) {
            console.warn("No valid path found!");
            return;
        }
        
        let totalCost = 0;
        // Calculate total cost first
        for (let i = 1; i < path.length; i++) {
            const current = path[i - 1];
            const next = path[i];
            const dx = Math.abs(next.gridX - current.gridX);
            const dy = Math.abs(next.gridY - current.gridY);
            const isDiagonal = dx === 1 && dy === 1;
            let cost = isDiagonal ? 2 : 1;
            if (unit.type === 'Expert' && isDiagonal) cost = 1;
            if (next.terrain?.type === TerrainType.MUD) cost *= 2; // Consider terrain in cost calculation

            totalCost += cost;
        }

        if (unit.movementPoints < totalCost) {
            console.log(`${unit.name} does not have enough movement points to move to (${tile.gridX}, ${tile.gridY}).`);
            return;
        }

        // Spend movement points before starting movement
        unit.spendMovementPoints(totalCost);

        // Clear any path indicators
        this.clearPathIndicators();

        // Move along the path with sequential animations
        let currentIndex = 0;
        const moveNext = () => {
            if (currentIndex >= path.length - 1) {
                // Movement complete
                // Final tile's trap is already handled by the original code

                // Handle terrain effects
                if (tile.terrain?.type === TerrainType.PIT) {
                    console.log(`${unit.name} falls into a pit and is removed from the battlefield!`);
                    this.removeUnit(unit);
                    this.startNextTurn();
                    return;
                }

                // Update health blocks after unit moves
                this.units.forEach(unit => this.updateHealthBlocks(unit));
                this.clearHighlights();
                // Re-highlight new tiles if the unit still has movement points left
                if (unit.movementPoints > 0) {
                    this.highlightMovementRange(unit, unit.movementPoints);
                } else {
                    console.log('RAN OUT OF MOVEMENT POINTS');
                    this.leaveModeTargeting();
                }
                return;
            }

            currentIndex++;
            const nextTile = path[currentIndex];
            
            // Check for traps before moving to the tile
            if (nextTile.isTrapped) {
                console.log(`${unit.name} triggers a trap at (${nextTile.gridX}, ${nextTile.gridY}) while moving through!`);
                nextTile.triggerTrap(unit);
                // If unit died from trap, end movement
                if (unit.hp <= 0) {
                    this.removeUnit(unit);
                    this.startNextTurn();
                    return;
                }
            }

            unit.moveTo(nextTile);

            // Schedule the next movement
            this.time.delayedCall(250, moveNext); // 250ms delay between each tile movement
        };

        // Start the movement sequence
        moveNext();
    }

    calculatePath(startTile: Tile, endTile: Tile): Tile[] {
        // If start and end are the same, return just the start tile
        if (startTile === endTile) {
            return [startTile];
        }

        // Initialize data structures for A* search
        const openSet: Tile[] = [startTile];
        const closedSet = new Set<Tile>();

        // Map to store the best parent tile for each tile
        const cameFrom = new Map<Tile, Tile>();
        
        // Cost from start along best known path
        const gScore = new Map<Tile, number>();
        gScore.set(startTile, 0);

        // Estimated total cost from start to goal through this tile
        const fScore = new Map<Tile, number>();
        fScore.set(startTile, this.heuristicCost(startTile, endTile));

        while (openSet.length > 0) {
            // Get the tile with the lowest fScore
            let current = openSet[0];
            let lowestIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                const tentativeScore = fScore.get(openSet[i]) || Infinity;
                if (tentativeScore < (fScore.get(current) || Infinity)) {
                    current = openSet[i];
                    lowestIndex = i;
                }
            }

            // If we've reached the goal, reconstruct the path
            if (current === endTile) {
                return this.reconstructPath(cameFrom, current);
            }

            // Remove current from openSet and add to closedSet
            openSet.splice(lowestIndex, 1);
            closedSet.add(current);

            // Check all neighbors
            const neighbors = this.getTileNeighbors(current);
            for (const neighbor of neighbors) {
                // Skip if this neighbor has already been processed
                if (closedSet.has(neighbor)) {
                    continue;
                }

                // Skip if this neighbor is not walkable or is trapped, unless it's the goal tile
                if ((!this.canMoveTo(neighbor.gridX, neighbor.gridY) || neighbor.isTrapped) && neighbor !== endTile) {
                    continue;
                }

                // Calculate movement cost for this neighbor
                const dx = Math.abs(neighbor.gridX - current.gridX);
                const dy = Math.abs(neighbor.gridY - current.gridY);
                const isDiagonal = dx === 1 && dy === 1;
                
                // Determine movement cost based on tile type and unit abilities
                let moveCost = isDiagonal ? 2 : 1;
                
                // Add extremely high cost for trapped tiles to make them avoided unless necessary
                if (neighbor.isTrapped && neighbor !== endTile) {
                    moveCost += 1000; // Make traps very costly to go through
                }

                // Calculate tentative gScore
                const tentativeGScore = (gScore.get(current) || 0) + moveCost;
                
                // If we haven't visited this neighbor yet, add it to open set
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } 
                // Skip if we've found a worse path
                else if (tentativeGScore >= (gScore.get(neighbor) || Infinity)) {
                    continue;
                }

                // This path is the best until now, record it
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + this.heuristicCost(neighbor, endTile));
            }
        }

        // If we get here, no path was found
        console.warn(`No path found from (${startTile.gridX},${startTile.gridY}) to (${endTile.gridX},${endTile.gridY})`);
        return [startTile]; // Return just the start tile if no path
    }

    // Helper method for A* pathfinding
    reconstructPath(cameFrom: Map<Tile, Tile>, current: Tile): Tile[] {
        const totalPath = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current)!;
            totalPath.unshift(current);
        }
        return totalPath;
    }

    // Heuristic cost estimate for A* pathfinding
    heuristicCost(tile: Tile, goal: Tile): number {
        // Using Manhattan distance as heuristic
        return Math.abs(tile.gridX - goal.gridX) + Math.abs(tile.gridY - goal.gridY);
    }

    processWalkability(map: Phaser.Tilemaps.Tilemap, objectLayer: Phaser.Tilemaps.TilemapLayer, groundLayer: Phaser.Tilemaps.TilemapLayer) {
        this.walkableGrid = []; // Create a 2D array for walkability
    
        console.log("Processing walkability for map:", map.width, "x", map.height);

        // Calculate the offset between tilemap coordinates and combat grid coordinates
        const tilemapOffsetX = -58; // From tilemap position
        const tilemapOffsetY = -23;
        const gridOffsetX = 1.5 * GVC.CELL_SIZE; // From combat grid position
        const gridOffsetY = 64;

        // Pre-initialize the walkable grid with default walkable values (1)
        for (let y = 0; y < GVC.GRID_HEIGHT; y++) {
            this.walkableGrid[y] = [];
            for (let x = 0; x < GVC.GRID_WIDTH; x++) {
                this.walkableGrid[y][x] = 1; // Default to walkable
            }
        }

        // Now map the tilemap walkability to our combat grid
        for (let y = 0; y < GVC.GRID_HEIGHT; y++) {
            for (let x = 0; x < GVC.GRID_WIDTH; x++) {
                // Convert combat grid coordinates to pixel coordinates
                const pixelX = gridOffsetX + x * GVC.CELL_SIZE + (GVC.CELL_SIZE / 2);
                const pixelY = gridOffsetY + y * GVC.CELL_SIZE + (GVC.CELL_SIZE / 2);
                
                // Convert pixel coordinates to tilemap coordinates
                const tilemapX = Math.floor((pixelX - tilemapOffsetX) / map.tileWidth);
                const tilemapY = Math.floor((pixelY - tilemapOffsetY) / map.tileHeight);
                
                // Check if these coordinates are valid within the tilemap
                if (tilemapX >= 0 && tilemapX < map.width && tilemapY >= 0 && tilemapY < map.height) {
                    // Get tiles from both layers at the calculated tilemap position
                    const groundTile = groundLayer.getTileAt(tilemapX, tilemapY);
                    const objectTile = objectLayer.getTileAt(tilemapX, tilemapY);
                    
                    // Get walkability properties
                    const groundWalkable = groundTile?.properties?.isWalkable ?? 1;
                    const objectWalkable = objectTile?.properties?.isWalkable ?? 1;
                    
                    // A tile is only walkable if both layers allow it
                    // If an object layer tile exists, it takes priority
                    if (objectTile) {
                        this.walkableGrid[y][x] = objectWalkable;
                    } else {
                        this.walkableGrid[y][x] = groundWalkable;
                    }
                    
                    // Debug the mapping
                    console.log(`Grid (${x},${y}) maps to tilemap (${tilemapX},${tilemapY}) - walkable: ${this.walkableGrid[y][x]}`);
                }
            }
        }

        console.log("Walkability grid generated:", this.walkableGrid);
    }
    
    canMoveTo(x: number, y: number): boolean {
        // Check basic bounds
        if (y < 0 || y >= this.walkableGrid.length || x < 0 || x >= this.grid[0].length) {
            return false;
        }

        // More detailed check for walkability with debug info
        const tilemap = this.walkableGrid[y][x] === 1;
        const runtime = this.grid[y][x].isWalkable;

        // Debug for the specific problematic tiles
        if (this.debugModeEnabled && 
            ((x === 5 && (y === 0 || y === 1)) || (x === 6 && y === 0) || (x === 7 && y === 0))) {
            console.log(`canMoveTo(${x},${y}): tilemap=${tilemap}, runtime=${runtime}, result=${tilemap && runtime}`);
        }

        // Both conditions must be true for the tile to be walkable
        return tilemap && runtime;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // ACTION SYSTEM
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Definition - Being ADJACENT
    // Being adjacent means within 1 tile of each other, which naturally excludes diagonal,
    // because they are considered to be 2 tiles away.
    isAdjacent(tile1: Tile, tile2: Tile): boolean {
        const dx = Math.abs(tile1.gridX - tile2.gridX);
        const dy = Math.abs(tile1.gridY - tile2.gridY); // Restore the correct calculation
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1); // Exclude diagonals
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // HIGHLIGHTING SYSTEM
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // HIGHLIGHTING SYSTEM
    // Function to get tiles in range
    getTilesInRange(x: number, y: number, range: number): Tile[] {
        const tiles: Tile[] = [];
        for (const row of this.grid) {
            for (const tile of row) {
                const dx = Math.abs(tile.gridX - x); // Horizontal distance
                const dy = Math.abs(tile.gridY - y); // Vertical distance
                const diagonalSteps = Math.min(dx, dy); // Diagonal steps
                const straightSteps = Math.abs(dx - dy); // Remaining horizontal/vertical steps
                const distance = 2 * diagonalSteps + straightSteps; // Adjusted distance
                if (distance <= range) {
                    tiles.push(tile);
                }
            }
        }
        return tiles;
    }

    // Method for clearing highlights (used below in highlightMovementRange method)
    clearHighlights() {
        this.grid.forEach(row => {
            row.forEach(tile => {
                tile.setFillStyle(GVC.TILE_COLOR_DEFAULT).setAlpha(GVC.TILE_ALPHA_DEFAULT); // Reset to default fill style
                if (tile.hoverSprite) {
                    tile.hoverSprite.setVisible(false); // Set hover sprite to invisible
                }
                tile.off('pointerdown'); // Remove old event listeners
            });
        });
    }

    highlightMovementRange(unit: Unit, maxRange: number) {
        this.clearHighlights(); // Clear previous highlights
        this.clearPathIndicators(); // Clear any existing path animations
        this.validMovementTiles.clear(); // Reset the valid movement tiles set
        
        // Set of tiles that have been visited
        const visited = new Set<string>();
        
        // Queue of tiles to process, with their remaining movement points
        const queue: { tile: Tile; remainingPoints: number }[] = [
            { tile: unit.position, remainingPoints: unit.movementPoints }
        ];

        // Process tiles until queue is empty
        while (queue.length > 0) {
            const { tile, remainingPoints } = queue.shift()!;
            // Skip if we've already visited this tile with equal or more movement points
            const key = `${tile.gridX},${tile.gridY}`;
            if (visited.has(key)) continue;
            // Mark as visited
            visited.add(key);
            
            // Highlight this tile if it's not the starting position and is walkable
            if (tile !== unit.position && this.canMoveTo(tile.gridX, tile.gridY)) {
                console.log(`Highlighting tile (${tile.gridX},${tile.gridY}) with ${remainingPoints} points left`);
                
                tile.setFillStyle(tile.isTrapped ? GVC.TILE_COLOR_TRAP : GVC.TILE_COLOR_HIGHLIGHT_OK)
                    .setAlpha(GVC.TILE_ALPHA_HIGHLIGHT);
                
                // Add this tile to our valid movement tiles set
                this.validMovementTiles.add(tile);
                
                // Make tile interactive for movement with path previewing
                tile.setInteractive();
                tile.on('pointerdown', () => {
                    console.log(`Moving to tile (${tile.gridX},${tile.gridY})`);
                    this.clearPathIndicators(); // Clear path indicators before moving
                    this.moveUnitToTile(unit, tile);
                });
                
                // Add hover events for path preview (only when in movement targeting mode)
                tile.on('pointerover', () => {
                    // Only show path indicators in movement targeting mode
                    if (this.isTargetingMode && this.currentSkill === 'Move') {
                        const path = this.calculatePath(unit.position, tile);
                        this.showPathIndicator(path);
                    }
                });
                
                tile.on('pointerout', () => {
                    this.clearPathIndicators();
                });
            }
            
            // Special case for castling with Defender class
            if (unit.type === 'Defender') {
                // Check all neighboring tiles that might have units for castling
                const neighbors = this.getTileNeighbors(unit.position);
                
                neighbors.forEach(neighborTile => {
                    // Store the unit reference when setting up the event
                    const targetUnit = neighborTile.unit;
                    
                    // For Defender's Castling ability: find adjacent units to swap with
                    if (targetUnit && 
                        targetUnit !== unit && 
                        neighborTile.terrain === null &&
                        this.isAdjacent(unit.position, neighborTile)) {
                        
                        neighborTile.setFillStyle(GVC.TILE_COLOR_HIGHLIGHT_CASTLING).setAlpha(GVC.TILE_ALPHA_HIGHLIGHT);
                        neighborTile.setInteractive();
                        
                        // Use the stored reference and check if it's still there
                        neighborTile.on('pointerdown', () => {
                            // Clear path indicators before castling to prevent memory leaks
                            this.clearPathIndicators();
                            
                            // Re-check that the unit is still on this tile
                            if (neighborTile.unit && neighborTile.unit === targetUnit) {
                                this.castling(unit, targetUnit);
                            } else {
                                console.warn('Cannot castle: Target unit no longer on this tile');
                            }
                        });
                    }
                });
            }

            // Explore neighboring tiles if there are movement points left
            if (remainingPoints > 0) {
                // Get neighboring tiles
                const neighbors = this.getTileNeighbors(tile);
                for (const neighbor of neighbors) {
                    // Calculate movement cost
                    const dx = Math.abs(neighbor.gridX - tile.gridX);
                    const dy = Math.abs(neighbor.gridY - tile.gridY);
                    const isDiagonal = dx === 1 && dy === 1;
                    let cost = isDiagonal ? 2 : 1;
                    if (unit.type === 'Expert' && isDiagonal) cost = 1; // Experts move diagonally at normal cost
                    if (neighbor.terrain?.type === TerrainType.MUD) cost *= 2; // Mud doubles movement cost
                    
                    // Skip if we don't have enough movement points
                    if (remainingPoints < cost) continue;

                    // For exploration, we might check tiles that aren't walkable
                    // but we won't actually move to them
                    const isWalkable = this.canMoveTo(neighbor.gridX, neighbor.gridY);
                    const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;
                    
                    // Only queue walkable neighbors we haven't visited yet
                    if (isWalkable && !visited.has(neighborKey)) {
                        queue.push({ 
                            tile: neighbor, 
                            remainingPoints: remainingPoints - cost 
                        });
                    }
                }
            }
        }
        
        // Debug the walkability of the problem tiles
        console.log("Checking walkability of problem tiles:");
        const checkTile = (x: number, y: number) => {
            if (x < 0 || x >= GVC.GRID_WIDTH || y < 0 || y >= GVC.GRID_HEIGHT) {
                console.log(`Tile (${x},${y}) is out of bounds`);
                return;
            }
            const walkable = this.canMoveTo(x, y);
            const tile = this.grid[y][x];
            const runtimeWalkable = tile.isWalkable;
            const walkableInGrid = this.walkableGrid[y][x] === 1;
            console.log(`Tile (${x},${y}): walkable=${walkable}, walkableInGrid=${walkableInGrid}, runtimeWalkable=${runtimeWalkable}`);
            // If it's not walkable but should be, highlight it differently for debugging
            if (!walkable && walkableInGrid && runtimeWalkable) {
                tile.setFillStyle(0xffff00).setAlpha(0.5); // Yellow for oddly unwalkable tiles
            }
        };

        // Check the problem tiles
        checkTile(5, 0);
        checkTile(5, 1);
        checkTile(6, 0);
        checkTile(7, 0);
    }

    enterModeTargeting(currentSkill: string){
        // Clear path indicators when entering a new targeting mode
        this.clearPathIndicators();
        // If we're switching from Move to another mode, clear the valid tiles
        if (this.currentSkill === 'Move' && currentSkill !== 'Move') {
            this.validMovementTiles.clear();
        }
        this.isTargetingMode = true;
        this.currentSkill = currentSkill;
    }

    leaveModeTargeting(){
        this.clearHighlights();
        this.clearActiveUnitHighlight();
        this.clearPathIndicators(); // Ensure we clear all path indicators
        this.validMovementTiles.clear(); // Clear valid movement tiles
        
        if (this.popupTargetingInstance !== null) {
            this.popupTargetingInstance.destroy(); // Destroy existing popup if any
            this.popupTargetingInstance = null; // Clear the reference
        }
        this.isTargetingMode = false;
        this.currentSkill = null;
        // Re-Highlight Active Unit
        this.highlightCurrentUnit();
        this.units.forEach(unit => {
            unit.targetingHoverSprite.setVisible(false); // Hide targeting hover sprite
        });
        this.terrains.forEach(terrain => {
            terrain.targetingHoverSprite.setVisible(false); // Hide targeting hover sprite
        });
    }

    highlightTargets(unit: Unit, range: number, isTargetSelf: boolean, onTargetSelected: (target: Unit | Terrain) => void) {
        this.clearHighlights();

        // Get valid units
        let validUnits = this.units.filter(target =>
            this.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                .filter(tile => tile !== unit.position)
                .includes(target.position) && this.isValidTarget(unit, target));
        if (isTargetSelf === true) {
            validUnits = this.units.filter(target =>
                this.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                    .includes(target.position) && this.isValidTarget(unit, target));
        }

        // Get valid terrain
        const validTerrain = this.terrains.filter(target =>
            target.isDestructible && this.getTilesInRange(unit.position.gridX, unit.position.gridY, 3)
                .filter(tile => tile !== unit.position)
                .includes(target.position)
        );
        const validTargets = [...validUnits, ...validTerrain];

        validTargets.forEach(target => {
            target.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_TARGET);
            target.sprite.setInteractive();

            // Set up hover events that persist
            target.sprite.on('pointerover', () => target.onTargetHover());
            target.sprite.on('pointerout', () => target.onTargetHoverOut());

            // Set up click event
            target.sprite.on('pointerdown', () => {
                console.log(`${unit.type} targets ${target instanceof Unit ? target.type : target.name}.`);
                this.currentTarget = target;
                onTargetSelected(target);
            });
        });
    }

    highlightCurrentUnit (){
        const currentUnit = this.initiativeQueue[this.currentUnitIndex];
        if (currentUnit) {
            currentUnit.sprite.setTint(GVC.UNIT_COLOR_HIGHLIGHT_CURRENT); // Highlight active unit
        }
    }	

    getTileNeighbors(tile: Tile): Tile[] {
        const neighbors: Tile[] = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 },  // Right
            { x: -1, y: -1 }, // Top-left diagonal
            { x: 1, y: -1 },  // Top-right diagonal
            { x: -1, y: 1 },  // Bottom-left diagonal
            { x: 1, y: 1 }   // Bottom-right diagonal
        ];

        directions.forEach(dir => {
            const neighborX = tile.gridX + dir.x;
            const neighborY = tile.gridY + dir.y;
            if (this.grid[neighborY]?.[neighborX]) {
                neighbors.push(this.grid[neighborY][neighborX]);
            }
        });

        return neighbors;
    }

    castling(defender: Unit, target: Unit) {
        // Validate both units and their positions
        if (!target || !defender) {
            console.error('Castling failed: One of the units is null');
            return;
        }
        
        if (!defender.position || !target.position) {
            console.error(`Castling failed: ${!defender.position ? 'Defender' : 'Target'} position is null`);
            return;
        }

        if (!this.isAdjacent(defender.position, target.position)) {
            console.log(`Castling failed: ${target.name} is not adjacent to ${defender.name}.`);
            return;
        }

        // Clear any path indicators and stop animations to prevent memory leaks
        this.clearPathIndicators();

        // Swap positions
        const defenderTile = defender.position;
        const targetTile = target.position;

        // Proceed with existing castling logic
        defender.moveTo(targetTile);
        target.moveTo(defenderTile);
        targetTile.isWalkable = false;
        this.updateHealthBlocks(target);
        this.updateHealthBlocks(defender);

        // Reduce movement points for castling
        defender.spendMovementPoints(1);

        console.log(`${defender.name} Castles with ${target.name}.`);
        this.clearHighlights();

        // Check if unit has movement points left
        if (defender.movementPoints <= 0) {
            console.log('RAN OUT OF MOVEMENT POINTS');
            this.leaveModeTargeting();
        } else {
            this.highlightMovementRange(defender, defender.movementPoints);
        }
    }

    clearActiveUnitHighlight() {
        this.units.forEach(unit => {
            unit.sprite.clearTint();
            if (unit.sprite.input) {
                unit.sprite.removeInteractive();
            }
        });
        this.terrains.forEach(terrain => {
            terrain.sprite.clearTint();
            if (terrain.sprite.input) {
                terrain.sprite.removeInteractive();
            }
        });
    }

    moveFactionIndicator(unit: Unit, y: number) {
        const combatUI = this.scene.get('CombatUI') as CombatUI;
        if (combatUI && combatUI.scene.isActive()) {
            combatUI.events.emit('moveFactionIndicator', unit, y);
        }
    }

    // Add methods for path animation
    showPathIndicator(path: Tile[]) {
        // Clear any existing path indicators
        this.clearPathIndicators();
        
        if (path.length <= 1) return; // No path to show
        
        // First, calculate the total movement cost of this path
        const currentUnit = this.initiativeQueue[this.currentUnitIndex];
        let totalCost = 0;
        let validPathEndIndex = path.length - 1;
        
        // Calculate costs for each step and determine the last valid tile in the path
        for (let i = 1; i < path.length; i++) {
            const current = path[i - 1];
            const next = path[i];
            const dx = Math.abs(next.gridX - current.gridX);
            const dy = Math.abs(next.gridY - current.gridY);
            const isDiagonal = dx === 1 && dy === 1;
            let stepCost = isDiagonal ? 2 : 1;
            if (currentUnit.type === 'Expert' && isDiagonal) stepCost = 1;
            if (next.terrain?.type === TerrainType.MUD) stepCost += 1;
            
            totalCost += stepCost;
            
            // Check if we've exceeded available movement points
            if (totalCost > currentUnit.movementPoints) {
                validPathEndIndex = i - 1; // Last valid tile
                break;
            }
        }
        
        // Now only show indicators up to the valid end tile
        for (let i = 1; i <= validPathEndIndex; i++) {
            const tile = path[i];
            
            // Extra validation: only show indicators for tiles in the valid movement set
            if (!this.validMovementTiles.has(tile) && i < path.length - 1) {
                continue;
            }
            
            // Create a graphics object for the indicator
            const indicator = this.add.graphics();
            
            // Square indicators (116x116px)
            indicator.fillStyle(0xffffff, 0.7);
            indicator.fillRect(
                tile.x, 
                tile.y, 
                116, 
                116
            );
            
            indicator.setAlpha(0.125);
            indicator.setDepth(5);
            
            // Store the graphics object in our array
            this.pathIndicators.push(indicator);
        }
        
        // Only animate if we have indicators to show
        if (this.pathIndicators.length > 0) {
            this.animatePathIndicators();
        }
    }

    clearPathIndicators() {
        // Make sure to mark animation as inactive first
        this.pathAnimationActive = false;
        
        // Then stop any active tween
        if (this.pathAnimationTween) {
            this.pathAnimationTween.stop();
            this.pathAnimationTween = null;
        }
        
        // Finally destroy all indicators
        this.pathIndicators.forEach(indicator => {
            if (indicator && indicator.active) {
                indicator.destroy();
            }
        });
        this.pathIndicators = [];
    }

    animatePathIndicators() {
        if (this.pathIndicators.length === 0) return;
        
        this.pathAnimationActive = true;
        let currentIndex = 0;
        
        // Reset all indicators
        this.pathIndicators.forEach(ind => ind.setAlpha(0.125));
        
        // Function to animate the next indicator
        const animateNext = () => {
            // If animation was stopped or we're out of indicators
            if (!this.pathAnimationActive || this.pathIndicators.length === 0) return;
            
            // Make sure currentIndex is valid
            if (currentIndex >= this.pathIndicators.length) {
                currentIndex = 0;
            }
            
            // Get the current indicator
            const indicator = this.pathIndicators[currentIndex];
            
            // Make sure the indicator still exists
            if (!indicator || !indicator.active) {
                // Skip to the next indicator if this one is gone
                currentIndex = (currentIndex + 1) % Math.max(this.pathIndicators.length, 1);
                this.time.delayedCall(67, animateNext);
                return;
            }
            
            this.pathAnimationTween = this.tweens.add({
                targets: indicator,
                alpha: { from: 0.375, to: 1 },
                duration: 125, 
                yoyo: true,
                onComplete: () => {
                    // Make sure the indicator still exists and animation is active
                    if (this.pathAnimationActive && indicator && indicator.active) {
                        indicator.setAlpha(0.5625);
                    }
                    
                    // Move to the next indicator or back to the beginning
                    currentIndex = (currentIndex + 1) % Math.max(this.pathIndicators.length, 1);
                    
                    // Only schedule next animation if we're still active
                    if (this.pathAnimationActive) {
                        this.time.delayedCall(67, animateNext);
                    }
                }
            });
        };
        
        // Start the animation
        animateNext();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // TERRAIN SPAWNS
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    placeTerrain(scene: Phaser.Scene){
        // Spawn Wooden Barrels
        const barrelPositions = [
            [1, 6],
            [3, 7],
            [0, 0],
            [1, 3],
            [3, 3]
        ];

        barrelPositions.forEach(position => {
            const [x, y] = position;
            const barrelTile = this.grid[x][y]; // Position on the grid
            const barrel = new Terrain(this /*scene*/, 'Wooden Barrel' /*name*/ , TerrainType.BARREL /*type*/, 1 /*HP*/, barrelTile /*position*/, 'P_Barrel01_C' /*spriteKey*/,
                true /*isDestructible*/, true /*isMovable*/);
            this.terrains.push(barrel);
        });

        const barrelEXPositions = [
            //[1, 3],
            [2, 1],
            //[3, 3]
        ];

        barrelEXPositions.forEach(position => {
            const [x, y] = position;
            const barrelTile = this.grid[x][y]; // Position on the grid
            const barrel = new Terrain(this /*scene*/, 'Explosive Barrel' /*name*/ , TerrainType.BARREL_EX /*type*/, 1 /*HP*/, barrelTile /*position*/, 'P_BarrelEX01_C' /*spriteKey*/,
                true /*isDestructible*/, true /*isMovable*/);
            this.terrains.push(barrel);
        });

     //   const lavaPositions = [
     //       [2, 4],
     //      [3, 4],
     //  ];

       // lavaPositions.forEach(position => {
       //    const [x, y] = position;
       //     const lavaTile = this.grid[x][y]; // Position on the grid
       //     const lava = new Terrain(this /*scene*/, 'Lava' /*name*/ , TerrainType.LAVA /*type*/, 0 /*HP*/, lavaTile /*position*/, 'R_Lava_M' /*spriteKey*/,
       //         false /*isDestructible*/, false /*isMovable*/);
       //     this.terrains.push(lava);
       // }); 
        
    }

    scheduleLavaDestruction(target: Terrain) {
        this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
            if (target.position.terrain === target && target.type === TerrainType.BARREL_EX) {
                console.log(`${target.name} explodes in lava!`);
                target.takeDamage(this, target.hp); // Destroy the terrain
            }
        });
    }

    handleCollision(target1: Unit | Terrain, target2: Unit | Terrain, attacker: Unit) {
        if (target1 instanceof Unit && target2 instanceof Unit) {
            console.log(`${target1.name} and ${target2.name} collide and both take 1 damage!`);
            target1.takeDamage(this, 1, attacker, AttackType.MELEE, AttackElement.NEUTRAL, false);
            target2.takeDamage(this, 1, attacker, AttackType.MELEE, AttackElement.NEUTRAL, false);
            this.updateHealthBlocks(target1);
            this.updateHealthBlocks(target2);
        } else if (target1 instanceof Unit && target2 instanceof Terrain) {
            console.log(`${target1.name} collides with ${target2.name} and both take 1 damage!`);
            target1.takeDamage(this, 1, attacker, AttackType.MELEE, AttackElement.NEUTRAL, false);
            target2.takeDamage(this, 1);
            this.updateHealthBlocks(target1);
        } else if (target1 instanceof Terrain && target2 instanceof Unit) {
            console.log(`${target2.name} collides with ${target1.name} and both take 1 damage!`);
            target2.takeDamage(this, 1, attacker, AttackType.MELEE, AttackElement.NEUTRAL, false);
            target1.takeDamage(this, 1);
            this.updateHealthBlocks(target2);
        } else if (target1 instanceof Terrain && target2 instanceof Terrain) {
            console.log(`${target1.name} and ${target2.name} collide and both take 1 damage!`);
            target1.takeDamage(this, 1);
            target2.takeDamage(this, 1);
        } else {
            console.error('Invalid collision detected!');
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // DEBUGGING SYSTEM
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Improved method to draw debug alignment grid
    drawDebugAlignmentGrid() {
        console.log("Drawing debug alignment grid");

        // Clear old debug elements first
        this.debugElements.forEach(element => element.destroy());
        this.debugElements = [];
        
        const graphics = this.add.graphics();
        this.debugElements.push(graphics);
        
        // Combat grid lines in blue
        graphics.lineStyle(1, 0x0000ff, 0.8); // Blue lines for combat grid
        
        const offsetX = 1.5 * GVC.CELL_SIZE;
        const offsetY = 64;
        const gridWidthPx = GVC.GRID_WIDTH * GVC.CELL_SIZE;
        const gridHeightPx = GVC.GRID_HEIGHT * GVC.CELL_SIZE;
        
        // Draw combat grid (blue lines)
        for (let y = 0; y <= GVC.GRID_HEIGHT; y++) {
            const posY = offsetY + y * GVC.CELL_SIZE;
            graphics.lineBetween(offsetX, posY, offsetX + gridWidthPx, posY);
        }
        
        for (let x = 0; x <= GVC.GRID_WIDTH; x++) {
            const posX = offsetX + x * GVC.CELL_SIZE;
            graphics.lineBetween(posX, offsetY, posX, offsetY + gridHeightPx);
        }

        // Position for debug info panel (bottom left, 150px from bottom)
        const debugTextX = 20;
        const debugTextY = (this.sys.game.config.height as number) - 150;
        const lineHeight = 20; // Space between text lines
        
        // Create background panel for debug text
        const debugPanel = this.add.graphics();
        debugPanel.fillStyle(0x000000, 0.7); // Semi-transparent black background
        debugPanel.fillRect(10, debugTextY - 10, 370, 140); // Position and size to hold all text
        this.debugElements.push(debugPanel);
        
        // Try to get the tilemap scene and check if it's available
        try {
            const mapLayout = this.scene.get('CS_Biome01_StraightRoad') as CS_Biome01_StraightRoad;
            
            // Make sure the map property exists before using it
            if (mapLayout && mapLayout.m_CS_B01_StraightR02) {
                const map = mapLayout.m_CS_B01_StraightR02;
                
                console.log("Map found:", map.width, "x", map.height, "tiles");
                const tileWidth = map.tileWidth;
                const tileHeight = map.tileHeight;
                
                graphics.lineStyle(1, 0xff0000, 0.8); // Red lines for tilemap grid
                
                // Adjusting for the tilemap position (-58, -23)
                const tilemapOffsetX = -58;
                const tilemapOffsetY = -23;
                
                // Draw horizontal tilemap grid lines (red)
                for (let y = 0; y <= map.height; y++) {
                    const posY = tilemapOffsetY + y * tileHeight;
                    graphics.lineBetween(0, posY, this.sys.game.config.width as number, posY);
                }
                
                // Draw vertical tilemap grid lines (red)
                for (let x = 0; x <= map.width; x++) {
                    const posX = tilemapOffsetX + x * tileWidth;
                    graphics.lineBetween(posX, 0, posX, this.sys.game.config.height as number);
                }
                
                // Add debug text labels at the bottom left
                let line = 0;
                const blueLabel = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), "Blue: Combat Grid", { color: "#0000ff" }).setDepth(100);
                const redLabel = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), "Red: Tilemap Grid", { color: "#ff0000" }).setDepth(100);
                this.debugElements.push(blueLabel, redLabel);
                
                // Calculate and display offset metrics
                const offsetDiffX = offsetX - tilemapOffsetX;
                const offsetDiffY = offsetY - tilemapOffsetY;
                const offsetText = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), 
                    `Grid offset: X:${offsetDiffX}, Y:${offsetDiffY}`, 
                    { color: "#ffffff", fontSize: '14px' }).setDepth(100);
                    
                const sizeText = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), 
                    `Cell sizes - Combat: ${GVC.CELL_SIZE}, Tilemap: ${tileWidth}x${tileHeight}`, 
                    { color: "#ffffff", fontSize: '14px' }).setDepth(100);
                    
                // Add map dimensions info
                const mapDimensionsText = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), 
                    `Map size: ${map.width}x${map.height} tiles`, 
                    { color: "#ffffff", fontSize: '14px' }).setDepth(100);
                    
                // Add walkability info
                const walkableInfoText = this.add.text(debugTextX, debugTextY + (line++ * lineHeight), 
                    "Red overlay: Non-walkable tiles", 
                    { color: "#ff5555", fontSize: '14px' }).setDepth(100);
                    
                this.debugElements.push(offsetText, sizeText, mapDimensionsText, walkableInfoText);
            } else {
                console.warn("Tilemap not available yet, possibly still loading");
            }
        } catch (error) {
            console.error("Error accessing tilemap:", error);
        }

        // Add visual indicators for non-walkable tiles in the walkability grid
        if (this.walkableGrid && this.walkableGrid.length > 0) {
            const graphics2 = this.add.graphics();
            this.debugElements.push(graphics2);
            graphics2.fillStyle(0xff0000, 0.3); // Red with transparency
            
            for (let y = 0; y < GVC.GRID_HEIGHT; y++) {
                for (let x = 0; x < GVC.GRID_WIDTH; x++) {
                    if (this.walkableGrid[y] && this.walkableGrid[y][x] !== 1) {
                        const posX = offsetX + x * GVC.CELL_SIZE;
                        const posY = offsetY + y * GVC.CELL_SIZE;
                        graphics2.fillRect(posX, posY, GVC.CELL_SIZE, GVC.CELL_SIZE);
                        
                        // Add text indicating the walkability value
                        const walkText = this.add.text(posX + GVC.CELL_SIZE/2, posY + GVC.CELL_SIZE/2, 
                            `${this.walkableGrid[y][x]}`, 
                            { color: "#ffffff", fontSize: '14px' })
                            .setDepth(31)
                            .setOrigin(0.5);
                        this.debugElements.push(walkText);
                    }
                }
            }
            graphics2.setDepth(29);
        }
    }

    // Create debug toggle button
    createDebugToggleButton() {
        this.debugToggleButton = this.add.text(10, 10, "DEBUG: ON", {
            fontSize: '18px',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            color: '#00ff00'
        })
        .setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.toggleDebugMode();
        });
    }

    toggleDebugMode() {
        this.debugModeEnabled = !this.debugModeEnabled;
        if (this.debugToggleButton) {
            this.debugToggleButton.setText(this.debugModeEnabled ? "DEBUG: ON" : "DEBUG: OFF");
            this.debugToggleButton.setColor(this.debugModeEnabled ? '#00ff00' : '#ff0000');
        }

        // Toggle visibility of all debug elements with a type check
        this.debugElements.forEach(element => {
            if ('setVisible' in element) {
                (element as any).setVisible(this.debugModeEnabled);
            }
        });

        // If debug mode is enabled, redraw debug grid
        if (this.debugModeEnabled) {
            this.drawDebugAlignmentGrid();
        }
    }

    /* END-USER-CODE */
}


