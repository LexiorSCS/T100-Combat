
// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class CS_Tutorial extends Phaser.Scene {

	constructor() {
		super("CS_Tutorial");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// FarmTileset
		this.cache.tilemap.add("FarmTileset_64ce16be-67f4-48cb-adb3-e85bba250e9c", {
			format: 1,
			data: {
				width: 12,
				height: 7,
				orientation: "orthogonal",
				tilewidth: 116,
				tileheight: 116,
				tilesets: [
					{
						columns: 8,
						margin: 0,
						spacing: 0,
						tilewidth: 116,
						tileheight: 116,
						tilecount: 64,
						firstgid: 1,
						image: "Tileset_Field",
						name: "Tileset_Field",
						imagewidth: 928,
						imageheight: 928,
					},
					{
						columns: 5,
						margin: 0,
						spacing: 0,
						tilewidth: 116,
						tileheight: 116,
						tilecount: 20,
						firstgid: 65,
						image: "Tileset_Farm",
						name: "Tileset_Farm",
						imagewidth: 580,
						imageheight: 464,
					},
				],
				layers: [
					{
						type: "tilelayer",
						name: "ground",
						width: 12,
						height: 7,
						opacity: 1,
						data: [38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 35, 36, 35, 36, 35, 36, 35, 36, 35, 35, 36, 35, 11, 27, 11, 11, 27, 11, 27, 11, 27, 11, 27, 27, 23, 3, 23, 3, 3, 3, 64, 3, 3, 23, 3, 3, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38],
					},
					{
						type: "tilelayer",
						name: "ground2",
						width: 12,
						height: 7,
						opacity: 1,
						data: [75, 76, 82, 83, 0, 0, 80, 82, 83, 0, 0, 74, 80, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0, 0, 0, 0, 0, 0, 0, 65, 67, 66, 84],
					},
				],
			},
		});
		const farmTileset = this.add.tilemap("FarmTileset_64ce16be-67f4-48cb-adb3-e85bba250e9c");
		farmTileset.addTilesetImage("Tileset_Field");
		farmTileset.addTilesetImage("Tileset_Farm");

		// ground
		farmTileset.createLayer("ground", ["Tileset_Field"], -58, -22.5);

		// ground2
		farmTileset.createLayer("ground2", ["Tileset_Farm"], -58, -22.5);

		this.farmTileset = farmTileset;

		this.events.emit("scene-awake");
	}

	private farmTileset!: Phaser.Tilemaps.Tilemap;

	/* START-USER-CODE */

	// Write your code here

	preload() {

		this.load.pack("asset-tileset-pack","assets/asset-tileset-pack.json");
	}

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
