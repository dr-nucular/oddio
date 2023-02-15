import Phaser from 'phaser';
import Oddio from '$lib/Oddio';
//import { delay } from '$lib/utils';
import { sBuffs, sSounds } from '../stores.js';

export default class Splash extends Phaser.Scene {
	constructor() {
		console.log(`Splash.constructor()`);
		super('Splash');
	}

	init() {
		console.log(`Splash.init()`);
		this.canvas = this.sys.game.canvas;

		this.loadingText = null;
		this.loadingTextStyle = { fontFamily: 'Arial', fontSize: '60px', color: 'yellow' };

		this.buttonContainer = null;
		this.buttonDownSprite = null;
		this.buttonUpSprite = null;

		// svelte store shizzle
		this.buffsArray = [];
		this.unsubBuffs = sBuffs.subscribe(obj => {
			const filenames = Object.keys(obj).sort();
			this.buffsArray = filenames.map(filename => {
				const stateData = obj[filename];
				return { filename, stateData };
			});
		});

		this.soundsArray = [];
		this.unsubSounds = sSounds.subscribe(obj => {
			const keys = Object.keys(obj).sort();
			this.soundsArray = keys.map(id => {
				const sound = obj[id];
				return { id, sound };
			});
		});

		this.events.on('destroy', this.destroy.bind(this));
	}

	preload() {
		console.log(`Splash.preload()`);
		this.load.image('bg', 'assets/outerSpaceBG.jpg');
		this.load.image('playButtonUp', 'assets/PlayButton-up.png');
		this.load.image('playButtonDown', 'assets/PlayButton-down.png');
		this.load.audio('clickUp', 'assets/buttonClick.mp3');
	}

	create() {
		console.log(`Splash.create()`);
		//this.cameras.main.setBackgroundColor('#421278');

		this.clickAudio = this.sound.add('clickUp');

		//console.log(`this.canvas.width`, this.canvas.width);
		//console.log(`this.canvas.height`, this.canvas.height);


		const bgSprite = this.add.image(0, 0, 'bg');
		bgSprite.setOrigin(0, 0);

		this.loadingText = this.add.text(this.canvas.width * 0.5, this.canvas.height * 0.75, `Loading...`, this.loadingTextStyle);
		this.loadingText.setOrigin(0.5, 0.5);

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
		/*
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
		*/

		// turn off interactivity
		this.buttonContainer.disableInteractive();

		// preload oddio, when done
		this.preloadOddio();

	}

	update() {
		// TODO progress bar
		// loading, loaded, decoding, decoded, error
		const totalBuffs = this.buffsArray.length;
		const numLoading = this.buffsArray.filter(k => k.stateData.loading).length;
		const numLoaded = this.buffsArray.filter(k => k.stateData.loaded).length;
		const numDecoding = this.buffsArray.filter(k => k.stateData.decoding).length;
		const numDecoded = this.buffsArray.filter(k => k.stateData.decoded).length;
		console.log(`Splash.update(): buffs total, loading, loaded, decoding, decoded =`,
			totalBuffs, numLoading, numLoaded, numDecoding, numDecoded);

		// could also iterate through this.soundsArray[] and look at each sound's buffs, and report if > 1 buff for each is ready to play?
	}

	async preloadOddio() {
		console.log(`Splash.preloadOddio()`);
		try {
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
						"strum1": "https://www.openears.net/jog/02_acoustic_1.ogg",
						"strum2": "https://www.openears.net/jog/02_acoustic_2.ogg",
						"strum3": "https://www.openears.net/jog/02_acoustic_3.ogg",
						"bass": "https://www.openears.net/jog/02_bass.ogg",
						"ebow1": "https://www.openears.net/jog/02_ebow_1.ogg",
						"ebow2": "https://www.openears.net/jog/02_ebow_2.ogg",
						"ebow3": "https://www.openears.net/jog/02_ebow_3.ogg",
						"ebow4": "https://www.openears.net/jog/02_ebow_4.ogg",
						"elecGuit": "https://www.openears.net/jog/02_electric_guitar.ogg",
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
							// update svelte store
							sBuffs.update(obj => {
								obj[state.filename] = state.stateData;
								return obj;
							});
						}
					}));

					const sound = Oddio.setSound(sKey, buffs);
					// update svelte store
					sSounds.update(obj => {
						obj[sKey] = sound;
						return obj;
					});

					const loadPromise = await Oddio.load(soundFilenames, { decodeImmediately: false });
					//const loadPromise = await delay(Math.random() * 2000).then(() => {
					//	return Oddio.load(soundFilenames);
					//});
					return loadPromise;
				});
				const ssGroupPromise = await Promise.all(ssLoadPromises);
				console.log(`preloadOddio "${ssKey}" sounds are all ready to go!`);
				return ssGroupPromise;
			});

			await Promise.all(allLoadPromises);

			console.log(`preloadOddio(): DONE`);
		} catch (err) {
			console.error(`preloadOddio() ERROR:`, err);
			return;
		}

		this.enableStartButton();
	}

	enableStartButton() {
		console.log(`Splash.enableStartButton()`);

		this.loadingText.setText(`READY!`);

		// setInteractive and make full alpha
		const hitArea = new Phaser.Geom.Circle(0, 0, this.buttonUpSprite.displayWidth * 0.5);
		this.buttonContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
		this.buttonContainer.setAlpha(1);
	}

	onButtonOver(e) {
		console.log(`Splash.onButtonOver():`, e);
		this.tweens.add({
			targets: this.buttonContainer,
			scale: 0.55,
			duration: 100,
			ease: 'Sine.inOut'
		});
	}

	onButtonOut(e) {
		console.log(`Splash.onButtonOut():`, e);
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
		console.log(`Splash.onButtonDown():`, e);
		this.buttonDownSprite.visible = true;
		this.buttonUpSprite.visible = false;
	}

	async onButtonUp(e) {
		console.log(`Splash.onButtonUp():`, e);
		const currentlyDown = this.buttonDownSprite.visible;
		if (currentlyDown) {
			this.buttonContainer.disableInteractive();
			this.onButtonOut(e);
			this.clickAudio.play();
			await Oddio.init();
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
		console.log(`Splash.transToNextScene()`);
		const duration = 750;
		//this.scene.start("GameScene");
		this.scene.transition({
			target: 'SpatialPlayground',
			duration,
			moveBelow: true,
			onUpdate: (progress) => {
				// slide this one out?
				//console.log(`...onUpdate`, progress);
				
			},
			data: { passToTargetScene: 123, another: 234 },
			sleep: false,
			remove: true // will emit 'destroy' event
		});

		// this does the pan of the current scene
		this.cameras.main.pan(this.canvas.width * 0.5, this.canvas.height * 1.5, duration, 'Sine.easeInOut');
	}

	destroy() {
		console.log(`Splash.destroy()`);

		this.unsubBuffs();
		this.unsubSounds();
	}
}
