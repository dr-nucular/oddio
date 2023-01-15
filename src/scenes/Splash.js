import Phaser from 'phaser';

export default class Splash extends Phaser.Scene {
	constructor() {
		super('Splash');
	}

	init() {
		console.log(`Splash.init()`);
		this.canvas = this.sys.game.canvas;
	}

	preload() {
		this.load.image('bg', 'assets/outerSpaceBG.jpg');
		this.load.image('playButtonUp', 'assets/PlayButton-up.png');
		this.load.image('playButtonDown', 'assets/PlayButton-down.png');
		this.load.audio('clickUp', 'assets/buttonClick.mp3');
	}

	create() {
		//this.cameras.main.setBackgroundColor('#421278');

		this.clickAudio = this.sound.add('clickUp');

		console.log(`this.canvas.width`, this.canvas.width);
		console.log(`this.canvas.height`, this.canvas.height);

		const bgSprite = this.add.image(0, 0, 'bg');
		bgSprite.setOrigin(0, 0);

		this.buttonContainer = this.add.container(this.canvas.width * 0.5, this.canvas.height * 0.5);
		this.buttonDownSprite = this.add.image(0, 10, 'playButtonDown');
		this.buttonUpSprite = this.add.image(0, 0, 'playButtonUp');
		this.buttonDownSprite.visible = false;
		this.buttonContainer.add([this.buttonDownSprite, this.buttonUpSprite]);

		this.buttonContainer.scale = 0.5;

		const hitArea = new Phaser.Geom.Circle(0, 0, this.buttonUpSprite.displayWidth * 0.5);
		this.buttonContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
		//this.buttonContainer.on('pointerover', this.onButtonOver, this);
		//this.buttonContainer.on('pointerout', this.onButtonOut, this);
		this.buttonContainer.on('pointerdown', this.onButtonDown, this);
		this.buttonContainer.on('pointerup', this.onButtonUp, this);
		this.buttonContainer.on('pointerupoutside', this.onButtonUp, this);

		// keyboard event, look for space
		this.input.keyboard.on('keydown', (e) => {
			if (e.key === ' ') {
				this.onButtonDown(e);
			}
		});
		this.input.keyboard.on('keyup', (e) => {
			if (e.key === ' ') { 
				this.onButtonUp(e);
			}
		});
	}

	onButtonOver(e) {
		console.log(`onButtonOver:`, e);
		this.tweens.add({
			targets: this.buttonContainer,
			scale: 0.55,
			duration: 100,
			ease: 'Sine.inOut'
		});
	}

	onButtonOut(e) {
		console.log(`onButtonOut:`, e);
		this.buttonDownSprite.visible = false;
		this.buttonUpSprite.visible = true;
		this.tweens.add({
			targets: this.buttonContainer,
			scale: 0.5,
			duration: 100,
			ease: 'Sine.inOut'
		});
	}

	onButtonDown(e) {
		console.log(`onButtonDown:`, e);
		this.buttonDownSprite.visible = true;
		this.buttonUpSprite.visible = false;
	}

	onButtonUp(e) {
		console.log(`onButtonUp:`, e);
		const currentlyDown = this.buttonDownSprite.visible;
		if (currentlyDown) {
			this.buttonContainer.disableInteractive();
			this.onButtonOut(e);
			this.clickAudio.play();
			this.time.addEvent({
				delay: 250,
				callback: this.transToNextScene,
				callbackScope: this,
			});			
		} else {
			this.buttonDownSprite.visible = false;
			this.buttonUpSprite.visible = true;
		}
	}

	transToNextScene() {
		console.log(`transToNextScene`);
		//this.scene.start("GameScene");
		this.scene.transition({
			target: 'GameScene',
			duration: 2000,
			moveBelow: true,
			onUpdate: (progress) => {
				// slide this one out
				//console.log(`...onUpdate`, e);
				
			},
			data: { x: 123, y: 234 }
		});
		this.cameras.main.pan(this.canvas.width * 0.5, this.canvas.height * 1.5, 2000, 'Sine.easeInOut');
	}
}
