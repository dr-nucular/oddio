import Phaser from 'phaser';
import Oddio from '$lib/Oddio';
import { delay } from '$lib/utils'

export default class Splash extends Phaser.Scene {
	constructor() {
		super('Splash');
	}

	init() {
		console.log(`Splash.init()`);
		this.canvas = this.sys.game.canvas;
	}

	preload() {
		console.log(`preload()`);
		this.load.image('bg', 'assets/outerSpaceBG.jpg');
		this.load.image('playButtonUp', 'assets/PlayButton-up.png');
		this.load.image('playButtonDown', 'assets/PlayButton-down.png');
		this.load.audio('clickUp', 'assets/buttonClick.mp3');
		this.preloadOddio();
	}

	async preloadOddio() {
		console.log(`preloadOddio()`);
		try {
			//loadSoundsButton.innerText = "Loading Sound Set Sources";
			//loadSoundsButton.disabled = true;

			//const soundSet = activeProjDocs.soundSets?.data();
			//const configJson = JSON.parse(soundSet.configJson);
			
			const configJson = {
				"stereoTrackz": {
					"__type": "soundSet",
					"__version": "1.0",
					"ideas": "cut up the clips above to start where they need to? i should make the playback engine well where i can start any piece from any point, it backtracks events and figures out what is playing and with what offset and volume and pan etc. asset loading should be all about managing whats in mem, with a load and unload event that fires a little in advance of its needs.",
					"sounds": {
						"drums": "https://www.openears.net/jog/02_drums.ogg",
						"metal": "https://www.openears.net/jog/02_metal.ogg"
					}
				},
				"monoTrackz": {
					"__type": "soundSet",
					"__version": "1.0",
					"sounds": {
						"acoustic1": "https://www.openears.net/jog/02_acoustic_1.ogg",
						"acoustic2": "https://www.openears.net/jog/02_acoustic_2.ogg",
						"acoustic3": "https://www.openears.net/jog/02_acoustic_3.ogg",
						"bass": "https://www.openears.net/jog/02_bass.ogg",
						"ebow1": "https://www.openears.net/jog/02_ebow_1.ogg",
						"ebow2": "https://www.openears.net/jog/02_ebow_2.ogg",
						"ebow3": "https://www.openears.net/jog/02_ebow_3.ogg",
						"ebow4": "https://www.openears.net/jog/02_ebow_4.ogg",
						"electricGuitar": "https://www.openears.net/jog/02_electric_guitar.ogg",
						"odd1": "https://www.openears.net/jog/02_odd_1.ogg",
						"odd2": "https://www.openears.net/jog/02_odd_2.ogg",
						"odd3": "https://www.openears.net/jog/02_odd_3.ogg",
						"synth": "https://www.openears.net/jog/02_synth.ogg"
					}
				}
			};

			const soundSetKeys = Object.keys(configJson);
			const allLoadPromises = soundSetKeys.map(async ssKey => {
				const ssSounds = configJson[ssKey].sounds;
				const soundKeys = Object.keys(ssSounds);
				//console.log(`- configJson.sounds (keys):`, soundKeys);

				const ssLoadPromises = soundKeys.map(async sKey => {
					// each value can be a filename string, or an array of filenames
					const soundFilenames = Array.isArray(ssSounds[sKey]) ? ssSounds[sKey] : [ssSounds[sKey]];
					const buffs = soundFilenames.map(filename => Oddio.setBuff(filename, {
						stateCallback: (state) => {
							console.log(`... load state for ${state.filename} = ${state.stateData}`);
							/*
							sBuffs.update(obj => {
								obj[state.filename] = state.stateData;
								return obj;
							});
							*/
						}
					}));
					Oddio.setSound(sKey, buffs);

					const loadPromise = await Oddio.load(soundFilenames);
					return loadPromise;
				});
				const ssGroupPromise = await Promise.all(ssLoadPromises);
				console.log(`preloadOddio "${ssKey}" sounds are all ready to go!`);
				return ssGroupPromise;
			});

			// add a 3s delay
			allLoadPromises.push(delay(1000));

			await Promise.all(allLoadPromises);
			
			//loadSoundsButton.innerText = "Load Sound Set Sources";
			//loadSoundsButton.disabled = false;
			console.log(`preloadOddio(): DONE`);
		} catch (err) {
			console.error(`preloadOddio() ERROR:`, err);
		}

	
	}

	async create() {
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
		this.buttonContainer.setAlpha(0.5);

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

		// turn off interactivity
		this.buttonContainer.disableInteractive();

		// preload oddio, when done, 
		await this.preloadOddio();

		// setInteractive and make full alpha
		const hitArea = new Phaser.Geom.Circle(0, 0, this.buttonUpSprite.displayWidth * 0.5);
		this.buttonContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
		this.buttonContainer.setAlpha(1);
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
