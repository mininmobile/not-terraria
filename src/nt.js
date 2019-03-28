const simplex = new SimplexNoise("seed");

// settings
let ores = [
	{ rarity: 0.1, id: 0.15 },
	{ rarity: 0.1, id: 0.075 },
	{ rarity: 0.1, id: 0.025 },
]

let layers = [
	{ thickness: 3, id: 0.75 },
	{ thickness: 5, id: 0.5 },
	{ thickness: -1, id: 0.25 },
]

let speed = 10;

// temp
let xoffset = 0;
let yoffset = 0;
let xdirection = 0; // -1 left, 1 right
let ydirection = 0; // -1 up, 1 down

// dimensions
const scale = 20;
const width = grid(document.body.clientWidth, scale);
const height = grid(document.body.clientHeight, scale);

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

// generate terrain
let terrain = generate((width / scale) * 10, (height / scale) * 10, height / scale);

document.addEventListener("keyup", (e) => {
	switch (e.code) {
		case "KeyW": case "KeyS": ydirection = 0; break;
		case "KeyA": case "KeyD": xdirection = 0; break;
	}
});

(function render() {
	window.requestAnimationFrame(render);

	xoffset += xdirection * speed;
	yoffset += ydirection * speed;

	ctx.fillStyle = "#161621";
	ctx.fillRect(0, 0, width, height);

	for (let i = grid(yoffset, scale) / scale; i < height / scale + grid(yoffset, scale) / scale + scale; i++) {
		if (terrain[i]) for (let j = grid(xoffset, scale) / scale; j < width / scale + grid(xoffset, scale) / scale + scale; j++) {
			if (terrain[i][j]) {
				let point = terrain[i][j];

				if (point > 0) {
					let x = grid(j * scale, scale) - xoffset;
					let y = grid(i * scale, scale) - yoffset;

					ctx.fillStyle = `rgba(250, 250, 250, ${point})`;
					ctx.fillRect(x, y, scale, scale);
				}
			}
		}
	}
})();

function generate(w, h, sh) {
	// initialize

	ores.forEach((ore, i) => {
		ores[i].offset = Math.random() * 1024;
	});

	// generate surface + fill height

	let surface = [];

	for (let i = 0; i < width; i++) {
		let point = (simplex.noise2D(i / 100, 0) + 1) / 2;
		let point2 = (simplex.noise2D(i / 10, 0) + 1) / 2
		
		surface.push((point + point2 * 0.05) / 1.05);
	}

	let terrain = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
	
	for (let i = 0; i < h; i++) {
		for (let j = 0; j < w; j++) {
			let cp = grid(height - surface[j] * height, scale);

			if (cp == i * scale) {
				terrain[i][j] = layers[layers.length - 1].id;
			} else if (cp < i * scale) {
				terrain[i][j] = layers[layers.length - 1].id;
			}
		}
	}

	// generate caves + ores

	for (let i = 0; i < h; i++) {
		for (let j = 0; j < w; j++) {
			let point = (simplex.noise2D(j / 100, i / 100) + 1) / 2;
			let point2 = (simplex.noise2D(j / 10, i / 10) + 1) / 2

			if ((point + point2 * 0.05) / 1.05 > 0.8) {
				terrain[i][j] = 0;
			} else {
				if (terrain[i][j] == layers[layers.length - 1].id) {
					ores.forEach((ore) => {
						let opoint = (simplex.noise3D(j / 100, i / 100, ore.offset) + 1) / 2;
						let opoint2 = (simplex.noise3D(j / 10, i / 10, ore.offset) + 1) / 2

						if ((opoint + opoint2 * 0.05) / 1.05 < ore.rarity) {
							terrain[i][j] = ore.id;
						}
					});
				}
			}
		}
	}

	// add grass and shit

	for (let i = 0; i < sh; i++) {
		for (let j = 0; j < w; j++) {
			let isNotCovered = false
			let isOnRock = terrain[i][j] == layers[layers.length - 1].id;

			if (terrain[i - 1])
				isNotCovered = terrain[i - 1][j] == 0;

			if (isNotCovered && isOnRock) {
				terrain[i][j] = 1;

				let skip = 0;

				for (let depth = 0; depth < layers.length - 1; depth++) {
					let layer = layers[depth];

					let oof = false;

					let s = skip;
					for (let l = skip; l < s + layer.thickness; l++) {
						if ((terrain[i + l + 1]) && terrain[i + l + 1][j] == layers[layers.length - 1].id) {
							terrain[i + l + 1][j] = layer.id;
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
