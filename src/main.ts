import Phaser from "phaser";
import Level from "./scenes/Level";
import Preload from "./scenes/Preload";
import CombatScene from "./scenes/CombatScene";
import CombatUI from "./scenes/CombatUI";

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
		scene: [Boot, Preload, CombatUI, CombatScene, ]
	});

	game.scene.start("Boot");
});