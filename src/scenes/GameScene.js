import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	init() {
		console.log(`GameScene.init()`);
		this.canvas = this.sys.game.canvas;
	}

	preload() {
		this.load.image('logo', 'assets/phaser3-logo.png');
	}

	create() {
		const logo = this.add.image(400, 70, 'logo');
		const logo2 = this.add.image(600, 70, 'logo');

		this.tweens.add({
			targets: logo,
			y: 350,
			duration: 1500,
			ease: 'Sine.inOut',
			yoyo: true,
			repeat: -1
		});
	}

	transToNextScene() {
		console.log(`transToNextScene`);
		//this.scene.start("GameScene");
	}
}
