<script>
try {
	if (typeof navigator === "undefined") throw "skip server-side execution";

	let Phaser;
	let Splash;
	let SpatialPlayground;
	//let readyToLaunchPhaser = false;

	const phaserPromise = import("phaser").then(imported => {
		//console.log(`** phaser imported. obj keys:`, Object.keys(imported));
		Phaser = imported;
	});
	const splashPromise = import("../scenes/Splash").then(imported => {
		//console.log(`** Splash imported. obj keys:`, Object.keys(imported));
		Splash = imported.default;
	});
	const spgPromise = import("../scenes/SpatialPlayground").then(imported => {
		SpatialPlayground = imported.default;
	});
	Promise.all([phaserPromise, splashPromise, spgPromise]).then(() => {
		//readyToLaunchPhaser = true;

		new Phaser.Game({
			type: Phaser.AUTO,
			parent: 'gamearea',
			//backgroundColor: '#33A5E7',
			scale: {
				width: 1365,
				height: 768,
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH
			},
			physics: {
				default: "arcade",
				arcade: {
					// debug: true,
				},
			},
			audio: {
				disableWebAudio: false,
			},
			scene: [Splash, SpatialPlayground]
		});

	});

} catch (err) {
	console.warn(`Game.svelte:`, err.message || err);
}
</script>


