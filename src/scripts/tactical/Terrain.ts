// Import the Combat Grid Tile configuration.
import { Tile } from './Tile';
import { Unit } from './Unit';
import { AttackType, AttackElement } from './Unit'; // Import the AttackType and AttackElement enums
import CombatScene from '../../scenes/CombatScene'; // Adjust the path as needed
import * as GVC from '../../GlobalVariablesCombat';

export enum TerrainType {
    // Default Terrain
        NORMAL,
    // Traps
        PIT,
    // Elemental Hazards
        LAVA, // Fire
        MUD, // Earth
        WATER, // Water
    // Scenic Props
        BARREL, // Standard Barrel
        BARREL_EX // Explosive Barrel
    }

    

export class Terrain {
    hp: number;
    maxHp: number;
    name: string;
    type: TerrainType;
    position: Tile;
    sprite: Phaser.GameObjects.Image;
    isDestructible: boolean; // Marks if this terrain can be targeted
    scene: CombatScene; // Reference to the CombatScene
    movable: boolean; // Marks if this terrain can be moved
    targetingHoverSprite: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, name: string, type: TerrainType, hp: number, position: Tile, spriteKey: string, isDestructible: boolean, movable: boolean) {
        this.scene = scene as CombatScene;
        this.name = name;
        this.type = type; // Assign the type directly as a TerrainType
        this.hp = hp;
        this.maxHp = hp;
        this.position = position;
        this.position.isWalkable = false; // Mark the tile as occupied
        this.isDestructible = isDestructible;
        this.movable = movable;

        // Calculate the position based on grid coordinates
        const x = position.x;
        const y = position.y;

        this.sprite = scene.add.image(
            x + GVC.CELL_SIZE / 2,
            y + GVC.CELL_SIZE / 2,
            spriteKey
        ).setDepth(0);

        // Scale the sprite to fit perfectly within the grid cell
        this.sprite.setDisplaySize(GVC.CELL_SIZE, GVC.CELL_SIZE);

        // Get original Terrain dimensions and calculate scale
        const frame = scene.textures.getFrame(spriteKey); // Fetch the texture frame
        if (frame) {
            const originalWidth = frame.width;
            const originalHeight = frame.height;

            // Scale uniformly to fit within the grid tile
            const scaleFactor = GVC.CELL_SIZE / Math.max(originalWidth, originalHeight);
            this.sprite.setScale(scaleFactor);

        } else {
            console.warn(`Texture frame for ${spriteKey} not found.`);
        }

        // Set the terrain reference in the tile
        position.terrain = this;

        // Modify the tile's walkability based on terrain type
        if (this.type === TerrainType.PIT) {
            position.isWalkable = false; // Pits are not walkable
        }
        if (this.type === TerrainType.LAVA) {
            position.isWalkable = false; // Lava is not walkable
            position.isHazard = true; // Mark as hazard
        }
        if (!scene.textures.exists(spriteKey)) {
            console.warn(`Texture ${spriteKey} not found. Tinting may not apply.`);
            return;
        }        
        // Apply tint based on terrain type
            this.applyTint();

        // Create targeting hover sprite (initially invisible) - scaled to 75% of cell size
        this.targetingHoverSprite = scene.add.sprite(
            this.sprite.x,
            this.sprite.y,
            'UI_Target_R'
        ).setVisible(false)
         .setDepth(3)
         .setDisplaySize(GVC.CELL_SIZE * 1.25, GVC.CELL_SIZE * 1.25);

        // Set up hover events for targeting
        this.sprite.setInteractive();
        this.sprite.on('pointerover', () => this.onTargetHover());
        this.sprite.on('pointerout', () => this.onTargetHoverOut());
}

    

    applyTint(){
        // Apply tint based on terrain type
        if (this.type === TerrainType.PIT) {
            this.sprite.setTint(0x000000); // Pits are dark
            console.log(`Applying tint for ${this.name} (${this.type}):`, this.sprite.tint)
        } else if (this.type === TerrainType.LAVA) {
            this.sprite.setTint(0xff4500); // Lava is bright red-orange
            console.log(`Applying tint for ${this.name} (${this.type}):`, this.sprite.tint)
        } else if (this.type === TerrainType.MUD) {
            this.sprite.setTint(0x8b4513); // Mud is brown
            console.log(`Applying tint for ${this.name} (${this.type}):`, this.sprite.tint)
        } else if (this.type === TerrainType.BARREL_EX) {
            this.sprite.setTint(0x03fc77); // Explosive barrels are green
            console.log(`Applying tint for ${this.name} (${this.type}):`, this.sprite.tint)
        } else if (this.type === TerrainType.BARREL) {
            this.sprite.setTint(0xffa500); // Standard barrels are orange
            console.log(`Applying tint for ${this.name} (${this.type}):`, this.sprite.tint)
        }
    }
    

    onTargetHover() {
        // Check if the sprite has a red or green tint
        let hasRedTint = (this.sprite.tintTopLeft & 0xff0000) === 0xff0000;
        let hasGreenTint = (this.sprite.tintTopLeft & 0x00ff00) === 0x00ff00;

        if (hasRedTint) {
            this.targetingHoverSprite.setTexture('UI_Target_R');
            this.targetingHoverSprite.setVisible(true);
        } else if (hasGreenTint) {
            this.targetingHoverSprite.setTexture('UI_Target_G');
            this.targetingHoverSprite.setVisible(true);
        }
    }

    onTargetHoverOut() {
        this.targetingHoverSprite.setVisible(false);
    }

    takeDamage(scene: Phaser.Scene, damage: number) {
        this.hp = Math.max(0, this.hp - damage);
        console.log(`${this.name} terrain takes ${damage} damage! Remaining HP: ${this.hp}`);

        if (this.hp <= 0) {
            if (this.type === TerrainType.BARREL_EX) {
                console.log(`Barrel explodes, dealing area damage!`);
                const neighbors = (this.position.scene as CombatScene).getTileNeighbors(this.position);
            
                neighbors.forEach((tile: Tile) => {
                    // Check if a unit is present on the tile
                    const unitOnTile = (this.position.scene as CombatScene).units.find(unit => unit.position === tile);

                    if (unitOnTile) {
                        console.log(`${unitOnTile.name} takes damage from the barrel explosion!`);
                        unitOnTile.takeDamage(scene as CombatScene, 2 /*damage*/, unitOnTile /*attacker*/, AttackType.TERRAIN, AttackElement.FIRE , false /*isUpgradeActive*/); // Apply damage to the unit
                        (this.position.scene as CombatScene).updateHealthBlocks(unitOnTile); // Update HP blocks
                    }
                });
            }
            console.log(`${this.name} is destroyed!`);
            this.targetingHoverSprite.destroy(); // Only destroy the hover sprite when terrain is destroyed
            this.sprite.destroy();
            this.position.isWalkable = true; // Free up the tile
            this.position.terrain = null; // Remove terrain from the tile

            // Remove the terrain from the scene's terrains array
            const combatScene = this.position.scene as CombatScene;
            combatScene.terrains = combatScene.terrains.filter(t => t !== this);
        }
    }
    
}

