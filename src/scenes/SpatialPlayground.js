import Phaser from 'phaser';
import { sBuffs, sSounds } from '../stores.js';

export default class SpatialPlayground extends Phaser.Scene {
	constructor() {
		console.log(`SpatialPlayground.constructor()`);
		super('SpatialPlayground');
	}

	init() {
		console.log(`SpatialPlayground.init()`);
		this.canvas = this.sys.game.canvas;

		this.textStyleError = { fontFamily: 'Arial', fontSize: 32, color: 'red' };
		this.textStyleLoaded = { fontFamily: 'Arial', fontSize: 32, color: 'orange' };
		this.textStyleDecoding = { fontFamily: 'Arial', fontSize: 32, color: 'yellow' };
		this.textStyleDecoded = { fontFamily: 'Arial', fontSize: 32, color: 'green' };
		this.textStylePlaying = { fontFamily: 'Arial', fontSize: 32, color: 'white' };
		this.playText = null;
		

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


		this.tracks = []; // array of objs

		this.events.on('destroy', this.destroy.bind(this));
	}

	preload() {
		console.log(`SpatialPlayground.preload()`);
		this.load.image('logo', 'assets/phaser3-logo.png');
	}

	create() {
		console.log(`SpatialPlayground.create()`);

		this.tracks = this.soundsArray.map((soundData, s) => {
			const perc = s / this.soundsArray.length;
			const rads = perc * 2 * Math.PI;
			const x = (this.canvas.width * 0.5) + (Math.sin(rads) * 300);
			const y = (this.canvas.height * 0.5) - (Math.cos(rads) * 300);
			const textSprite = this.add.text(x, y, `${soundData.id}`, this.textStyleLoaded);
			textSprite.setOrigin(0.5, 0.5);


			return { soundData, textSprite };
		});

		// add interaction
		this.tracks.forEach(track => {
			track.textSprite.on('pointerdown', (e) => {
				this.onTrackDn(track, e);
			}, this);
			track.textSprite.setInteractive();
		});




		const logo = this.add.image(this.canvas.width * 0.15, this.canvas.height * 0.05, 'logo');
		logo.setScale(0.5);

		this.tweens.add({
			targets: logo,
			y: 50,
			duration: 1000,
			ease: 'Sine.inOut',
			yoyo: true,
			repeat: -1
		});
	}

	update(time, delta) {
		const s = time * 0.0001;
		this.tracks.forEach((track, t) => {
			const perc = t / this.tracks.length;
			const rads = perc * 2 * Math.PI;
			const x = (this.canvas.width * 0.5) + (Math.sin(rads + s) * 300);
			const y = (this.canvas.height * 0.5) - (Math.cos(rads + s) * 300);
			track.textSprite.setPosition(x, y);
		});
	}

	async onTrackDn(track, e) {
		console.log(`SpatialPlayground.onTrackDn():`, track, e);
		const buffs = track.soundData.sound.getBuffs();
		const buffsLoaded = buffs.filter(b => b.stateData.loaded);
		const buffsDecoding = buffs.filter(b => b.stateData.decoding);
		const buffsDecoded = buffs.filter(b => b.stateData.decoded);
		const buffsErrored = buffs.filter(b => b.stateData.error);

		this.setTrackTextStyle(track);
		if (buffsErrored.length) {
			return;
		}

		if (buffsLoaded.length && !buffsDecoded.length && !buffsDecoding.length) {
			track.soundData.sound.decodeBuffs().then(() => {
				this.setTrackTextStyle(track); // done decoding
			});
			this.setTrackTextStyle(track); // will it change color to "decoding" right away?
		} else if (buffsLoaded.length && buffsDecoded.length && !buffsDecoding.length) {
			track.soundData.sound.undecodeBuffs();
			this.setTrackTextStyle(track);
		}

		/*
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
		*/
	}

	setTrackTextStyle(track) {
		console.log(`SpatialPlayground.setTrackTextStyle():`, track);

		// based on Sound status
		const buffs = track.soundData.sound.getBuffs();
		const buffsLoaded = buffs.filter(b => b.stateData.loaded);
		const buffsDecoding = buffs.filter(b => b.stateData.decoding);
		const buffsDecoded = buffs.filter(b => b.stateData.decoded);
		const buffsErrored = buffs.filter(b => b.stateData.error);
		// TODO: playing
		if (buffsErrored.length) {
			// at least one errored out
			track.textSprite.setStyle(this.textStyleError);
			console.log(`... Error with track with sound id '${track.soundData.id}':`, track);
		} else if (buffsDecoded.length) {
			// at least one is decoded
			track.textSprite.setStyle(this.textStyleDecoded);
		} else if (buffsDecoding.length) {
			// at least one is decoding
			track.textSprite.setStyle(this.textStyleDecoding);
		} else if (buffsLoaded.length) {
			// at least one is loaded
			track.textSprite.setStyle(this.textStyleLoaded);
		}
	}

	transToNextScene() {
		console.log(`SpatialPlayground.transToNextScene()`);
		//this.scene.start("SpatialPlayground");
	}

	destroy() {
		console.log(`SpatialPlayground.destroy()`);

		this.unsubBuffs();
		this.unsubSounds();
	}

}
