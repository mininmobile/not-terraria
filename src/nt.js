const simplex = new SimplexNoise("seed");

class Block {
	constructor(r = 250, g = 250, b = 250, a = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	toString() {
		return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
	}
}

// settings
let blocks = {
	// other blocks
	air: new Block(22, 22, 33),
	// terrain
	grass: new Block(0, 200, 0),
	dirt: new Block(100, 50, 15),
	stone: new Block(66, 66, 66),
	// ores
	coal: new Block(40, 40, 40),
	iron: new Block(235, 235, 235),
	gold: new Block(230, 200, 50),
}

let ores = [
	// rarities are not final
	{ rarity: 0.1, block: blocks.coal },
	{ rarity: 0.1, block: blocks.iron },
	{ rarity: 0.1, block: blocks.gold },
]

let layers = [
	// layers are not final
	{ thickness: 4, block: blocks.dirt },
	{ thickness: -1, block: blocks.stone },
]

let speed = 10;

// temp
let xoffset = 0;
let yoffset = 0;
let xdirection = 0; // -1 left, 1 right
let ydirection = 0; // -1 up, 1 down
let buffer;

// dimensions
const scale = 20;
const width = grid(document.body.clientWidth, scale);
const height = grid(document.body.clientHeight, scale);
const mapWidth = (width / scale) * 10;
const mapHeight = (height / scale) * 10;
const mapSurfaceHeight = height / scale;

// initialize display
let c = document.createElement("canvas");
document.body.appendChild(c);
c.width = width;
c.height = height;

let ctx = c.getContext("2d");
ctx.lineWidth = 2;
ctx.font = "1em Arial";

// "controls"
xoffset = width * 5;
yoffset = 0;

document.addEventListener("keydown", (e) => {
	switch (e.code) {
		case "KeyW": ydirection = -1; break;
		case "KeyA": xdirection = -1; break;
		case "KeyS": ydirection = 1; break;
		case "KeyD": xdirection = 1; break;
	}
});
document.addEventListener("keyup", (e) => {
	switch (e.code) {
		case "KeyW": case "KeyS": ydirection = 0; break;
		case "KeyA": case "KeyD": xdirection = 0; break;
	}
});

// generate terrain
let terrain = generate(mapWidth, mapHeight, mapSurfaceHeight);
buffer = Array.from({ length: mapHeight + mapSurfaceHeight }, () => Array.from({ length: mapWidth }, () => blocks.air));

drawMap(true);

(function render() {
	window.requestAnimationFrame(render);

	xoffset += xdirection * speed;
	yoffset += ydirection * speed;

	drawMap();
})();

function drawMap(override = false) {
	for (let i = grid(yoffset, scale) / scale; i < height / scale + grid(yoffset, scale) / scale + scale; i++) {
		if (terrain[i]) for (let j = grid(xoffset, scale) / scale; j < width / scale + grid(xoffset, scale) / scale + scale; j++) {
			if (terrain[i][j]) {
				let point = terrain[i][j];
				let bpoint = buffer[i][j];

				if (point != bpoint || override) {
					let x = grid(j * scale, scale) - xoffset;
					let y = grid(i * scale, scale) - yoffset;

					ctx.fillStyle = point.toString();
					ctx.fillRect(x, y, scale, scale);

					buffer[i][j] = point;
				}
			}
		}
	}
}

function generate(w, h, sh) {
	// initialize

	ores.forEach((ore, i) => {
		ores[i].offset = Math.random() * 69420212102496;
	});

	// generate surface + fill height

	let surface = [];

	for (let i = 0; i < width; i++) {
		let point = (simplex.noise2D(i / 100, 0) + 1) / 2;
		let point2 = (simplex.noise2D(i / 10, 0) + 1) / 2
		
		surface.push((point + point2 * 0.05) / 1.05);
	}

	let terrain = Array.from({ length: h }, () => Array.from({ length: w }, () => blocks.air));
	
	for (let i = 0; i < h; i++) {
		for (let j = 0; j < w; j++) {
			let cp = grid(height - surface[j] * height, scale);

			if (cp == i * scale || cp < i * scale) {
				terrain[i][j] = layers[layers.length - 1].block;
			}
		}
	}

	// generate caves + ores

	for (let i = 0; i < h; i++) {
		for (let j = 0; j < w; j++) {
			let point = (simplex.noise2D(j / 100, i / 100) + 1) / 2;
			let point2 = (simplex.noise2D(j / 10, i / 10) + 1) / 2

			if ((point + point2 * 0.05) / 1.05 > 0.8) {
				terrain[i][j] = blocks.air;
			} else {
				if (terrain[i][j] == layers[layers.length - 1].block) {
					ores.forEach((ore) => {
						let opoint = (simplex.noise3D(j / 100, i / 100, ore.offset) + 1) / 2;
						let opoint2 = (simplex.noise3D(j / 10, i / 10, ore.offset) + 1) / 2

						if ((opoint + opoint2 * 0.05) / 1.05 < ore.rarity) {
							terrain[i][j] = ore.block;
						}
					});
				}
			}
		}
	}

	// add grass and shit

	for (let i = 0; i < sh; i++) {
		for (let j = 0; j < w; j++) {
			let isNotCovered = false;
			let isOnRock = terrain[i][j] == layers[layers.length - 1].block;

			if (terrain[i - 1])
				isNotCovered = terrain[i - 1][j] == blocks.air;

			if (isNotCovered && isOnRock) {
				terrain[i][j] = blocks.grass;

				let skip = 0;

				for (let depth = 0; depth < layers.length - 1; depth++) {
					let layer = layers[depth];

					let oof = false;

					let s = skip;
					for (let l = skip; l < s + layer.thickness; l++) {
						if (terrain[i + l + 1] && terrain[i + l + 1][j] == layers[layers.length - 1].block) {
							terrain[i + l + 1][j] = layer.block;
							skip++;
						} else {
							oof = true;
							break;
						}
					}

					if (oof)
						break;
				}
			}
		}
	}

	return terrain;
}

function grid(x, size) {
	return size * Math.floor(x / size);
}
