import Phaser from "phaser";
import Preload from "./scenes/Preload";
import CombatScene from "./scenes/CombatScene";
import CombatUI from "./scenes/CombatUI";
import CS_Tutorial from "./scenes/CS_Tutorial";
import CS_Biome01_StraightRoad from "./scenes/CS_Biome01_StraightRoad";

class Boot extends Phaser.Scene {

    constructor() {
        super("Boot");
    }

    preload() {

        this.load.pack("pack", "assets/preload-asset-pack.json");
    }

    create() {

       this.scene.start("Preload");
    }
}

window.addEventListener('load', function () {
	
	const game = new Phaser.Game({
		width: 1280,
		height: 760,
		backgroundColor: "#3b3b3b",
		parent: "game-container",
		scale: {
			mode: Phaser.Scale.ScaleModes.FIT,
			autoCenter: Phaser.Scale.Center.CENTER_BOTH
		},
		pixelArt: true, // Enable pixel art rendering
		scene: [Boot, Preload, CS_Tutorial, CS_Biome01_StraightRoad, CombatUI, CombatScene, ]
	});

	game.scene.start("Boot");
});