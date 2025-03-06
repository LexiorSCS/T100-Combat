// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
import CombatScene from './CombatScene';
/* END-USER-IMPORTS */

export default class CS_Biome01_StraightRoad extends Phaser.Scene {

	constructor() {
		super("CS_Biome01_StraightRoad");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// m_CS_B01_StraightR02
		const m_CS_B01_StraightR02 = this.add.tilemap("m_CS_B01_StraightR02");
		m_CS_B01_StraightR02.addTilesetImage("Farm00Field", "Tileset_Field");
		m_CS_B01_StraightR02.addTilesetImage("ts_Farm01Crops", "Tileset_Farm");

		// ground
		m_CS_B01_StraightR02.createLayer("Ground00", ["Farm00Field"], -58, -23);

		// crops
		m_CS_B01_StraightR02.createLayer("Crops00", ["ts_Farm01Crops"], -58, -23);

		this.m_CS_B01_StraightR02 = m_CS_B01_StraightR02;

		this.events.emit("scene-awake");
	}

	public m_CS_B01_StraightR02!: Phaser.Tilemaps.Tilemap;

	/* START-USER-CODE */

	// Write your code here

	preload() {
		this.load.pack("mapPack", "assets/maps/mapPack_CS.json");
		this.load.pack("asset-tileset-pack","assets/asset-tileset-pack.json");
	}

	create() {
		this.editorCreate();
		
		// Use the existing tilemap reference instead of creating a new one
		const map = this.m_CS_B01_StraightR02;
		
		// Add debug to see available layers
		console.log("Available layers:", map.layers.map(layer => layer.name));
		
		// Get the layer objects directly
		const groundLayer = map.layers.find(layer => layer.name === "Ground00");
		const cropsLayer = map.layers.find(layer => layer.name === "Crops00");
		
		// Debug what we found
		console.log("Ground layer found:", !!groundLayer);
		console.log("Crops layer found:", !!cropsLayer);
		
		if (!groundLayer || !cropsLayer) {
			console.error("Error: Missing layers in the imported map!");
			return;
		}
		
		// Use the tilemap layers for processing
		const CombatScene = this.scene.get("CombatScene") as CombatScene;
		CombatScene.processWalkability(map, 
			map.layers[map.getLayerIndex("Crops00")].tilemapLayer, 
			map.layers[map.getLayerIndex("Ground00")].tilemapLayer);

	/* END-USER-CODE */
	}
}
/* END OF COMPILED CODE */

// You can write more code here
