import { Unit } from './Unit';
import { Terrain } from './Terrain';
import CombatScene from '../../scenes/CombatScene';

/**
 * A global manager to handle all hover states and targeting highlighting
 * This centralizes control to avoid state conflicts between different systems
 */
export class HoverManager {
    private static _instance: HoverManager;
    private scene: CombatScene;
    private activeTargets: Set<Unit | Terrain> = new Set();
    private lastHoveredTarget: Unit | Terrain | null = null;
    private debug: boolean = true;

    private constructor(scene: CombatScene) {
        this.scene = scene;
        this.log("HoverManager initialized");
    }

    static getInstance(scene?: CombatScene): HoverManager {
        if (!HoverManager._instance && scene) {
            HoverManager._instance = new HoverManager(scene);
        }
        return HoverManager._instance;
    }

    /**
     * Setup hover listeners for a target
     */
    enableTargetHover(target: Unit | Terrain, tint: number = 0xff0000): void {
        this.log(`Enabling hover for ${target instanceof Unit ? target.name : 'terrain'}`);
        
        // Make sure the target has the necessary properties
        if (!target.sprite || !target.targetingHoverSprite) {
            this.log(`ERROR: Target missing required properties!`);
            return;
        }
        
        // Set tint on sprite and make it interactive
        target.sprite.clearTint();
        target.sprite.setTint(tint);
        target.sprite.setInteractive();
        
        // Remove any existing listeners to prevent duplicates
        target.sprite.removeAllListeners('pointerover');
        target.sprite.removeAllListeners('pointerout');
        
        // Add hover event listeners
        target.sprite.on('pointerover', () => {
            this.onTargetHover(target, tint);
        });
        
        target.sprite.on('pointerout', () => {
            this.onTargetHoverOut(target);
        });
        
        // Track active targets
        this.activeTargets.add(target);
    }

    /**
     * Handle when a target is hovered over
     */
    private onTargetHover(target: Unit | Terrain, tint: number): void {
        this.log(`Hover START: ${target instanceof Unit ? target.name : 'terrain'}`);
        
        // Show appropriate hover sprite based on tint
        target.targetingHoverSprite.setVisible(true);
        if (tint === 0xff0000) { // Red tint
            target.targetingHoverSprite.setTexture('UI_Target_R');
        } else if (tint === 0x00ff00) { // Green tint
            target.targetingHoverSprite.setTexture('UI_Target_G'); 
        }
        
        this.lastHoveredTarget = target;
    }

    /**
     * Handle when hover leaves a target
     */
    private onTargetHoverOut(target: Unit | Terrain): void {
        this.log(`Hover END: ${target instanceof Unit ? target.name : 'terrain'}`);
        target.targetingHoverSprite.setVisible(false);
        if (this.lastHoveredTarget === target) {
            this.lastHoveredTarget = null;
        }
    }

    /**
     * Add click handler to target
     */
    setupClickHandler(target: Unit | Terrain, onClick: () => void): void {
        // Remove any existing click handlers
        target.sprite.removeAllListeners('pointerdown');
        
        // Add new click handler that preserves hover functionality
        target.sprite.on('pointerdown', () => {
            this.log(`Click on ${target instanceof Unit ? target.name : 'terrain'}`);
            onClick();
        });
    }

    /**
     * Clear all hover states
     */
    clearAllTargetHovers(): void {
        this.log("Clearing all hover states");
        this.activeTargets.forEach(target => {
            target.targetingHoverSprite.setVisible(false);
            if (target.sprite.input) {
                target.sprite.removeAllListeners('pointerover');
                target.sprite.removeAllListeners('pointerout');
                target.sprite.removeAllListeners('pointerdown');
            }
        });
        
        this.activeTargets.clear();
        this.lastHoveredTarget = null;
    }

    /**
     * Force refresh all hover states
     */
    refreshAllTargetHovers(): void {
        this.log("Refreshing all hover states");
        const currentTargets = Array.from(this.activeTargets);
        this.clearAllTargetHovers();
        
        // Re-enable hovering for all previously active targets
        currentTargets.forEach(target => {
            this.enableTargetHover(target);
        });
    }

    /**
     * Debug logging
     */
    private log(message: string): void {
        if (this.debug) {
            console.log(`[HoverManager] ${message}`);
        }
    }
}
