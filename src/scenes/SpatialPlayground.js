import Phaser from 'phaser';
import Oddio from '$lib/Oddio';
import { sSounds } from '../stores.js';

const GRAPHS = {
	"stereoMaster": {
		"__type": "graph",
		"__version": "1.0",
		"singleton": true,
		"publicNodes": true,
		"graph": {
			"master:stereoBus": {
				"type": "gain",
				"dest": [
					"master:stereoCmp"
				]
			},
			"master:stereoCmp": {
				"type": "compressor",
				"dest": [
					"master:stereoVol"
				]
			},
			"master:stereoVol": {
				"type": "gain",
				"dest": [
					"master:output"
				]
			},
			"master:output": {
				"type": "output"
			}
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"master:stereoBus": {
								"gain": 1
							},
							"master:stereoVol": {
								"gain": 1
							},
							"master:output": {
								"position": {
									"x": 0,
									"y": 0,
									"z": 0
								},
								"orientation": {
									"x": 0,
									"y": -1,
									"z": 0,
									"upx": 0,
									"upy": 0,
									"upz": -1
								}
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
		"singleton": false,
		"publicNodes": false,
		"graph": {
			"src": {
				"type": "source",
				"sound": null,
				"dest": [
					"pan"
				]
			},
			"pan": {
				"type": "panner",
				"panning_model": "HRTF",
				"dest": [
					"mix"
				]
			},
			"mix": {
				"type": "gain",
				"dest": [
					"master:stereoBus"
				]
			}
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"src": {
								"playbackRate": 1
							},
							"pan": {
								"distanceModel": "linear",
								"refDistance": 1,
								"maxDistance": 100,
								"rolloffFactor": 1
							},
							"mix": {
								"gain": 1
							}
						}
					}
				]
			},
			"play": {
				"params": {
					"soundId": null,
					"acTime": 0
				},
				"steps": [
					{
						"play": {
							"src": {
								"sound": "soundId",
								"when": "acTime"
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
							"src": {
								"when": "acTime"
							}
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
		"singleton": false,
		"publicNodes": false,
		"graph": {
			"src": {
				"type": "source",
				"sound": "drums",
				"dest": [
					"mix"
				]
			},
			"mix": {
				"type": "gain",
				"dest": [
					"master:stereoBus"
				]
			}
		},
		"methods": {
			"init": {
				"steps": [
					{
						"set": {
							"src": {
								"loop": false,
								"playbackRate": 1
							},
							"mix": {
								"gain": 1
							}
						}
					}
				]
			},
			"play": {
				"params": {
					"soundId": null,
					"acTime": 0
				},
				"steps": [
					{
						"play": {
							"src": {
								"sound": "soundId",
								"when": "acTime"
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
							"src": {
								"when": "acTime"
							}
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

		this.tracks = []; // array of objs
		this.voices = [];

		this.events.on('destroy', this.destroy.bind(this));
	}

	preload() {
		console.log(`SpatialPlayground.preload()`);
		this.load.image('logo', 'assets/phaser3-logo.png');
	}

	create() {
		console.log(`SpatialPlayground.create()`);

		// tracks, textSprites etc
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

		// playText
		this.playText = this.add.text(
			this.canvas.width * 0.5,
			this.canvas.height * 0.5,
			`PLAY`,
			this.textStylePlaying
		);
		this.playText.setOrigin(0.5, 0.5);
		this.playText.on('pointerdown', (e) => {
			this.togglePlay(e);
		}, this);
		this.playText.setInteractive();


		// dumb thing
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

		this.loadGraphs();
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

	loadGraphs() {
		console.log(`SpatialPlayground.loadGraphs()`);
		const graphKeys = Object.keys(GRAPHS);
		graphKeys.map(async gKey => {
			Oddio.setGraph(gKey, GRAPHS[gKey]);
		});

		// create outputGraph instance
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
		if (this.playText.text === 'PLAY') {
			this.playText.setText(`STOP`);
		} else {
			this.playText.setText(`PLAY`);

			this.tracks.forEach(track => {
				const buffs = track.soundData.sound.getBuffs();
				const buffsDecoded = buffs.filter(b => b.stateData.decoded);
				if (buffsDecoded.length) {
					console.log(`... will play track ${track.soundData.id}`);
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
				}
			});
	

				


		}
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
