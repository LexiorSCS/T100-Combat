import { Tile } from './Tile';
import { Terrain } from './Terrain';
import { TerrainType } from './Terrain';
import * as GVC from '../../GlobalVariablesCombat';
// Import the Phaser Scene for use in the Tile Class.
import CombatScene from '../../scenes/CombatScene';

export enum AttackType {
    MELEE = 'melee',
    RANGED = 'ranged',
    TERRAIN = 'terrain'
}

export enum AttackElement {
    // Mundane attacks (default)
    NEUTRAL = 'neutral',
    // Base elements
    FIRE = 'fire',
    WATER = 'water',
    EARTH = 'earth',
    // Fusion elements
    LIFE = 'life', // Earth + Water
    BALANCE = 'balance', // Water + Fire
    DEATH = 'death' // Fire + Earth 
}

export enum UnitTier{
    C = 'C-tier', // starting tier
    B = 'B-tier', // unitAbility = true;
    A = 'A-tier', // isUpgraded = true;
    S = 'S-tier', // unitPassive = true; Only FUSION elements; Only 1 S-tier unit/battle
}

export class Unit {
     scene: CombatScene;
     name: string;
     type: string;
     role: string;
     element: AttackElement;
     hp: number;
     tempHp: number = 0;
     maxHp: number;
     dexterity: number;
     position: Tile;
     sprite: Phaser.GameObjects.Image; // Token sprite
     splashArt: Phaser.GameObjects.Image; // Transparent silhouette of a character for close-ups and initiative
     portrait: Phaser.GameObjects.Image; // 300x300 portrait files for InitiativeUI
     faction: number;
     conditions: string[]; // Track active conditions like "Exposed" or "Crippled"
     remainingTraps: number = 2; // Default number of traps for the Trapper class per battle
     /////////////// Health Logic
     healthBlocks: Phaser.GameObjects.Rectangle[] = []; // Array to hold health block rectangles
     tempHealthBlocks: Phaser.GameObjects.Rectangle[] = []; // Array of TEMPORARY health block rectangles
     /////////////// Action Economy Logic
     movementPoints: number; // Number of movement points the unit has currently for disposal; also starting amount of movement points (default: 0)
     movementGen: number; // Number of points for movement actions generated per turn (default: 1)
     movementCap: number // Maximum amount of movement points to be accumulated by a unit (default: 2)
     /////////////// Turn Logic
     initiative: number = 0; // Default to 0; As combat starts: 1d10 + dexterity  
     isActionComplete: boolean = false; // Flag to track if the unit has completed its action
     /////////////// Advancement Logic (Character tiers & additional skills)
     tier: UnitTier;
     isUpgraded: boolean; // Checks if a character is of A+ tier, therefore has better version of its abilities


    constructor(scene: CombatScene, tier: UnitTier, name: string, type: string, role: 'Melee' | 'Ranged' = 'Melee' /*Default to Melee*/,
         element: AttackElement, hp: number, maxHp: number, dexterity: number,
         position: Tile, faction: number, spriteKey: string, splashArtKey: string, portraitKey: string) 
    {
        this.scene = scene;
        this.name = name;
        this.type = type;
        this.role = role;
        this.element = element;
        this.hp = hp;
        this.maxHp = maxHp
        this.dexterity = dexterity;
        this.position = position;
        this.position.isWalkable = false; // Mark the tile as occupied
        this.faction = faction;
        this.conditions = []; // Start with no conditions
        this.remainingTraps = 2;
        this.movementPoints = 0; // Default starting movement points
        this.movementGen = 1; // Default movement points generated per turn
        this.movementCap = 2; // Default maximum movement points
        this.tier = tier;
        this.isUpgraded = this.tier === UnitTier.A || this.tier === UnitTier.S; 

        // Create the sprite for the unit
        this.sprite = scene.add.image(
            position.x + position.width / 2, // Center horizontally
            position.y + position.height / 2, // Center vertically
            spriteKey
        );
        // Set splash art to the token spriteKey if no splash art exists.
        if (!splashArtKey || !scene.textures.exists(splashArtKey)) {
            splashArtKey = spriteKey;
        }
        // Set portrait art to the token spriteKey if no portrait art exists.
        if (!portraitKey || !scene.textures.exists(portraitKey)) {
            portraitKey = spriteKey;
        }

        // Assign the portrait texture key
        this.portrait = scene.add.image(0, 0, portraitKey).setVisible(false); // Ensure it's not visible

        // Get original token dimensions and calculate scale
        const frame = scene.textures.getFrame(spriteKey); // Fetch the texture frame
        if (frame) {
            const originalWidth = frame.width;
            const originalHeight = frame.height;

            // Scale uniformly to fit within the grid tile
            const scaleFactor = GVC.CELL_SIZE / Math.max(originalWidth, originalHeight);
            this.sprite.setScale(scaleFactor);

            // Adjust sprite position to fit within the grid cell
            this.sprite.setPosition(
                position.x + (GVC.CELL_SIZE - originalWidth * scaleFactor) / 2 + GVC.CELL_SIZE / 2,
                position.y + (GVC.CELL_SIZE - originalHeight * scaleFactor) / 2 + GVC.CELL_SIZE / 2
            );
        } else {
            console.warn(`Unable to scale sprite: ${spriteKey}. Frame not found.`);
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    // MOVEMENT LOGIC
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    
    gainMovementPoints() {
        this.movementPoints = Phaser.Math.MaxAdd(this.movementPoints, this.movementGen, this.movementCap); // At the start of the turn, gains 1 movement point, up to a maximum of 2 (by default)
        console.log(`${this.name} resets movement points to ${this.movementPoints}`);
    }

    spendMovementPoints(points: number) {
        Phaser.Math.Clamp(this.movementPoints, 0, this.movementCap); // Ensure the movement points don't go below 0 or above the cap
        this.movementPoints -= points; 
        console.log(`${this.name} spends ${points} movement points. Remaining: ${this.movementPoints}`);
    }
    
    // Move the unit to a new tile
    moveTo(tile: Tile) {
        this.position.isWalkable = true; // Free the current tile
        this.position = tile;
        tile.isWalkable = false; // Occupy the new tile

        // Update sprite position
        this.sprite.setPosition(
            tile.x + tile.width / 2,
            tile.y + tile.height / 2
        );

        console.log(`${this.name} moved to (${tile.gridX}, ${tile.gridY})`);
    }
    
    
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    // ACTIONS LOGIC
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    // Bash action Definition

    
    bash(target: Unit | Terrain, damage: number, attacker: Unit) {

        if (target instanceof Unit) {
            console.log(`${this.name} bashes ${target.name}`);
            target.takeDamage(this.scene, damage, attacker /*attacker*/, AttackType.MELEE, this.element, false /*isUpgradeActive*/); // Deal damage to unit
            this.isActionComplete = true; // Mark the action as complete to properly end the turn afterwards
        } else if (target instanceof Terrain && target.isDestructible) {
            console.log(`${this.name} bashes destructible terrain (${target.name})`);
            target.takeDamage(this.scene, 1); // Deal damage to terrain
            this.isActionComplete = true; // Mark the action as complete to properly end the turn afterwards
        } else {
            console.log(`Invalid target for bash.`);
        }

        /*console.log(`${this.name} bashes ${target.name}`);
        target.takeDamage(1);
        this.isActionComplete = true; // Mark the action as complete to properly end the turn afterwards*/
        
    }
    
    push (scene: CombatScene, target: Unit | Terrain, attacker: Unit, pushDistance: number){
        const dx = target.position.gridX - this.position.gridX;
        const dy = target.position.gridY - this.position.gridY;
        const stepX = Math.sign(dx); // Determine the direction of the push (X-axis)
        const stepY = Math.sign(dy); // Determine the direction of the push (Y-axis)
    
        // Try to push the target the full distance, but stop at the first valid, walkable tile
        let newGridX = target.position.gridX;
        let newGridY = target.position.gridY;
        let pushed = false;
        let actualPushDistance = 0;
    
        for (let i = 1; i <= pushDistance; i++) {
            newGridX += stepX;
            newGridY += stepY;
    
            const newTile = scene.grid[newGridY]?.[newGridX];
            if (newTile && newTile.isWalkable) {
                // Move the target to the new tile if it's walkable
                if (target instanceof Unit) {
                    target.moveTo(newTile);
                    scene.updateHealthBlocks(target);
                } else if (target instanceof Terrain && target.isDestructible) {
                    // Move destructible terrain
                    target.position.isWalkable = true; // Free the current tile
                    target.position = newTile;
                    newTile.isWalkable = false; // Occupy the new tile
                    target.sprite.setPosition(
                        newTile.x + newTile.width / 2,
                        newTile.y + newTile.height / 2
                    );
                }
                pushed = true;
                this.isActionComplete = true; // Mark the action as complete
                actualPushDistance = i;
            } else if(newTile && !newTile.isWalkable && newTile.terrain && newTile.terrain.isDestructible){
                // If the tile is not walkable but has destructible terrain, handle the terrain
                const terrain = newTile.terrain;
                console.log(`${attacker.name} pushes ${target.name} into destructible terrain ${terrain.name}`);
                terrain.takeDamage(this.scene, 1); // Deal damage to the terrain
                if (terrain.hp <= 0) {
                    // If the terrain is destroyed, move the target to the new tile
                    if (target instanceof Unit) {
                        target.moveTo(newTile);
                        console.log(`${target.name} suffers 1 damage due to smashing through an obstacle.`);
                         target.takeDamage(this.scene, 1, this, AttackType.MELEE, this.element, false); // Apply damage
                        scene.updateHealthBlocks(target);
                    } else if (target instanceof Terrain && target.isDestructible) {
                        target.position.isWalkable = true; // Free the current tile
                        target.position = newTile;
                        newTile.isWalkable = false; // Occupy the new tile
                        target.sprite.setPosition(
                            newTile.x + newTile.width / 2,
                            newTile.y + newTile.height / 2
                        );
                    }
                    pushed = true;
                    this.isActionComplete = true; // Mark the action as complete
                    actualPushDistance = i;
                } else {
                    break; // Stop if the terrain is not destroyed
                }
            } 
            /*If the tile is not walkable, check for hazards*/
            else {
                if (newTile?.terrain?.type === TerrainType.PIT) {
                    console.log(`${target.name} falls into a pit and is removed!`);
                    if (target instanceof Unit) {
                        scene.removeUnit(target);
                    } else if (target instanceof Terrain) {
                        target.sprite.destroy();
                        target.position.terrain = null; // Remove terrain from tile
                    }
                    break;
                } else if (newTile?.terrain?.type === TerrainType.LAVA) {
                    console.log(`${target.name} is pushed into lava and will suffer damage at the start of their turn !`);
                    if (target instanceof Unit) {
                        target.moveTo(newTile); // Move the unit into the lava
                        scene.updateHealthBlocks(target);
                    }
                    return;
                } else {
                    // Stop pushing if the tile is not walkable and no hazard is present
                    break;
                }
            }
        }
        if (pushed) {
            console.log(`${this.name} pushes ${target.name} ${actualPushDistance} squares away.`);
        } else {
            console.log(`Cannot push ${target.name}; no valid tile available.`);
        }

        // Apply damage if the push is interrupted
        if (actualPushDistance < pushDistance) {
            console.log(`${target.name} suffers 1 damage due to being stopped by an obstacle.`);
            target.takeDamage(this.scene, 1, this, AttackType.MELEE, this.element, false); // Apply damage
            if (target instanceof Unit) {
                scene.updateHealthBlocks(target); // Update health bar for units
            }
        }
    }
    

    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////DAMAGE LOGIC/////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////
    // Suffering Damage Logic
    takeDamage(scene: CombatScene, damage: number, attacker: Unit, attackType: AttackType, attackElement: AttackElement, isUpgradeActive: boolean) {
        // Trigger Absolution for dying allies
        const healers = scene.units.filter(
            unit => unit.type === 'Healer' && unit.faction === this.faction
        );
    
        for (const healer of healers) {
            if (healer.absolution(scene, this, damage)) {
                console.log(`Damage to ${this.name} was redirected by ${healer.name}.`);
                return; // Absolution triggered, stop further damage processing
            }
        }
        
        // Trigger Redirect for ranged attacks
        if (this.type === 'Expert' && attackType === AttackType.RANGED) {
            const adjacentUnits = scene.units.filter(
                target => scene.isAdjacent(this.position, target.position) && target !== this && !(target instanceof Unit && target.type === 'Expert')
            );
    
            if (adjacentUnits.length > 0) {
                // Prioritize hostile units for redirection
                const target = adjacentUnits.find(unit => unit.faction !== this.faction) || adjacentUnits[0];
    
                console.log(`${this.name} redirects the ranged attack from ${attacker.name} to ${target.name}.`);
                target.takeDamage(scene, damage, attacker, attackType, AttackElement.NEUTRAL, isUpgradeActive);
    
                // Apply Exposed condition if upgraded
                if (isUpgradeActive && target.faction !== this.faction) {
                    console.log(`${target.name} gains Exposed condition from redirect.`);
                    target.conditions.push('Exposed');
                }
    
                return; // Redirect successful, no damage taken by Expert
            }
    
            console.log(`${this.name} attempted to redirect, but no valid targets were found.`);
        }

        console.log(`${this.name} takes ${damage} damage!`);
        // Apply damage to temporary hit blocks first
        if (this.tempHp > 0) {
            const tempDamage = Math.min(damage, this.tempHp);
            console.log(`${this.name} loses ${tempDamage} temporary HB! Remaining tempHB: ${this.tempHp}`);
            this.tempHp -= tempDamage;
            damage -= tempDamage;
        }
        if (damage > 0) {
            this.hp = Math.max(0, this.hp - damage); // Reduce HP, ensuring it doesn't go below 0
            console.log(`${this.name} loses ${damage} HB! Remaining HB: ${this.hp}`);
            }
        // Update health blocks
        console.log('Calling updateHealthBlocks from takeDamage');
        this.scene.updateHealthBlocks(this);
    
        // Check for unit defeat
        if (this.hp <= 0) {
            console.log(`${this.name} is defeated!`);
            // Remove the health blocks
            this.healthBlocks.forEach(block => block.destroy());
            this.tempHealthBlocks.forEach(block => block.destroy());
            
            // Remove the defeated unit from the initiative tracker
            this.scene.removeUnit(this); // Remove the unit from the scene
            // End the turn if the unit dies during its turn
            /*if (scene.initiativeQueue[scene.currentUnitIndex] === this) {
                console.log(`Ending turn for ${this.name} as it is defeated.`);
                scene.startNextTurn();
            }*/
            this.position.isWalkable = true; // Free the tile
            this.sprite.destroy(); // Remove defeated unit
        }
    }
    // Grant Temporary Health to a Unit (without time retention limimation)
    grantTemporaryHealth(amount: number) {
        this.tempHp = Math.min(this.maxHp, amount); // Cap temp HP to max HP
        console.log(`${this.name} gains ${this.tempHp} temporary grantTemporaryHealth!`);
        // Debug + Update health blocks
        console.log('Calling updateHealthBlocks from grantTemporaryHealth!');
        this.scene.updateHealthBlocks(this);
    }
    // Remove any of the Temporary Health granted to a unit
    removeTemporaryHealth() {
        this.tempHp = 0;
        // Debug + Update health blocks
        console.log(`${this.name}'s temporary health expires!`);
        console.log('Calling updateHealthBlocks from removeTemporaryHealth!');
        this.scene.updateHealthBlocks(this);
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // DEFENDER LOGIC
    ///////////////////////////////////////////////////////////////////////////////////
    
    // Defender CLASS ACTION Definition
    fortify(scene: CombatScene, isQuizActive: boolean, isUpgradeActive: boolean, isQuizCorrect: boolean) {
        let tempHpToGrant = 1; // Default temporary HP
    
        if (isQuizActive) { // For quizzing scenarios (default)
            if (isQuizCorrect){
                // If the quiz is passed, the unit gains temporary health
                tempHpToGrant = Phaser.Math.Between(1, 2);
                if (isUpgradeActive) tempHpToGrant = Phaser.Math.Between(2, 3);
                console.log(`${this.name} uses Fortify to gain ${tempHpToGrant} temporary Health Blocks!`);
                this.grantTemporaryHealth(tempHpToGrant);
            }
            else
            // If the quiz is failed, the unit fails to use the ability
            console.log(`${this.name} attempts to use Fortify but fails the quiz !`);
        }
        else{ // For multiplayer or non-quzzing scenarios
            let tempHpToGrant = 2;
            if (isUpgradeActive) tempHpToGrant = 3;
            console.log(`${this.name} uses Fortify to gain ${tempHpToGrant} temporary Health Blocks!`);
            this.grantTemporaryHealth(tempHpToGrant);
        }
        
        this.isActionComplete = true; // Mark the action as complete to properly end the turn afterwards
    }
    // Defender PASSIVE I: Pushing Bash
    // Replace the bash action with a Pushing Bash action
    pushingBash(scene: CombatScene, target: Unit | Terrain) {
        // Ensure this ability is used on the unit's turn
        if (scene.initiativeQueue[scene.currentUnitIndex] !== this) {
            console.log(`${this.name} cannot use Push outside of their turn.`);
            return;
        }
    
        console.log(`${this.name} uses Pushing Bash on ${target.name}`);
    
        this.push(scene, target, this, 2); // Push the target 2 squares
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // EXPERT LOGIC
    ///////////////////////////////////////////////////////////////////////////////////

    // Expert CLASS ABILITY: Pull
    pull(scene: CombatScene, target: Unit | Terrain, range: number, isQuizActive: boolean, isUpgradeActive: boolean) {
        // Ensure this ability is used on the unit's turn
        if (scene.initiativeQueue[scene.currentUnitIndex] !== this) {
            console.log(`${this.name} cannot use Pull outside of their turn.`);
            return;
        }
    
        const pullDistance = isQuizActive ? 2 : 1; // Adjust pull distance based on QUIZ upgrade
    
        if (scene.getTilesInRange(this.position.gridX, this.position.gridY, range).includes(target.position)) {
            console.log(`${this.name} uses Pull on ${target.name}`);
    
            // Calculate the direction for the pull
            const dx = this.position.gridX - target.position.gridX;
            const dy = this.position.gridY - target.position.gridY;
            const stepX = Math.sign(dx);
            const stepY = Math.sign(dy);
    
            // Try to pull the target the full distance, but stop at the first valid, walkable tile
            let newGridX = target.position.gridX;
            let newGridY = target.position.gridY;
            let pulled = false;
            let actualPullDistance = 0;
    
            for (let i = 1; i <= pullDistance; i++) {
                newGridX += stepX;
                newGridY += stepY;
    
                const newTile = scene.grid[newGridY]?.[newGridX];
                if (newTile && newTile.isWalkable) {
                    if (target instanceof Unit) {
                        target.moveTo(newTile);
                        this.scene.updateHealthBlocks(target);
                    } else if (target instanceof Terrain && target.isDestructible) {
                        target.position.isWalkable = true; // Free the current tile
                        target.position = newTile;
                        newTile.isWalkable = false; // Occupy the new tile
                        target.sprite.setPosition(
                            newTile.x + newTile.width / 2,
                            newTile.y + newTile.height / 2
                        );
                    }
                    pulled = true;
                    this.isActionComplete = true; // Mark the action as complete
                    actualPullDistance = i;
                } else if (newTile && !newTile.isWalkable && newTile.terrain && newTile.terrain.isDestructible) {
                    // If the tile is not walkable but has destructible terrain, handle the terrain
                    const terrain = newTile.terrain;
                    console.log(`${this.name} pulls ${target.name} into destructible terrain ${terrain.name}`);
                    terrain.takeDamage(this.scene, 1); // Deal damage to the terrain
                    if (terrain.hp <= 0) {
                        // If the terrain is destroyed, move the target to the new tile
                        if (target instanceof Unit) {
                            target.moveTo(newTile);
                            this.scene.updateHealthBlocks(target);
                        } else if (target instanceof Terrain && target.isDestructible) {
                            target.position.isWalkable = true; // Free the current tile
                            target.position = newTile;
                            newTile.isWalkable = false; // Occupy the new tile
                            target.sprite.setPosition(
                                newTile.x + newTile.width / 2,
                                newTile.y + newTile.height / 2
                            );
                        }
                        pulled = true;
                        this.isActionComplete = true; // Mark the action as complete
                        actualPullDistance = i;
                    } else {
                        break; // Stop if the terrain is not destroyed
                    }
                } else if (newTile && newTile.terrain) { // Add null check for newTile
                    if (newTile.terrain.type === TerrainType.PIT) {
                        console.log(`${target.name} falls into a pit and is removed!`);
                        if (target instanceof Unit) {
                            scene.removeUnit(target);
                        } else if (target instanceof Terrain) {
                            target.sprite.destroy();
                            target.position.terrain = null; // Remove terrain from tile
                        }
                        break;
                    } else if (newTile.terrain.type === TerrainType.LAVA) {
                        console.log(`${target.name} is pulled into lava and will suffer damage at the start of their turn!`);
                        if (target instanceof Unit) {
                            target.moveTo(newTile); // Move the unit into the lava
                            scene.updateHealthBlocks(target);
                        }
                        return;
                    } else {
                        // Stop pulling if the tile is not walkable and no hazard is present
                        break;
                    }
                } else {
                    // Stop pulling if the tile is not walkable and no hazard is present
                    break;
                }
                console.log(`${this.name} pulls ${target.name} ${actualPullDistance} squares towards them!`);
            }
    
            if (pulled) {
                // Apply Exposed condition if the target is hostile and the ability is upgraded
                if (isUpgradeActive && target instanceof Unit && this.faction != target.faction) {
                    console.log(`${target.name} gains the Exposed condition!`);
                    target.conditions.push('Exposed');
                }
            } else {
                console.log(`Cannot pull ${target.name}; no valid tile available.`);
            }
    
            // If the target was pulled for fewer squares than the pull distance, it suffers 1 damage
            if (actualPullDistance < pullDistance) {
                console.log(`${target.name} suffers 1 damage due to being stopped by an unwalkable tile.`);
                target.takeDamage(this.scene, 1, this, AttackType.MELEE, this.element, false);
                if (target instanceof Unit) {
                    this.scene.updateHealthBlocks(target);
                }
                this.isActionComplete = true;
            } else {
                console.log(`${target.name} is out of range.`);
                this.isActionComplete = true;
            }
        } 
    }
     // Expert PASSIVE I: Sidestep (implemented in a moveUnitToTile function)
     // CombatScene.moveUnitToTile


     // Expert PASSIVE II: Redirect
        // Deflects ranged attacks back at other adjacent creature.
        redirect(scene: CombatScene, attacker: Unit, isQuizActive: boolean, isUpgradeActive: boolean) {
            const adjacentUnits = scene.units.filter(
                target => scene.isAdjacent(this.position, target.position) && target !== this && !(target instanceof Unit && target.type === 'Expert')
            );
        
            if (adjacentUnits.length === 0) {
                console.log(`${this.type} cannot redirect; no adjacent units available.`);
                return false; // No redirection possible
            }
        
            // Prioritize hostile units for redirection
            const target = adjacentUnits.find(unit => unit.faction !== this.faction) || adjacentUnits[0];
        
            console.log(`${this.type} redirects attack from ${attacker.type} to ${target.type}.`);
        
            // Apply the attack to the redirected target
            target.takeDamage(scene, 1, attacker, AttackType.RANGED, attacker.element, false);
            scene.updateHealthBlocks(target);
        
            // Optional: Apply Exposed condition if upgraded
            if (isUpgradeActive && target.faction !== this.faction) {
                console.log(`${target.type} gains Exposed condition from redirect!`);
                target.conditions.push('Exposed');
            }
        
            return true; // Redirection successful
        }
        
     



    ///////////////////////////////////////////////////////////////////////////////////
    // TRAPPER LOGIC
    ///////////////////////////////////////////////////////////////////////////////////

    // Trapper CLASS ABILITY: Disarm/Set Trap
    setTrap(scene: CombatScene, trapTile: Tile, isQuizActive: boolean, isUpgradeActive: boolean, isQuizCorrect: boolean) {
        if (trapTile.isWalkable && scene.isAdjacent(trapTile, this.position)) {
            console.log(`${this.name} sets a trap at (${trapTile.gridX}, ${trapTile.gridY})`);
    
            // Mark the tile as trapped
            trapTile.isTrapped = true;
            trapTile.trapOwner = this;
    
            // Adjust trap properties based on upgrades
            trapTile.trapDamage = 1; // Default damage
            trapTile.setTrapVisual(this.faction); // Set the visual indicator
            if (isQuizActive === true) {
                trapTile.isFriendlySafe = false;
                if(isQuizCorrect === true)
                    trapTile.isFriendlySafe = true; // Friendly units don’t trigger traps
                    trapTile.trapConditions = ['Crippled']; // Add Crippled condition
            }
    
            // Decrement trap usage limit
            this.remainingTraps -= 1;
            console.log(`${this.name} has ${this.remainingTraps} traps left.`);
            this.isActionComplete = true;
        } else {
            this.isActionComplete = false;
            console.log(`Cannot place trap on (${trapTile.gridX}, ${trapTile.gridY}); tile is invalid.`);
        }
    }
    
    disarmTrap(scene: CombatScene, trapTile: Tile) {
        if (trapTile.isTrapped && scene.isAdjacent(trapTile, this.position)) {
            console.log(`${this.name} disarms a trap at (${trapTile.gridX}, ${trapTile.gridY})`);
    
            // Remove the trap
            trapTile.isTrapped = false;
            trapTile.trapOwner = null;
            console.log('Trap disarmed!');
            trapTile.clearTrapVisual();
        } else {
            console.log(`No trap to disarm at (${trapTile.gridX}, ${trapTile.gridY}).`);
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////////////
    // HEALER LOGIC
    ///////////////////////////////////////////////////////////////////////////////////

    // Healer CLASS ABILITY: Heal
    heal(scene: CombatScene, target: Unit, isQuizActive: boolean, isUpgradeActive: boolean, isQuizCorrect: boolean) {
        let healAmount = 1; // Base heal amount
        if (isQuizActive) {
            if (isQuizCorrect) {
                healAmount = Phaser.Math.Between(1, 2); // Quiz potentially doubles the healing
                target.hp = Math.min(target.maxHp, target.hp + healAmount); // Heal, but don't exceed max HP
                console.log(`${this.name} heals ${target.name} for ${healAmount} HB`);
                if (isUpgradeActive) {
                    target.grantTemporaryHealth(1); // Upgrade adds 1 temp HP
                }
            }
            else{
                console.log(`${this.name} attempts to use Heal but fails the quiz !`);
            }
        }
        else{
            healAmount = 2; // Quiz doubles the healing
            target.hp = Math.min(target.maxHp, target.hp + healAmount); // Heal, but don't exceed max HP
            console.log(`${this.name} heals ${target.name} for ${healAmount} HB`);
            if (isUpgradeActive) {
                target.grantTemporaryHealth(1); // Upgrade adds 1 temp HP
            }
        }
        
        this.scene.updateHealthBlocks(target); // Update health blocks
        this.isActionComplete = true; // Mark the action as complete to properly end the turn afterwards
    }
    
    // Healer Passive I: Absolution | Protects an ally from dying and takes 1 NEUTRAL damage oneself.
    absolution(scene: CombatScene, target: Unit, damage: number) {
        const isAdjacent = scene.isAdjacent(this.position, target.position);
        if (isAdjacent && target.hp - damage <= 0 && target.faction === this.faction) {
            console.log(`${this.name} uses Absolution to save ${target.name}!`);
            target.hp = 1; // Prevent the ally from falling unconscious
            this.takeDamage(scene, 1, target, AttackType.MELEE, AttackElement.NEUTRAL, this.isUpgraded); // Healer suffers 1 damage
            scene.updateHealthBlocks(target);
            scene.updateHealthBlocks(this);
            return true; // Damage redirected
        }
        return false; // Absolution not triggered
    }
    
    // Healer Passive II: Patronage | Becomes non-targetable if adjacent to an allied Defender
    

    
}
