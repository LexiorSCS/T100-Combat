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
     sprite: Phaser.GameObjects.Image; // Keep this as Image
     container: Phaser.GameObjects.Container; // Add new container property
     spriteImage: Phaser.GameObjects.Image; // New property to hold the actual image
     splashArt: Phaser.GameObjects.Image; // Transparent silhouette of a character for close-ups and initiative
     portrait: Phaser.GameObjects.Image; // 300x300 portrait files for InitiativeUI
     faction: number;
     conditions: string[]; // Track active conditions like "Exposed" or "Crippled"
     remainingTraps: number = 2; // Default number of traps for the Trapper class per battle
     /////////////// Health Logic
     healthBlocks: Phaser.GameObjects.Rectangle[] = []; // Array to hold health block rectangles
     tempHealthBlocks: Phaser.GameObjects.Rectangle[] = []; // Array of TEMPORARY health block rectangles
     healthContainer: Phaser.GameObjects.Container | null = null; // Add new property for health container
     /////////////// Action Economy Logic
     movementPoints: number; // Number of movement points the unit has currently for disposal; also starting amount of movement points (default: 0)
     movementGen: number; // Number of points for movement actions generated per turn (default: 1)
     movementCap: number // Maximum amount of movement points to be accumulated by a unit (default: 2)
     /////////////// Turn Logic
     initiative: number = 0; // Default to 0; As combat starts: 1d10 + dexterity  
     turn: number = 0; // Turn counter for the unit
     isActionComplete: boolean = false; // Flag to track if the unit has completed its action
     /////////////// Advancement Logic (Character tiers & additional skills)
     tier: UnitTier;
     isUpgraded: boolean; // Checks if a character is of A+ tier, therefore has better version of its abilities
     targetingHoverSprite: Phaser.GameObjects.Sprite;


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
        position.unit = this; // Assign the unit to the tile
        this.position.isWalkable = false; // Mark the tile as occupied
        this.faction = faction;
        this.conditions = []; // Start with no conditions
        this.remainingTraps = 2;
        this.movementPoints = 5; // Default starting movement points
        this.movementGen = 1; // Default movement points generated per turn
        this.movementCap = 5; // Default maximum movement points
        this.tier = tier;
        this.isUpgraded = this.tier === UnitTier.A || this.tier === UnitTier.S; 

        // Create the container first and set its depth
        this.container = scene.add.container(
            position.x + position.width / 2,
            position.y + position.height / 2
        ).setDepth(1); // Base depth for unit container

        // Create the sprite and add it to the container
        this.sprite = scene.add.image(0, 0, spriteKey);
        this.sprite.setDepth(0); // Relative to container
        this.container.add(this.sprite);

        // Create health container as a child of the main container at a higher depth
        this.healthContainer = scene.add.container(0, 64);
        this.healthContainer.setDepth(2); // Health blocks appear above sprite
        this.container.add(this.healthContainer);

        // Set the main container's depth
        this.container.setDepth(1);

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
            this.container.setPosition(
                position.x + (GVC.CELL_SIZE - originalWidth * scaleFactor) / 2 + GVC.CELL_SIZE / 2,
                position.y + (GVC.CELL_SIZE - originalHeight * scaleFactor) / 2 + GVC.CELL_SIZE / 2
            );
        } else {
            console.warn(`Unable to scale sprite: ${spriteKey}. Frame not found.`);
        }

        // Create targeting hover sprite with highest depth
        this.targetingHoverSprite = scene.add.sprite(
            this.container.x,
            this.container.y,
            'UI_Target_R'
        ).setVisible(false)
         .setDepth(10) // Ensure hover effect is always on top
         .setDisplaySize(GVC.CELL_SIZE * 1.15, GVC.CELL_SIZE * 1.15);

        // Set up hover events for targeting
        this.sprite.setInteractive();
        this.sprite.on('pointerover', () => this.onTargetHover());
        this.sprite.on('pointerout', () => this.onTargetHoverOut());
    }

    onTargetHover() {
        if (this.sprite.tintTopLeft === 0xff0000) {  // Red tint
            this.targetingHoverSprite.setTexture('UI_Target_R');
            this.targetingHoverSprite.setVisible(true);
        } else if (this.sprite.tintTopLeft === 0x00ff00) {  // Green tint
            this.targetingHoverSprite.setTexture('UI_Target_G');
            this.targetingHoverSprite.setVisible(true);
        }
    }

    onTargetHoverOut() {
        this.targetingHoverSprite.setVisible(false);
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
        // Store references to previous and new tiles
        const prevTile = this.position;
        this.position = tile;
        
        // Update tile states
        prevTile.unit = null;
        prevTile.isWalkable = true;
        tile.isWalkable = false;
        tile.unit = this;
    
        // Calculate target position
        const targetX = tile.x + tile.width / 2;
        const targetY = tile.y + tile.height / 2;
    
        // Create a tween for smooth movement (health blocks will move automatically as children)
        this.scene.tweens.add({
            targets: this.container,
            x: targetX,
            y: targetY,
            duration: 200, // Duration in milliseconds
            ease: 'Power2',
            onComplete: () => {
                console.log(`${this.name} moved to (${tile.gridX}, ${tile.gridY})`);
            }
        });
    
        // Update targeting hover sprite position
        this.targetingHoverSprite.setPosition(targetX, targetY);
    
        // Emit position update event
        const combatUI = this.scene.scene.get('CombatUI');
        combatUI.events.emit('updateUnitPosition', this);
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
    
    push(scene: CombatScene, target: Unit | Terrain, attacker: Unit, pushDistance: number) {
        // Save the target's original tile
        const oldTile = target.position;
        console.log(`Original tile of ${target.name}: (${oldTile.gridX}, ${oldTile.gridY})`);
    
        const dx = target.position.gridX - this.position.gridX;
        const dy = target.position.gridY - this.position.gridY;
        const stepX = Math.sign(dx); // Determine the direction of the push (X-axis)
        const stepY = Math.sign(dy); // Determine the direction of the push (Y-axis)
    
        let newGridX = target.position.gridX;
        let newGridY = target.position.gridY;
        let pushed = false;
        let actualPushDistance = 0;
    
        for (let i = 1; i <= pushDistance; i++) {
            newGridX += stepX;
            newGridY += stepY;
            let newTile = scene.grid[newGridY]?.[newGridX];
    
            if (newTile && newTile.isWalkable) {
                if (target instanceof Unit) {
                    target.moveTo(newTile);
                    scene.updateHealthBlocks(target);
                } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                    target.moveTo(newTile); // Use the new moveTo method
                }
                newTile.triggerTrap(target); // Trigger trap if present
                pushed = true;
                this.isActionComplete = true;
                actualPushDistance = i;
            } // Check if the new position would be outside the grid 
            else if (newGridX < 0 || newGridX >= scene.grid[0].length || 
                newGridY < 0 || newGridY >= scene.grid.length) {
                console.log(`${target.name} is pushed out of bounds and takes collision damage!`);
                if (target instanceof Unit) {
                    target.takeDamage(scene, 1, attacker, AttackType.MELEE, AttackElement.NEUTRAL, false);
                    scene.updateHealthBlocks(target);
                } else if (target instanceof Terrain) {
                    target.takeDamage(scene, 1);
                }
                break;
            } 
            else if (newTile && newTile.unit) {
                const tUnit = newTile.unit; // Correctly reference the unit on the tile
                console.log(`${attacker.name} pushes ${target.name} into ${tUnit.name}`);
                scene.handleCollision(target, tUnit, attacker); // Pass the attacker to handleCollision
                if (tUnit.hp <= 0 && target.hp > 0) {
                    if (target instanceof Unit) {
                        target.moveTo(newTile);
                        console.log(`${target.name} moves along due to barging through defeated ${tUnit.name}!`);
                        scene.updateHealthBlocks(target);
                    } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                        target.position.isWalkable = true; // Free the current tile
                        target.position.terrain = null; // Remove terrain from tile
                        target.position = newTile;
                        target.position.terrain = target; // Assign terrain to new tile
                        newTile.isWalkable = false; // Occupy the new tile
                        target.sprite.setPosition(
                            newTile.x + newTile.width / 2,
                            newTile.y + newTile.height / 2
                        );
                    }
                    newTile.triggerTrap(target); // Trigger trap if present
                    pushed = true;
                    this.isActionComplete = true; // Mark the action as complete
                    actualPushDistance = i;
                } else {
                    break; // Stop if the unit is not destroyed
                }
            } else if (newTile && !newTile.isWalkable && newTile.terrain && newTile.terrain.isDestructible) {
                const terrain = newTile.terrain;
                console.log(`${attacker.name} pushes ${target.name} into destructible terrain ${terrain.name}`);
                scene.handleCollision(target, terrain, attacker); // Pass the attacker to handleCollision
                if (terrain.hp <= 0 && target.hp > 0) {
                    if (target instanceof Unit) {
                        target.moveTo(newTile);
                        console.log(`${target.name} moves along due to smashing through an obstacle!`);
                        scene.updateHealthBlocks(target);
                    } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                        target.position.isWalkable = true; // Free the current tile
                        target.position.terrain = null; // Remove terrain from tile
                        target.position = newTile;
                        target.position.terrain = target; // Assign terrain to new tile
                        newTile.isWalkable = false; // Occupy the new tile
                        target.sprite.setPosition(
                            newTile.x + newTile.width / 2,
                            newTile.y + newTile.height / 2
                        );
                    }
                    newTile.triggerTrap(target); // Trigger trap if present
                    pushed = true;
                    this.isActionComplete = true; // Mark the action as complete
                    actualPushDistance = i;
                } else {
                    // Ensure damage is dealt even if the terrain is not destroyed
                    scene.handleCollision(target, terrain, attacker);
                    break; // Stop if the terrain is not destroyed
                }
            } else {
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
                    console.log(`${target.name} is pushed into lava and will suffer damage at the start of their turn!`);
                    if (target instanceof Unit) {
                        target.moveTo(newTile); // Move the unit into the lava
                        scene.updateHealthBlocks(target);
                    } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                        target.position.isWalkable = true; // Free the current tile
                        target.position.terrain = null; // Remove terrain from tile
                        target.position = newTile;
                        newTile.isWalkable = false; // Occupy the new tile
                        target.sprite.setPosition(
                            newTile.x + newTile.width / 2,
                            newTile.y + newTile.height / 2
                        );
                        scene.scheduleLavaDestruction(target); // Schedule destruction in lava
                    }
                    return;
                } else {
                    break; // Stop pushing if the tile is not walkable and no hazard is present
                }
            }
        }
    
        // If target (a Unit) dies during the push, free its original tile.
        if (target instanceof Unit && target.hp <= 0) {
            console.log(`${target.name} died during the push. Freeing original tile.`);
            oldTile.isWalkable = true;
            if (oldTile.unit === target) {
                oldTile.unit = null;
            }
        }
    
        if (pushed) {
            console.log(`${this.name} pushes ${target.name} ${actualPushDistance} squares away.`);
        } else {
            console.log(`Cannot push ${target.name}; no valid tile available.`);
        }
    }
    
    
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
                    } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                        target.moveTo(newTile); // Use the new moveTo method
                    }
                    newTile.triggerTrap(target); // Trigger trap if present
                    pulled = true;
                    this.isActionComplete = true; // Mark the action as complete
                    actualPullDistance = i;
                } 
                // When target is pulled into an occupied tile (collision)
                else if (newTile && !newTile.isWalkable && newTile.unit) {
                    const collidingUnit = newTile.unit || newTile.terrain;
                    // Don't damage the Expert (puller) when something collides with them
                    if (collidingUnit !== this) {
                        console.log(`${target.name} collides with ${collidingUnit.name}`);
                        // Apply collision damage to the target
                        if (target instanceof Unit) {
                            target.takeDamage(scene, 1, this, AttackType.MELEE, AttackElement.NEUTRAL, false);
                        } else if (target instanceof Terrain) {
                            target.takeDamage(scene, 1);
                        }
                        // Apply collision damage to the unit being collided with
                        if (collidingUnit instanceof Unit) {
                            collidingUnit.takeDamage(scene, 1, this, AttackType.MELEE, AttackElement.NEUTRAL, false);
                            scene.updateHealthBlocks(collidingUnit);
                        }
                        break; // Stop pulling after collision
                    }
                } 
                // Handle collision with destructible terrain
                else if (newTile && !newTile.isWalkable && newTile.terrain && newTile.terrain.isDestructible) {
                    const terrain = newTile.terrain;
                    console.log(`${this.name} pulls ${target.name} into destructible terrain ${terrain.name}`);
                    scene.handleCollision(target, terrain, this); // Pass the attacker to handleCollision
                    if (terrain.hp <= 0 && target.hp > 0) {
                        if (target instanceof Unit) {
                            target.moveTo(newTile);
                            console.log(`${target.name} moves along due to smashing through an obstacle!`);
                            scene.updateHealthBlocks(target);
                        } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                            target.position.isWalkable = true; // Free the current tile
                            target.position.terrain = null; // Remove terrain from tile
                            target.position = newTile;
                            target.position.terrain = target; // Assign terrain to new tile
                            newTile.isWalkable = false; // Occupy the new tile
                            target.sprite.setPosition(
                                newTile.x + newTile.width / 2,
                                newTile.y + newTile.height / 2
                            );
                        }
                        newTile.triggerTrap(target); // Trigger trap if present
                        pulled = true;
                        this.isActionComplete = true; // Mark the action as complete
                        actualPullDistance = i;
                    } else {
                        break; // Stop if the terrain is not destroyed
                    }
                } 
                // Handle collision with the puller
                else if (newTile && newTile === this.position) {
                    console.log(`${target.name} is pulled into ${this.name}'s space!`);
                    if (target instanceof Unit && target.faction !== this.faction) {
                        console.log(`Hostile ${target.name} pulled into ${this.name}'s space!`);
                        target.takeDamage(scene, 1, this, AttackType.MELEE, AttackElement.NEUTRAL, false);
                        scene.updateHealthBlocks(target);
                    }
                    break; // Stop pulling if the target collides with the puller
                } 
                // Handle other hazards
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
                        console.log(`${target.name} is pulled into lava and will suffer damage at the start of their turn!`);
                        if (target instanceof Unit) {
                            target.moveTo(newTile); // Move the unit into the lava
                            scene.updateHealthBlocks(target);
                        } else if (target instanceof Terrain && target.isDestructible && target.movable) {
                            target.position.isWalkable = true; // Free the current tile
                            target.position.terrain = null; // Remove terrain from tile
                            target.position = newTile;
                            newTile.isWalkable = false; // Occupy the new tile
                            target.sprite.setPosition(
                                newTile.x + newTile.width / 2,
                                newTile.y + newTile.height / 2
                            );
                            scene.scheduleLavaDestruction(target); // Schedule destruction in lava
                        }
                        return;
                    } else {
                        break; // Stop pulling if the tile is not walkable and no hazard is present
                    }
                }
            }
    
            if (pulled) {
                console.log(`${this.name} pulls ${target.name} ${actualPullDistance} squares towards them!`);
            } else {
                console.log(`Cannot pull ${target.name}; no valid tile available.`);
            }
    
            // If the target was pulled for fewer squares than the pull distance, it suffers 1 damage
            if (actualPullDistance < pullDistance && target instanceof Unit && this.faction !== target.faction) {
                console.log(`${target.name} suffers 1 damage due to being stopped by an unwalkable tile.`);
                target.takeDamage(this.scene, 1, this, AttackType.MELEE, this.element, false);
                this.scene.updateHealthBlocks(target);
                this.isActionComplete = true;
            } else {
                console.log(`${target.name} is out of range.`);
                this.isActionComplete = true;
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
        /*if (this.hp <= 0) {
            console.log(`${this.name} is defeated!`);
            // Remove the health blocks
            this.healthBlocks.forEach(block => block.destroy());
            this.tempHealthBlocks.forEach(block => block.destroy());
            // Clear the unit reference from the tile
            // Remove the defeated unit from the initiative tracker
            this.scene.removeUnit(this);
            this.targetingHoverSprite.destroy();
            this.sprite.destroy();
        }*/
       // Inside takeDamage method, in the if (this.hp <= 0) block:
// In the takeDamage method, just before removeUnit is called:
if (this.hp <= 0) {
    console.log(`${this.name} is defeated!`);
    // Remove the health blocks
    this.healthBlocks.forEach(block => block.destroy());
    this.tempHealthBlocks.forEach(block => block.destroy());
    
    // Clear the tile state before removing the unit
    if (this.position) {
        // Log tile state BEFORE changes
        console.log('Tile state BEFORE cleanup:', {
            isWalkable: this.position.isWalkable,
            unit: this.position.unit,
            terrain: this.position.terrain,
            isHazard: this.position.isHazard,
            coordinates: `(${this.position.gridX}, ${this.position.gridY})`
        });
        
        // Reset walkability and clear unit reference
        this.position.isWalkable = true;
        this.position.unit = null;
        
        // Log tile state AFTER changes
        console.log('Tile state AFTER cleanup:', {
            isWalkable: this.position.isWalkable,
            unit: this.position.unit,
            terrain: this.position.terrain,
            isHazard: this.position.isHazard,
            coordinates: `(${this.position.gridX}, ${this.position.gridY})`
        });
    }
    
    // Remove the defeated unit from the initiative tracker
    this.scene.removeUnit(this);
    this.targetingHoverSprite.destroy();
    this.sprite.destroy();
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
        const adjacentDefender = scene.units.find(
            unit => unit.type === 'Defender' && scene.isAdjacent(unit.position, this.position) && unit.faction === this.faction
        );

        const isTileValid = trapTile.isWalkable && !trapTile.isTrapped && (scene.isAdjacent(trapTile, this.position) || (adjacentDefender && scene.isAdjacent(trapTile, adjacentDefender.position)));

        if (isTileValid) {
            console.log(`${this.name} sets a trap at (${trapTile.gridX}, ${trapTile.gridY})`);

            // Mark the tile as trapped
            trapTile.isTrapped = true;
            trapTile.trapOwner = this;

            // Adjust trap properties based on upgrades
            trapTile.trapDamage = 1; // Default damage
            trapTile.setTrapVisual(this.faction); // Set the visual indicator
            if (isQuizActive === true) {
                trapTile.isFriendlySafe = false;
                if (isQuizCorrect === true)
                    trapTile.isFriendlySafe = true; // Friendly units don’t trigger traps
                trapTile.trapConditions = ['Crippled']; // Add Crippled condition
            }

            // Decrement trap usage limit
            this.remainingTraps -= 1;
            console.log(`${this.name} has ${this.remainingTraps} traps left.`);
            this.isActionComplete = true;
        } else {
            this.isActionComplete = false;
            console.log(`Cannot place trap on (${trapTile.gridX}, ${trapTile.gridY}); tile is invalid or already trapped.`);
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

    // Trapper's MELEE/RANGED Bash variant
    handleTrapperAttack(unit: Unit) {
        const isRanged = unit.role === 'Ranged';
        const range = isRanged ? 3 : 1; // Set range based on role

        const validTargets = this.scene.units.filter(target =>
            this.scene.getTilesInRange(unit.position.gridX, unit.position.gridY, range)
                .filter(tile => tile !== unit.position)
                .includes(target.position)
        );

        validTargets.forEach(target => {
            target.sprite.setTint(0xff0000); // Highlight in red
            target.sprite.setInteractive();
            target.sprite.once('pointerdown', () => {
                this.scene.clearAllInteractivity(); // Clear all interactivity before executing action
                this.scene.leaveModeTargeting();
                this.resolveTrapperAttack(unit, target, isRanged);
                this.scene.clearHighlights();
                this.scene.startNextTurn();
            });
        });
    }

    resolveTrapperAttack(trapper: Unit, target: Unit | Terrain, isRanged: boolean) {
        const adjacentDefender = this.scene.units.find(
            unit => unit.type === 'Defender' && this.scene.isAdjacent(unit.position, target.position)
        );

        if (isRanged) {
            console.log(`${trapper.name} shoots ${target.name}`);
            this.push(this.scene, target, trapper, 1); // Push the target 1 square away
        } else {
            console.log(`${trapper.name} strikes ${target.name}`);
            if (target instanceof Unit) {
                target.takeDamage(this.scene, 1, trapper, AttackType.MELEE, trapper.element, trapper.isUpgraded); // Deal melee damage
                if (adjacentDefender) {
                    console.log(`Defender supports the flanker! ${target.name} takes 1 additional damage.`);
                    target.takeDamage(this.scene, 1, trapper, AttackType.MELEE, trapper.element, trapper.isUpgraded);
                }
            }
        }

        if (target instanceof Unit) {
            this.scene.updateHealthBlocks(target);
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
