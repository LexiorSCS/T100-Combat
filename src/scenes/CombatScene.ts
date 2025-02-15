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

/* START OF COMPILED CODE */

export default class CombatScene extends Phaser.Scene {
    // Move all your property declarations here
    grid: Tile[][] = [];
    units: Unit[] = []; // Array to hold units on the scene.
    terrains: Terrain[] = []; // Array to hold terrain elements on the scene.
    actionPanelContainer: Phaser.GameObjects.Container | null = null; // Container for action buttons
    isActionComplete: boolean = true; // Property to track if action is complete
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

    constructor() {
        super("CombatScene");
        /* START-USER-CTR-CODE */
        // Write your code here.
        /* END-USER-CTR-CODE */
    }

    editorCreate(): void {
        // battlemapHORIZ
        this.add.image(640, 380, "BattlemapHORIZ").setDepth(1); // Sets the Layer to 1 (Foreground)
        this.events.emit("scene-awake");
    }

    /* START-USER-CODE */
    // Move all your methods and implementation code here
    preload() {
        // Load Unit token assets
        this.load.pack("assets-tokens-pack", "assets/assets-tokens-pack.json");
        this.load.pack("asset-UI-pack", "assets/asset-UI-pack.json");
        this.load.pack("asset-SplashPortraits-pack", "assets/asset-SplashPortraits-pack.json");
        // Ensure portrait textures are loaded
    }

    create() {
        // Launch the CombatUI scene
        this.scene.launch('CombatUI');
        // Set CombatUI scene to be on top of CombatScene
        this.scene.bringToTop('CombatUI');

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

            const offsetX = (screenWidth - gridWidthPx) / 2; // Offset to center the grid horizontally
            const offsetY = (screenHeight - gridHeightPx) / 2;

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

        const offsetX = (screenWidth - gridWidthPx) / 2; // Offset to center the grid horizontally
        const offsetY = (screenHeight - gridHeightPx) / 2;

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
                            target.sprite.setTint(0xff0000); // Highlight valid targets in red
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
                            target.sprite.setTint(0xff0000); // Highlight in red
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
                            target.sprite.setTint(0xff0000); // Highlight in red
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
                        target.sprite.setTint(0x00ff00); // Highlight in green
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
                            console.log('Creating PopupWindow'); // Add this line
                            combatUI.createPopupWindow('Choose one:', ['Disarm Trap', 'Set Trap'], (option) => {
                                this.enterModeTargeting(option);
                                this.popupTargetingInstance = combatUI.createPopupTargeting(this.currentSkill, null, () => {
                                    // On Cancel
                                    this.leaveModeTargeting(); // Delete all of highlights & exit targeting mode; Re-highlight Current unit
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
                                            tile.setFillStyle(GVC.TILE_COLOR_TRAP); // Highlight valid tiles
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
                                        tile.setFillStyle(GVC.TILE_COLOR_TRAP); // Highlight valid tiles
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
            target.sprite.setTint(0xff0000); // Highlight in red
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
    removeUnit(unit: Unit) {
        this.units = this.units.filter(u => u !== unit);
        this.initiativeQueue = this.initiativeQueue.filter(u => u !== unit); // Remove from initiative queue
        console.log(`${unit.name} has been removed from the units array and initiative queue.`);
        unit.sprite.destroy(); // Remove defeated unit
        unit.targetingHoverSprite.destroy(); // Clean up targeting hover sprite
        this.clearHighlights();
        this.clearAllInteractivity();
        this.updateUI();
    }

    // Clear all interactivity from previous turn
    clearAllInteractivity() {
        this.units.forEach(unit => {
            if (unit.sprite.input) {
                unit.sprite.removeAllListeners();
                unit.sprite.disableInteractive();
            }
            // Just hide the sprite instead of destroying it
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
        console.log('updateHealthBlocks called for unit:', unit.name);
        if (!unit.healthBlocks) {
            unit.healthBlocks = [];
        }
        // Remove existing blocks of BOTH hp and tempHp
        unit.healthBlocks.forEach(block => block.destroy());
        unit.healthBlocks = [];
        unit.tempHealthBlocks.forEach(block => block.destroy());
        unit.tempHealthBlocks = [];
        ////////////////////////////// BASE HEALTH //////////////////////////////
        // Create a block for each HP
        const blockSize = 10; // Size of each block
        const blockSpacing = 30; // Spacing between blocks
        const totalWidth = unit.hp * blockSize + (unit.hp - 1) * blockSpacing; // Total width of all blocks and spacings
        const startX = unit.sprite.x - totalWidth / 2 + blockSize / 2; // Center blocks over the sprite
        const startY = unit.sprite.y + 64; // Position above the unit
        // Generate Black Borders for Health Blocks
        for (let i = 0; i < unit.hp; i++) {
            const block = this.add.rectangle(
                startX + i * (blockSize + blockSpacing),
                startY,
                (blockSize * 3) * 1.2, //width of a block
                (blockSize) * 1.4, // height of a block
                0x080808 // Black for HP Borders
            ).setDepth(2); // Place above the unit
            unit.healthBlocks.push(block);
        }
        // Geneate Red Health Blocks
        for (let i = 0; i < unit.hp; i++) {
            const block = this.add.rectangle(
                startX + i * (blockSize + blockSpacing),
                startY,
                blockSize * 3, //width of a block
                blockSize, // height of a block
                0xff0000 // Red for HP
            ).setDepth(2); // Place above the unit
            unit.healthBlocks.push(block);
        }
        ////////////////////////////// BASE HEALTH //////////////////////////////
        /////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////
        /////////////////////////// TEMPORARY HEALTH ////////////////////////////

        // Create a block for each tempHp
        const blockSizeTEMP = 12; // Size of each block
        const totalWidthTEMP = unit.tempHp * blockSizeTEMP + (unit.tempHp - 1) * blockSpacing; // Total width of all blocks and spacings
        const startXTEMP = unit.sprite.x - totalWidthTEMP / 2 + blockSizeTEMP / 2; // Center blocks over the sprite
        // Generate Black Borders for TEMPORARY Blocks
        for (let i = 0; i < unit.tempHp; i++) {
            const block = this.add.rectangle(
                startXTEMP + i * (blockSizeTEMP + blockSpacing),
                startY,
                (blockSizeTEMP * 3) * 1.2, //width of a block
                (blockSizeTEMP) * 1.4, // height of a block
                0x080808 // Black for HP Borders
            ).setDepth(2); // Place above the unit
            unit.healthBlocks.push(block);
        }
        // Geneate Cyan TEMPORARY Health Blocks
        for (let i = 0; i < unit.tempHp; i++) {
            const block = this.add.rectangle(
                startXTEMP + i * (blockSizeTEMP + blockSpacing),
                startY,
                blockSize * 3, //width of a block
                blockSize, // height of a block
                0x63f7ed, // Cyan for temp HP
                0.55 // OPACITY of Temp HP 
            ).setDepth(2); // Place above the unit
            unit.healthBlocks.push(block);
        }

        // Claim the tile as unwalkable
        if (unit.position) {
            unit.position.isWalkable = false;
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
        const path = this.calculatePath(unit.position, tile); // Get the path to the target tile
        let totalCost = 0;

        for (let i = 1; i < path.length; i++) {
            const current = path[i - 1];
            const next = path[i];

            const dx = Math.abs(next.gridX - current.gridX);
            const dy = Math.abs(next.gridY - current.gridY);
            const isDiagonal = dx === 1 && dy === 1;

            let cost = isDiagonal ? 2 : 1;
            if (unit.type === 'Expert' && isDiagonal) cost = 1;

            totalCost += cost;
        }

        if (unit.movementPoints < totalCost) {
            console.log(`${unit.name} does not have enough movement points to move to (${tile.gridX}, ${tile.gridY}).`);
            return;
        }

        console.log(`${unit.name} moves to (${tile.gridX}, ${tile.gridY}) at a cost of ${totalCost} points.`);
        unit.spendMovementPoints(totalCost);
        unit.moveTo(tile);

        // Trigger trap effects if the tile is trapped
        tile.triggerTrap(unit);
        if (unit.hp <= 0) {
            this.removeUnit(unit);
            this.startNextTurn();
            return;
        }

        // Handle terrain effects
        if (tile.terrain?.type === TerrainType.PIT) {
            console.log(`${unit.name} falls into a pit and is removed from the battlefield!`);
            this.removeUnit(unit); // Remove the unit from the game
            this.startNextTurn();
            return;
        }

        // Update health blocks after unit moves
        this.units.forEach(unit => this.updateHealthBlocks(unit));
        this.clearHighlights(); // Clear highlights after movement

        // Re-highlight new tiles if the unit still has movement points left
        if (unit.movementPoints > 0) {
            this.highlightMovementRange(unit, unit.movementPoints);
        } else {
            console.log('RAN OUT OF MOVEMENT POINTS');
            this.leaveModeTargeting();
        }
    }

    calculatePath(startTile: Tile, endTile: Tile): Tile[] {
        const path: Tile[] = [startTile];

        let currentTile = startTile;
        while (currentTile !== endTile) {
            const dx = Math.sign(endTile.gridX - currentTile.gridX);
            const dy = Math.sign(endTile.gridY - currentTile.gridY);

            const nextTile = this.grid[currentTile.gridY + dy]?.[currentTile.gridX + dx];
            if (!nextTile) break;

            path.push(nextTile);
            currentTile = nextTile;
        }

        return path;
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
                tile.setFillStyle(GVC.TILE_COLOR_DEFAULT); // Reset to default fill style
                if (tile.hoverSprite) {
                    tile.hoverSprite.setVisible(false); // Set hover sprite to invisible
                }
                tile.off('pointerdown'); // Remove old event listeners
            });
        });
    }

    highlightMovementRange(unit: Unit, maxRange: number) {
        this.clearHighlights(); // Clear previous highlights

        const visited = new Set<string>(); // Keep track of visited tiles
        const queue: { tile: Tile; remainingPoints: number }[] = [
            { tile: unit.position, remainingPoints: unit.movementPoints },
        ];

        while (queue.length > 0) {
            const { tile, remainingPoints } = queue.shift()!;
            const key = `${tile.gridX},${tile.gridY}`;
            if (visited.has(key)) continue; // Skip already visited tiles

            visited.add(key);

            // Highlight the tile if it's walkable
            if (tile.isWalkable) {
                tile.setFillStyle(tile.isTrapped ? GVC.TILE_COLOR_TRAP : GVC.TILE_COLOR_HIGHLIGHT_OK);
                tile.setInteractive();
                tile.on('pointerdown', () => this.moveUnitToTile(unit, tile));
            }

            // Highlight occupied tiles for Castling (Defender only)
            if (unit.type === 'Defender' && !tile.isWalkable && tile.terrain === null) {
                const occupant = this.units.find(u => u.position === tile);
                if (occupant) {
                    tile.setFillStyle(0x800080); // Purple for Castling
                    tile.setInteractive();
                    tile.on('pointerdown', () => this.castling(unit, occupant)); // Trigger Castling
                }
            }

            // Explore neighboring tiles if there are movement points left
            if (remainingPoints > 0) {
                const neighbors = this.getTileNeighbors(tile);
                for (const neighbor of neighbors) {
                    const dx = Math.abs(neighbor.gridX - tile.gridX);
                    const dy = Math.abs(neighbor.gridY - tile.gridY);
                    const isDiagonal = dx === 1 && dy === 1;

                    let cost = isDiagonal ? 2 : 1;
                    if (unit.type === 'Expert' && isDiagonal) cost = 1; // Experts move diagonally for 1 point

                    if (neighbor.terrain?.type === TerrainType.MUD) {
                        cost *= 2; // Mud doubles the movement cost
                    }

                    if (!visited.has(`${neighbor.gridX},${neighbor.gridY}`) && remainingPoints >= cost) {
                        queue.push({ tile: neighbor, remainingPoints: remainingPoints - cost });
                    }
                }
            }
        }
    }

    enterModeTargeting(currentSkill: string){
        this.isTargetingMode = true;
        this.currentSkill = currentSkill;
    }

    leaveModeTargeting(){
        this.clearHighlights();
        this.clearActiveUnitHighlight();
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
        this.clearHighlights(); // Ensure no old highlights persist

        // Highlight adjacent units
        let validUnits = this.units.filter(target =>
            this.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                .filter(tile => tile !== unit.position)
                .includes(target.position) && this.isValidTarget(unit, target));
        if (isTargetSelf === true){
            validUnits = this.units.filter(target =>
                this.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                    .includes(target.position) && this.isValidTarget(unit, target));
        }

        // Use centralized target validation

        // Highlight adjacent destructible terrain
        const validTerrain = this.terrains.filter(target =>
            target.isDestructible && this.getTilesInRange(unit.position.gridX, unit.position.gridY, 3)
                .filter(tile => tile !== unit.position)
                .includes(target.position)
        );

        // Combine all valid targets
        const validTargets = [...validUnits, ...validTerrain];

        validTargets.forEach(target => {
            target.sprite.setTint(0xff0000); // Highlight valid targets in red
            target.sprite.setInteractive();
            target.sprite.once('pointerdown', () => {
                this.clearAllInteractivity(); // Clear all interactivity before executing action
                console.log(`${unit.type} targets ${target instanceof Unit ? target.type : target.name}.`);
                this.currentTarget = target; // Queue the target
                onTargetSelected(target); // Call the provided logic for selection
                // Re-enable hover after click
                target.sprite.on('pointerover', () => target.onTargetHover());
                target.sprite.on('pointerout', () => target.onTargetHoverOut());
            });
            // Enable hover effect
            target.sprite.on('pointerover', () => target.onTargetHover());
            target.sprite.on('pointerout', () => target.onTargetHoverOut());
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
            { x: 1, y: 1 },   // Bottom-right diagonal
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
        if (!this.isAdjacent(defender.position, target.position)) {
            console.log(`Castling failed: ${target.name} is not adjacent to ${defender.name}.`);
            return;
        }

        // Swap positions
        const defenderTile = defender.position;
        const targetTile = target.position;

        defender.moveTo(targetTile); // Move Defender to target's tile
        target.moveTo(defenderTile); // Move target to Defender's tile
        targetTile.isWalkable = false;
        this.updateHealthBlocks(target); // Update health blocks after castling
        this.updateHealthBlocks(defender); // Update health blocks after castling

        // Reduce movement points for castling
        defender.spendMovementPoints(1); // Assuming castling costs 1 movement point

        console.log(`${defender.name} Castles with ${target.name}.`);
        this.clearHighlights(); // Clear highlights after castling

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

        const lavaPositions = [
            [2, 4],
            [3, 4],
        ];

        lavaPositions.forEach(position => {
            const [x, y] = position;
            const lavaTile = this.grid[x][y]; // Position on the grid
            const lava = new Terrain(this /*scene*/, 'Lava' /*name*/ , TerrainType.LAVA /*type*/, 0 /*HP*/, lavaTile /*position*/, 'R_Lava_M' /*spriteKey*/,
                false /*isDestructible*/, false /*isMovable*/);
            this.terrains.push(lava);
        });
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
    /* END-USER-CODE */
}

/* END OF COMPILED CODE */


