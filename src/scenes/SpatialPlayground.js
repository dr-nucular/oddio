import Phaser from 'phaser';
import Oddio from '$lib/Oddio';
import { sSounds } from '../stores.js';
import { shuffle } from '$lib/utils.js';

const DIST_MULTIPLIER = 10;

const GRAPHS = {
	"stereoMaster": {
		"__type": "graph",
		"__version": "1.0",
		"id": "stereoMaster", // NEED THIS until we refactor
		"singleton": true,
		"publicNodes": true,
		"graph": {
			"master:stereoBus": {
				"type": "gain",
				"dest": [ "master:stereoCmp" ]
			},
			"master:stereoCmp": {
				"type": "compressor",
				"dest": [ "master:stereoVol" ]
			},
			"master:stereoVol": {
				"type": "gain",
				"dest": [ "master:output" ]
			},
			"master:output": { "type": "output" }
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"master:stereoBus": { "gain": 1 },
							"master:stereoVol": { "gain": 1 },
							"master:output": {
								"positionX": 0,
								"positionY": 0,
								"positionZ": 0,
								"forwardX": 0,
								"forwardY": 0,
								"forwardZ": -1,
								"upX": 0,
								"upY": 1,
								"upZ": 0
							}
						}
					}
				]
			},
			"move": {
				"params": { "delay": 0, "x": 0, "y": 0, "z": 0 },
				"steps": [
					{
						"set": {
							"master:output": {
								"delay": "delay",
								"positionX": "x",
								"positionY": "y",
								"positionZ": "z"
							}
						}
					}
				]
			}
		},
		"voices": {
			"stereoMaster": {
				"onCreateMethods": [
					"init"
				],
				"autoCreate": true
			}
		}
	},
	"monoSource": {
		"__type": "graph",
		"__version": "1.0",
		"id": "monoSource", // NEED THIS until we refactor
		"singleton": false,
		"publicNodes": false,
		"graph": {
			"src": {
				"type": "source",
				"sound": null,
				"dest": [ "pan" ]
			},
			"pan": {
				"type": "panner",
				"panningModel": "HRTF", // TODO move to set?
				"dest": [ "mix" ]
			},
			"mix": {
				"type": "gain",
				"dest": [ "master:stereoBus" ]
			}
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"src": { "playbackRate": 1 },
							"pan": {
								"panningModel": "HRTF", // allow this to be set after creation?
								"distanceModel": "inverse",
								"refDistance": 1,
								"maxDistance": 100,
								"rolloffFactor": 1,
								"coneInnerAngle": 60,
								"coneOuterAngle": 300,
								"coneOuterGain": 0.65,
								"positionX": 0,
								"positionY": 0,
								"positionZ": 0,
								"orientationX": 0,
								"orientationY": 0,
								"orientationZ": 1,								
							},
							"mix": { "gain": 1 }
						}
					}
				]
			},
			"play": {
				"params": { "soundId": null, "acTime": 0, "offset": 0 },
				"steps": [
					{
						"play": {
							"src": { "sound": "soundId", "when": "acTime", "offset": "offset" }
						}
					}
				]
			},
			"move": {
				"params": { "delay": 0, "x": 0, "y": 0, "z": 0 },
				"steps": [
					{
						"set": {
							"pan": {
								"delay": "delay",
								"positionX": "x",
								"positionY": "y",
								"positionZ": "z"
							}
						}
					}
				]
			},
			"stop": {
				"params": {
					"acTime": 0
				},
				"steps": [
					{
						"stop": {
							"src": { "when": "acTime" }
						}
					}
				]
			}
		},
		"voices": {
			"sourcez-01": {
				"onCreateMethods": [
					"init"
				],
				"autoCreate": true
			}
		}
	},
	"stereoSource": {
		"__type": "graph",
		"__version": "1.0",
		"id": "stereoSource", // NEED THIS until we refactor
		"singleton": false,
		"publicNodes": false,
		"graph": {
			"src": {
				"type": "source",
				"sound": null,
				"dest": [ "mix" ]
			},
			"mix": {
				"type": "gain",
				"dest": [ "master:stereoBus" ]
			}
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"src": { "loop": false, "playbackRate": 1 },
							"mix": { "gain": 1 }
						}
					}
				]
			},
			"play": {
				"params": { "soundId": null, "acTime": 0, "offset": 0 },
				"steps": [
					{
						"play": {
							"src": { "sound": "soundId", "when": "acTime", "offset": "offset" }
						}
					}
				]
			},
			"stop": {
				"params": { "acTime": 0 },
				"steps": [
					{
						"stop": {
							"src": { "when": "acTime" }
						}
					}
				]
			}
		},
		"voices": {
			"sourcez-01": {
				"onCreateMethods": [
					"init"
				],
				"autoCreate": true
			}
		}
	}
};

const COMPO = {
	"myAwesomeComp": {
		"__type": "composition",
		"__version": "1.0",
		"events": [
			{
				"at": 0,
				"createVoices": {}
			},
			{
				"at": 0,
				"createVoice": {
					"graphId": "stereoMaster",
					"id": "stereoMaster"
				}
			},
			{
				"at": 0.1,
				"createVoice": {
					"graphId": "sourcez",
					"id": "sourcez-01"
				}
			},
			{
				"at": 1,
				"method": {
					"voiceId": "stereoMaster",
					"name": "init"
				}
			},
			{
				"at": 1.5,
				"method": {
					"voiceId": "sourcez-01",
					"name": "init"
				}
			},
			{
				"at": 2,
				"method": {
					"voiceId": "sourcez-01",
					"name": "playDrums",
					"args": {
						"acTime": 2
					}
				}
			},
			{
				"at": 7,
				"method": {
					"voiceId": "sourcez-01",
					"name": "stopDrums",
					"args": {
						"acTime": 7
					}
				}
			},
			{
				"at": 9,
				"steps": [
					{},
					{}
				]
			}
		]
	}
};

export default class SpatialPlayground extends Phaser.Scene {
	constructor() {
		console.log(`SpatialPlayground.constructor()`);
		super('SpatialPlayground');
	}

	init() {
		console.log(`SpatialPlayground.init()`);
		this.canvas = this.sys.game.canvas;
		this.centerPosition = {
			x: this.canvas.width * 0.5,
			y: this.canvas.height * 0.5
		};

		

		// svelte store shizzle
		/*
		this.buffsArray = [];
		this.unsubBuffs = sBuffs.subscribe(obj => {
			const filenames = Object.keys(obj).sort();
			this.buffsArray = filenames.map(filename => {
				const stateData = obj[filename];
				return { filename, stateData };
			});
		});
		*/

		this.soundsArray = [];
		this.unsubSounds = sSounds.subscribe(obj => {
			const keys = Object.keys(obj).sort();
			this.soundsArray = keys.map(id => {
				const sound = obj[id];
				return { id, sound };
			});
		});

		this.textStyleError = { fontFamily: 'Arial', fontSize: 32, color: 'red' };
		this.textStyleLoaded = { fontFamily: 'Arial', fontSize: 32, color: 'orange' };
		this.textStyleDecoding = { fontFamily: 'Arial', fontSize: 32, color: 'yellow' };
		this.textStyleDecoded = { fontFamily: 'Arial', fontSize: 32, color: 'green' };
		this.textStylePlaying = { fontFamily: 'Arial', fontSize: 32, color: 'white' };
		this.playText = null;
		this.youText = null;

		this.tracks = []; // array of objs
		this.voices = [];
		this.outputVoice = null;

		this.musicOffset = 0;

		this.events.on('destroy', this.destroy.bind(this));
	}

	preload() {
		console.log(`SpatialPlayground.preload()`);
		this.load.image('logo', 'assets/phaser3-logo.png');
	}

	create() {
		console.log(`SpatialPlayground.create()`);

		// tracks, textSprites etc
		const tracks = this.soundsArray.map((soundData, s) => {
			const perc = s / this.soundsArray.length;
			const rads = perc * 2 * Math.PI;
			const x = this.centerPosition.x + (Math.sin(rads) * 300);
			const y = this.centerPosition.y - (Math.cos(rads) * 300);
			const textSprite = this.add.text(x, y, `${soundData.id}`, this.textStyleLoaded);
			textSprite.setOrigin(0.5, 0.5);
			return { soundData, textSprite };
		});
		this.tracks = shuffle(tracks);

		// add interaction
		this.tracks.forEach(track => {
			track.textSprite.on('pointerdown', (e) => {
				this.onTrackDn(track, e);
			}, this);
			track.textSprite.setInteractive();
		});

		// playText
		this.playText = this.add.text(
			this.canvas.width * 0.05, this.canvas.height * 0.05, `PLAY`, this.textStylePlaying
		);
		this.playText.setOrigin(0, 0.5);
		this.playText.on('pointerdown', (e) => { this.togglePlay(e) }, this);
		this.playText.setInteractive();

		// youText
		this.youText = this.add.text(
			this.canvas.width * 0.5, this.canvas.height * 0.5, `YOU`, this.textStylePlaying
		);
		this.youText.setOrigin(0.5, 0.5);
		this.youText.setInteractive();
		this.input.setDraggable(this.youText);
		this.input.on('drag', this.onListenerMove.bind(this));
		
		// setOffsetText
		const setOffsetText = this.add.text(
			this.canvas.width * 0.05, this.canvas.height * 0.1, `Set Offset 2:27`, this.textStyleDecoding
		);
		setOffsetText.setOrigin(0, 0.5);
		setOffsetText.on('pointerdown', (e) => { this.musicOffset = 147 }, this);
		setOffsetText.setInteractive();

		// setOffsetText2
		const setOffsetText2 = this.add.text(
			this.canvas.width * 0.05, this.canvas.height * 0.15, `Set Offset 4:26`, this.textStyleDecoding
		);
		setOffsetText2.setOrigin(0, 0.5);
		setOffsetText2.on('pointerdown', (e) => { this.musicOffset = 266 }, this);
		setOffsetText2.setInteractive();

		// setOffsetText3
		const setOffsetText3 = this.add.text(
			this.canvas.width * 0.05, this.canvas.height * 0.2, `Set Offset 5:00`, this.textStyleDecoding
		);
		setOffsetText3.setOrigin(0, 0.5);
		setOffsetText3.on('pointerdown', (e) => { this.musicOffset = 300 }, this);
		setOffsetText3.setInteractive();

		// dumb thing
		/*
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
		*/

		this.setGraphs();
	}

	update(time, delta) {
		const s = time * 0.0005;
		this.tracks.forEach((track, t) => {
			const perc = t / this.tracks.length;
			//const rads = perc * 2 * Math.PI;
			const rads = perc * 1 * Math.PI;
			const x = this.centerPosition.x + (Math.sin(rads + s) * 300);
			const y = this.centerPosition.y - (Math.cos(rads + s) * 300);
			track.textSprite.setPosition(x, y);
		});
		this.updateSourcePositions();
	}

	/**************************
	 * Custom methods
	 ****************************/

	updateSourcePositions() {
		//console.log(`SpatialPlayground.updateSourcePositions()`);
		this.tracks.forEach((track, t) => {
			// voice set position. y maps to z in 3d space
			if (track.voice?.graphId === 'monoSource') {
				const x = track.textSprite.x;
				const y = track.textSprite.y;
				//console.log(`....updatePos of ${track.soundData.id}:`, x, y);
	
				const oddioPosX = x / this.centerPosition.x - 1.0; // -1 to +1, Left to Right
				const oddioPosZ = y / this.centerPosition.y - 1.0; // -1 to +1, Front to Rear
				track.voice.doMethod('move', { x: oddioPosX * DIST_MULTIPLIER, z: oddioPosZ * DIST_MULTIPLIER });
			}
		});
	}

	setGraphs() {
		console.log(`SpatialPlayground.setGraphs()`);
		const graphKeys = Object.keys(GRAPHS);
		graphKeys.map(async gKey => {
			Oddio.setGraph(gKey, GRAPHS[gKey]);
		});
		// create outputGraph instance
		this.outputVoice = Oddio.createVoice('stereoMaster', 'output');
		this.outputVoice.doMethod('init');
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

	togglePlay(e) {
		console.log(`SpatialPlayground.togglePlay():`, e);
		if (this.playText.text === 'STOP') {
			// STOP all voices in this.tracks
			this.tracks.forEach(track => {
				track.voice?.doMethod('stop', { acTime: 0 });
			});

			this.playText.setText(`PLAY`);

		} else {
			// PLAY

			this.tracks.forEach(track => {
				
				const buffs = track.soundData.sound.getBuffs();
				const buffsDecoded = buffs.filter(b => b.stateData.decoded);
				if (buffsDecoded.length) {
					
					console.log(`... will play track ${track.soundData.id}`);

					if (!track.voice) {
						// create, init
						const soundAudioBuffer = track.soundData.sound.getBuffer();
						const numChannels = soundAudioBuffer.numberOfChannels;
						if (numChannels === 2) {
							track.voice = Oddio.createVoice('stereoSource', `${track.soundData.id}-voice`);
						} else {
							track.voice = Oddio.createVoice('monoSource', `${track.soundData.id}-voice`);
						}
						track.voice.doMethod('init');
					}
					track.voice.doMethod('play', {
						soundId: track.soundData.id,
						acTime: 0,
						offset: this.musicOffset
					});
	
					
					//const monoVoice = Oddio.createVoice('monoSource', '');

					/*
					// do it... based on event props
					if (event.createVoice) {
						Oddio.createVoice(event.createVoice.graphId, event.createVoice.id);
					}
					if (event.method) {
						const voice = Oddio.getVoiceById(event.method.voiceId);
						voice.doMethod(event.method.name, { acTime: when });
					}
					*/
				} else {
					// no available buffers to play for this track.  if there's a voice defined from
					// before (when there was an available buffer), destroy it.
					if (track.voice) {
						track.voice.destroy();
						delete track.voice;
					}
				}
			});

			this.playText.setText(`STOP`);

			console.log(`SpatialPlayground.onTrackDn(): destination numberOfInputs:`, Oddio.getAC().destination.numberOfInputs);
			console.log(`SpatialPlayground.onTrackDn(): destination numberOfOutputs:`, Oddio.getAC().destination.numberOfOutputs);
			console.log(`SpatialPlayground.onTrackDn(): destination channelCount:`, Oddio.getAC().destination.channelCount);
			console.log(`SpatialPlayground.onTrackDn(): destination channelCountMode:`, Oddio.getAC().destination.channelCountMode);
			console.log(`SpatialPlayground.onTrackDn(): destination channelInterpretation:`, Oddio.getAC().destination.channelInterpretation);


		}
	}

	onListenerMove(pointer, uText, x, y) {
		console.log(`SpatialPlayground.onListenerMove()`);
		uText.x = x;
		uText.y = y;
		// calculate listener positions etc
		const oddioPosX = x / this.centerPosition.x - 1.0; // -1 to +1, Left to Right
		const oddioPosZ = y / this.centerPosition.y - 1.0; // -1 to +1, Front to Rear
		console.log(`SpatialPlayground.onListenerMove()`, oddioPosX, oddioPosZ);
		this.outputVoice.doMethod('move', { x: oddioPosX * DIST_MULTIPLIER, z: oddioPosZ * DIST_MULTIPLIER });
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

		//this.unsubBuffs();
		this.unsubSounds();
	}

}
