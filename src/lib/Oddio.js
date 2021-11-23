/**
 * Oddio.js
 * - HTML5 WebAudio API interface
 * (c) 2019, 2020 by Owen Grace, Homer Learning Inc.
 */

const DEBUG = true;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Buff {
	constructor(ac, filename = '') {
		this.ac = ac;
		this.filename = filename;
		this.loadPromise = null;
		this.audioBuffer = null;
	}

	load() {
		if (!this.loadPromise) {
			DEBUG && console.log(`Buff.load(): ${this.filename} download started`);
			this.loadPromise = new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('GET', this.filename, true);
				xhr.responseType = 'arraybuffer';
				xhr.onload = () => {
					if (xhr.status === 200) {
						DEBUG && console.log(`Buff.load(): ${this.filename} download finished`);
						this.ac.decodeAudioData(
							xhr.response,
							(audioBuffer) => {
								// only save decoded result if this.loadPromise hasn't been nulled...
								// if it has, then download was likely canceled intentionally via unload().
								if (this.loadPromise) {
									this.audioBuffer = audioBuffer;
									DEBUG && console.log(`Buff.load(): ${this.filename} decoded, ready to play`);
									resolve();
								} else {
									reject(
										`Buff.load(): ${this.filename} decoded, but aborting because unload was called first`
									);
									return Promise.resolve();
								}
							},
							(err) => {
								reject(`Buff.load(): Error decoding ${this.filename}: ${err}`);
							}
						);
					} else {
						reject(`Buff.load(): Error ${xhr.status}: ${xhr.statusText}`);
					}
				};
				/*
				xhr.ontimeout = () => {
					DEBUG && console.error(`Buff.load(): ${this.filename} timed out`);
				};
				xhr.onprogress = (event) => {
					if (event.lengthComputable) {
						DEBUG && console.log(`Buff.load(): ${this.filename} loading... received ${event.loaded} of ${event.total} bytes`);
					} else {
						DEBUG && console.log(`Buff.load(): ${this.filename} loading... received ${event.loaded} bytes`); // no Content-Length
					}
				};
				*/
				xhr.onerror = () => {
					reject(`Buff.load(): Network error trying to load ${this.filename}`);
				};
				//xhr.timeout = 10000;
				xhr.send();
			}).catch(console.error);
		}
		return this.loadPromise;
	}

	unload() {
		if (DEBUG) {
			if (this.loadPromise && this.audioBuffer) {
				DEBUG && console.log(`Buff.unload(): ${this.filename} unloaded`);
			} else if (this.loadPromise) {
				console.warn(`Buff.unload(): ${this.filename} unloaded before it finished decoding`);
			} else {
				console.warn(`Buff.unload(): ${this.filename} not loaded in the first place`);
			}
		}
		this.loadPromise = null;
		this.audioBuffer = null;
	}

	getLoadPromise() {
		return this.loadPromise;
	}

	getAudioBuffer() {
		return this.audioBuffer;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Sound {
	constructor() {
		this.filenames = []; // audio filenames.  if > 1, they are triggered randomly
		this.recentlySelected = []; // array of filenames
	}

	setFilenames(fileOrFiles = []) {
		this.filenames = typeof fileOrFiles === 'string' ? [fileOrFiles] : fileOrFiles.slice(0);
		this.filenames.filter((elem, pos, arr) => elem); // remove falsies, dupes are allowed.
		this.recentlySelected = []; // reset
	}

	getBuffer(selectionType = 'randomNoRepeat') {
		// selectionType <str> is 'randomNoRepeat', 'exhaustiveRandom', random', or 'cycle'.   TODO: implement
		// return AudioBuffer instance

		// filter this.filenames to make playable filenames
		const playableFilenames = this.filenames.filter((filename) => {
			const buff = Oddio.instance.getBuff(filename);
			return buff && buff.audioBuffer;
		});

		// bail if there are 0
		const numFilenames = playableFilenames.length;
		if (!numFilenames) return;

		// splice items from the this.recentlySelected array if there are too many.
		// half the numFilenames is appropriate for random-no-repeat effectiveness.
		const numToRemove = this.recentlySelected.length - Math.floor(numFilenames * 0.5);
		if (numToRemove > 0) {
			this.recentlySelected.splice(0, numToRemove);
		}

		// choose a random filename from the collection (no repeat if > 1)
		let selectedFilename = null;
		if (numFilenames === 1) {
			selectedFilename = playableFilenames[0];
		} else if (numFilenames > 1) {
			let tries = 0;
			do {
				selectedFilename = playableFilenames[Math.floor(Math.random() * numFilenames)];
				tries++;
			} while (this.recentlySelected.indexOf(selectedFilename) > -1 && tries < 10);
		}

		if (selectedFilename !== null) {
			this.recentlySelected.push(selectedFilename);
			return Oddio.instance.getBuff(selectedFilename).getAudioBuffer();
		}
		return;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Palette {
	constructor(config = {}, id) {
		this.id = id; // optional identifier
		this.type = config.type || null;
		this.publicNodes = config.publicNodes || false;
		this.singleton = config.singleton || false;

		this.sounds = null; // dict of Sound instances
		this.graph = null;
		this.methods = null;
		this.graphNodes = [];
		this.ac = Oddio.instance.getAC();

		// clone config's sounds, populate dict of Sound instances
		if (config && config.sounds) {
			const soundsData = JSON.parse(JSON.stringify(config.sounds));
			const soundIds = Object.keys(soundsData);
			this.sounds = {};
			soundIds.forEach((soundId) => {
				this.sounds[soundId] = new Sound();
				this.sounds[soundId].setFilenames(soundsData[soundId]);
			});
		}

		// clone config's graph
		if (config && config.graph) {
			this.graph = JSON.parse(JSON.stringify(config.graph));
		} else {
			console.warn(`Palette.constructor(): config's graph is undefined`);
		}

		// clone config's methods
		if (config && config.methods) {
			this.methods = JSON.parse(JSON.stringify(config.methods));
		} else {
			console.warn(`Palette.constructor(): config's methods are undefined`);
		}

		// build graph!  TODO: break into createAudioNodes and connectAudioNodes ?
		this.buildGraph();
	}

	destroy() {
		// stop any playing source nodes
		for (const nodeName in this.graph) {
			const nodeInfo = this.graph[nodeName];
			if (nodeInfo.type === 'source' || nodeInfo.type === 'oscillator') {
				//this._stop(nodeName, nodeInfo, { delay: 0 });
				this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, 0, true);
			}
		}

		// immediately disconnect all graphNodes (source nodes are disconnected when stopped, above)
		this.disconnectNodesAtTime(this.graphNodes, 0);

		// wipe these references
		this.sounds = null;
		this.graph = null;
		this.methods = null;
		this.graphNodes = null;
		this.ac = null;
	}

	recursiveParamReplace(params, substitutions) {
		//console.log(" --> params:", params, "subs:", substitutions);
		for (const p in params) {
			// p = variable name
			// params[p] = value
			if (typeof params[p] === 'object') {
				this.recursiveParamReplace(params[p], substitutions);
			} else if (typeof params[p] === 'string') {
				if (typeof substitutions[params[p]] !== 'undefined') {
					//console.log("......substituting", substitutions[params[p]], "for", params[p]);
					params[p] = substitutions[params[p]];
				}
			}
		}
	}

	getGraphNode(name) {
		let result = null;
		if (typeof this.graph[name] !== 'undefined') {
			result = this.graph[name];
		}
		/*
		else {
			console.warn("Palette.getGraphNode("+name+") is undefined.");
		}
		*/
		return result;
	}

	connectNodesByName(a, b) {
		const nodeA = this.getGraphNode(a);
		let nodeB = this.getGraphNode(b);
		if (nodeA !== null) {
			// if nodeB is null, look in other palettes with publicNodes, use the first one it finds
			if (nodeB === null) {
				const otherPalettes = Oddio.instance.getPalettesWithPublicNodes();
				for (let op = 0; op < otherPalettes.length; op++) {
					nodeB = otherPalettes[op].getGraphNode(b);
					if (nodeB !== null) break;
				}
			}

			// connect if both nodes were found!
			if (nodeB !== null) {
				if (typeof nodeA._audio_node !== 'undefined' && typeof nodeB._audio_node !== 'undefined') {
					nodeA._audio_node.connect(nodeB._audio_node);
					DEBUG && console.log(`Palette.connectNodesByName(${a}, ${b}): success`);
					if (nodeA.type !== 'source' && nodeA.type !== 'oscillator') {
						this.graphNodes.push(nodeA._audio_node);
						DEBUG && console.log(`...${a} also added to graphNodes array for disconnection later`);
					}
					return;
				}
			}
		}
		console.warn(`Palette.connectNodesByName(${a}, ${b}): failure`);
	}

	disconnectNodesAtTime(nodes = [], when = 0) {
		DEBUG && console.log(`Palette.disconnectNodesAtTime():`, nodes, when);
		// if when isn't defined, or in the past, then just do it immediately
		// if when is in the future, then schedule a re-calling of this method in the future
		if (!nodes || !nodes.length || !this.ac || this.ac.state === 'closed') {
			DEBUG && console.log(`... bailing!`);
			return;
		}

		const currentTime = this.ac.currentTime;
		if (typeof when !== 'number' || when <= currentTime) {
			DEBUG && console.log(`... disconnecting. currentTime =`, currentTime, `when =`, when);
			nodes.forEach((node) => {
				node.disconnect(); // disconnects all outgoing connections
			});
			return;
		}

		const delayTime = Math.max(when - currentTime, 1.0); // in seconds, 1s minimum
		DEBUG && console.log(`... not time yet, retrying in ${delayTime} seconds`);
		setTimeout(() => {
			this.disconnectNodesAtTime(nodes, when);
		}, delayTime * 1000);
	}

	buildGraph() {
		// traverse graph, create nodes and _props{} if they haven't been created yet, then connect em!
		if (!this.graph) {
			console.warn(`Palette.buildGraph(): no graph data defined`);
			return;
		}

		///// create
		for (const g in this.graph) {
			// g = name of node, this.graph[g] = { node info }
			if (typeof this.graph[g]._audio_node === 'undefined' && typeof this.graph[g].type !== 'undefined') {
				DEBUG && console.log(`Palette.buildGraph(): CREATING NODE '${g}'`);
				if (this.graph[g].type === 'source') {
					// skip creating source nodes here!  this is done in _play()
					// but still set them to null and init _props values:
					this.graph[g]._source_node = null; // will be assigned to a bufferSourceNode
					this.graph[g]._audio_node = null; // will be assigned to a gainNode
					this.graph[g]._props = {};
					this.graph[g]._props.playbackRate = 1.0;
					this.graph[g]._props.loop = false;
					this.graph[g]._props.loopStart = 0.0;
					this.graph[g]._props.loopEnd = 0.0;
				} else if (this.graph[g].type === 'oscillator') {
					// skip creating source nodes here!  this is done in _play()
					// but still set them to null and init _props values:
					this.graph[g]._source_node = null; // will be assigned to a oscillatorNode
					this.graph[g]._audio_node = null; // will be assigned to a gainNode
					this.graph[g]._props = {};
					this.graph[g]._props.frequency = 440.0;
					this.graph[g]._props.detune = 0.0;
				} else if (this.graph[g].type === 'waveshaper') {
					this.graph[g]._audio_node = this.ac.createWaveShaper();
					this.graph[g]._props = {};
					this.graph[g]._props.curve = new Float32Array(2); // default length
					// init the curve to -1 to 1 linear
					this.graph[g]._props.curve[0] = -1.0;
					this.graph[g]._props.curve[1] = 1.0;
				} else if (this.graph[g].type === 'gain') {
					this.graph[g]._audio_node = this.ac.createGain();
					this.graph[g]._props = {};
					this.graph[g]._props.gain = 1.0;
					this.graph[g]._props.gain_curve = new Float32Array(2); // default length
					// init the curve to 0 to 1 linear
					this.graph[g]._props.gain_curve[0] = 0.0;
					this.graph[g]._props.gain_curve[1] = 1.0;
					this.graph[g]._props.mute = false;
				} else if (this.graph[g].type === 'echo') {
					this.graph[g]._audio_node = this.ac.createDelay();
					this.graph[g]._props = {};
					this.graph[g]._props.delayTime = 0.0;
				} else if (this.graph[g].type === 'convolver') {
					this.graph[g]._audio_node = this.ac.createConvolver(); // need to init buffer to "empty"?
					this.graph[g]._props = {};
					this.graph[g]._props.sound = null; // sound name of the impulse response, will be loaded into .buffer during _set()
				} else if (this.graph[g].type === 'filter') {
					this.graph[g]._audio_node = this.ac.createBiquadFilter();
					if (typeof this.graph[g].filter_type !== 'undefined') {
						/* "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass" */
						this.graph[g]._audio_node.type = this.graph[g].filter_type; // TODO: test
					}
					this.graph[g]._props = {};
					this.graph[g]._props.frequency = 22050;
					this.graph[g]._props.Q = 0.0;
					this.graph[g]._props.gain = 1.0;
				} else if (this.graph[g].type === 'analyser') {
					this.graph[g]._audio_node = this.ac.createAnalyser();
					this.graph[g]._props = {};
					this.graph[g]._props.fftSize = 2048;
				} else if (this.graph[g].type === 'script') {
					if (typeof this.graph[g].buff_in_out !== 'undefined' && this.graph[g].buff_in_out.length === 3) {
						this.graph[g]._audio_node = this.ac.createScriptProcessor(
							this.graph[g].buff_in_out[0],
							this.graph[g].buff_in_out[1],
							this.graph[g].buff_in_out[2]
						);
					} else {
						this.graph[g]._audio_node = this.ac.createScriptProcessor(2048, 1, 1); // default
					}
					this.graph[g]._props = {};
					this.graph[g]._props.onaudioprocess = function (e) {
						// default copies input buffer [0] to output buffer [0]
						const inbuff = e.inputBuffer.getChannelData(0);
						const outbuff = e.outputBuffer.getChannelData(0);
						for (let s = 0; s < inbuff.length; s++) {
							outbuff[s] = inbuff[s];
						}
					};
					this.graph[g]._audio_node.onaudioprocess = this.graph[g]._props.onaudioprocess;
				} else if (this.graph[g].type === 'panner') {
					this.graph[g]._audio_node = this.ac.createPanner();
					if (typeof this.graph[g].panning_model !== 'undefined') {
						this.graph[g]._audio_node.panningModel = this.graph[g].panning_model;
						// old way:
						//this.graph[g]._audio_node.panningModel = this.graph[g]._audio_node[this.graph[g].panner_model];
					}
					this.graph[g]._props = {};
					this.graph[g]._props.distanceModel = 'inverse';
					this.graph[g]._props.refDistance = 1.0; // min distance
					this.graph[g]._props.maxDistance = 10000.0; // max distance
					this.graph[g]._props.rolloffFactor = 1.0;
					this.graph[g]._props.pos_x = 0.0;
					this.graph[g]._props.pos_y = 0.0;
					this.graph[g]._props.pos_z = 0.0;
					this.graph[g]._props.vel_x = 0.0;
					this.graph[g]._props.vel_y = 0.0;
					this.graph[g]._props.vel_z = 0.0;
				} else if (this.graph[g].type === 'compressor') {
					this.graph[g]._audio_node = this.ac.createDynamicsCompressor();
					this.graph[g]._props = {};
					this.graph[g]._props.gain = 1.0;
					this.graph[g]._props.mute = false;
				} else if (this.graph[g].type === 'output') {
					this.graph[g]._audio_node = this.ac.destination;
					this.graph[g]._props = {};
					this.graph[g]._props.dopplerFactor = 1.0;
					this.graph[g]._props.pos_x = 0.0;
					this.graph[g]._props.pos_y = 0.0;
					this.graph[g]._props.pos_z = 0.0;
					this.graph[g]._props.vel_x = 0.0;
					this.graph[g]._props.vel_y = 0.0;
					this.graph[g]._props.vel_z = 0.0;
					this.graph[g]._props.ori_x = 0.0;
					this.graph[g]._props.ori_y = 0.0;
					this.graph[g]._props.ori_z = -1.0; // init forward
					this.graph[g]._props.oriup_x = 0.0;
					this.graph[g]._props.oriup_y = 1.0; // init up
					this.graph[g]._props.oriup_z = 0.0;
				} else {
					console.warn(`Palette.buildGraph(): type '${this.graph[g].type}' not supported`);
				}
			}
		}

		///// connect
		for (const nodeName in this.graph) {
			// skip connecting source/oscillator nodes here; this is done in _play()
			if (
				this.graph[nodeName].type &&
				this.graph[nodeName].type !== 'source' &&
				this.graph[nodeName].type !== 'oscillator'
			) {
				if (typeof this.graph[nodeName].dest === 'object') {
					for (const d in this.graph[nodeName].dest) {
						this.connectNodesByName(nodeName, this.graph[nodeName].dest[d]);
					}
				}
			}
		}
	}

	doMethod(name, args) {
		if (typeof this.methods[name] === 'undefined') {
			console.warn(`Palette: method['${name}'] is undefined.`);
			return;
		}

		DEBUG && console.log(`Palette.doMethod(${name}):`, this.methods[name]);
		const method = this.methods[name];
		let methParams;

		// any params to consider?
		if (typeof method.params === 'object') {
			// deep copy method.params and overwrite values from args{}
			methParams = JSON.parse(JSON.stringify(method.params));
			for (const mp in methParams) {
				// mp = variable name
				// methParams[mp] = value
				if (typeof args[mp] !== 'undefined') {
					methParams[mp] = args[mp];
				}
			}
			//console.log("...methParams copied:", methParams, args);
		}
		if (typeof method.steps.length !== 'undefined') {
			for (let s = 0; s < method.steps.length; s++) {
				for (const action in method.steps[s]) {
					for (const nodeName in method.steps[s][action]) {
						const nodeInfo = this.getGraphNode(nodeName);
						if (nodeInfo !== null) {
							if (typeof nodeInfo.type !== 'undefined') {
								// params
								let params = {};
								if (typeof method.steps[s][action][nodeName] === 'object') {
									// deep copy params and overwrite values from methParams{}
									params = JSON.parse(JSON.stringify(method.steps[s][action][nodeName]));
									if (typeof methParams !== 'undefined') {
										// must use recursive logic to dig into nested params objects
										//params = this.recursiveParamReplace(params, methParams);
										this.recursiveParamReplace(params, methParams);
									}
								}
								//console.log("...params saved:", params);

								if (action === 'play') {
									this._play(nodeName, nodeInfo, params);
								} else if (action === 'stop') {
									this._stop(nodeName, nodeInfo, params);
								} else if (action === 'set') {
									this._set(nodeName, nodeInfo, params);
								} else {
									console.warn(`Palette: method step type '${action}' not available.`);
								}
							} else {
								console.warn(`Palette: graph['${nodeName}'] does not have a type defined.`);
							}
						}
					}
				}
			}
		}
	}

	_fastFadeOutAndStopSource(sourceNode, gainNode, when = 0, skipFadeOut = false) {
		// FADE _audio_node quickly,
		// STOP _source_node 0.1s later, disconnect no earlier than 0.15s after fadeout started
		// delay issuance of that disconnection 0.2s after fadeout started.
		// skipFadeOut is used when immediately stopping any audioNodes as part of destroy()
		const nodesToDisconnect = [];
		if (gainNode) {
			if (skipFadeOut) {
				/**
				This line was present in the past -- correctly or not?  TODO: test more use cases and
				make sure things work properly without this line:
				//gainNode.gain.value = 0.0;
				*/
				gainNode.gain.setValueAtTime(0.0, when);
			} else {
				gainNode.gain.setTargetAtTime(0.0, when, 0.01);
			}
			nodesToDisconnect.push(gainNode);
		}
		if (sourceNode) {
			if (skipFadeOut) {
				sourceNode.stop(when);
			} else {
				sourceNode.stop(when + 0.1);
			}
			nodesToDisconnect.push(sourceNode);
		}
		if (gainNode && sourceNode) {
			if (skipFadeOut) {
				this.disconnectNodesAtTime(nodesToDisconnect, when);
			} else {
				setTimeout(() => {
					this.disconnectNodesAtTime(nodesToDisconnect, when + 0.15);
				}, 200);
			}
		}
	}

	// for _play, _stop, and _set:
	// nodeName = name of graph node
	// nodeInfo = details of node in graph, including ._audio_node and .props{}
	// params = method params for the play/stop/set stuff
	_play(nodeName, nodeInfo, params) {
		DEBUG && console.log('AUDEO PLAY: nodeName:', nodeName, 'nodeInfo:', nodeInfo, 'params:', params);
		if (nodeInfo.type === 'source') {
			if (typeof nodeInfo.sound !== 'undefined') {
				//console.log("PLAY: source node:", nodeName);

				// PLAY params (sound, delay, offset, and duration):
				if (params.sound) nodeInfo.sound = params.sound; // override
				let when = this.ac.currentTime;
				if (params.delay) when += params.delay;
				const offset = params.offset || 0.0;
				const duration = params.duration || null;

				// current nodes, if they're defined, may be busy at the moment, so...
				this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
				delete nodeInfo._audio_node;
				delete nodeInfo._source_node;

				// set buffer, copy props for _audio_node, and PLAY
				const buff = this.sounds[nodeInfo.sound].getBuffer(params.bufferSelection);
				if (buff) {
					// create NEW _source_node and _audio_node (gain) and connect to rest of graph
					nodeInfo._source_node = this.ac.createBufferSource();
					nodeInfo._audio_node = this.ac.createGain();
					nodeInfo._source_node.connect(nodeInfo._audio_node); // later disconnected in _fastFadeOutAndStopSource()
					if (typeof nodeInfo.dest === 'object') {
						for (const d in nodeInfo.dest) {
							this.connectNodesByName(nodeName, nodeInfo.dest[d]); // connects _audio_node to dest(s)
						}
					}

					nodeInfo._source_node.buffer = buff;
					nodeInfo._source_node.playbackRate.value = nodeInfo._props.playbackRate;
					nodeInfo._source_node.loop = nodeInfo._props.loop;
					nodeInfo._source_node.loopStart = nodeInfo._props.loopStart;
					nodeInfo._source_node.loopEnd = nodeInfo._props.loopEnd;

					// start buffer
					if (duration === null) {
						nodeInfo._source_node.start(when, offset);
					} else {
						nodeInfo._source_node.start(when, offset, duration);
					}
				} else {
					console.warn(
						`Palette._play(): graph[${nodeName}] no buff available for sound '${nodeInfo.sound}', skipping.`
					);
				}
			} else {
				console.warn(`Palette._play(): graph[${nodeName}].sound required, skipping.`);
			}
		} else if (nodeInfo.type === 'oscillator') {
			//console.log("PLAY: oscillator node:", nodeName);

			// "delay" is only parameter for PLAY
			let when = this.ac.currentTime;
			if (params.delay) when += params.delay;

			// current nodes, if they're defined, may be busy at the moment, so...
			this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
			delete nodeInfo._audio_node;
			delete nodeInfo._source_node;

			if (nodeInfo._props.frequency) {
				// create NEW _source_node and _audio_node (gain) and connect to rest of graph
				nodeInfo._source_node = this.ac.createOscillator();
				nodeInfo._audio_node = this.ac.createGain();
				nodeInfo._source_node.connect(nodeInfo._audio_node); // later disconnected in _fastFadeOutAndStopSource()
				if (typeof nodeInfo.dest === 'object') {
					for (const d in nodeInfo.dest) {
						this.connectNodesByName(nodeName, nodeInfo.dest[d]); // connects _audio_node to dest(s)
					}
				}

				// set waveform (sine is default), copy props for _audio_node, and PLAY
				if (typeof nodeInfo.waveform !== 'undefined') {
					nodeInfo._source_node.type = nodeInfo.waveform;
				}
				nodeInfo._source_node.frequency.value = nodeInfo._props.frequency;
				nodeInfo._source_node.detune.value = nodeInfo._props.detune;
				nodeInfo._source_node.start(when);
			}
		} else {
			console.warn(`Palette: graph['${nodeName}'].type 'source' or 'oscillator' required for 'play', skipping.`);
		}
	}

	_stop(nodeName, nodeInfo, params) {
		if (nodeInfo.type === 'source') {
			if (typeof nodeInfo.sound !== 'undefined') {
				//console.log("STOP: source node:", nodeName);

				// "delay" is only parameter for STOP
				let when = this.ac.currentTime;
				if (params.delay) when += params.delay;

				// current nodes, if they're defined, may be busy at the moment, so...
				this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
				delete nodeInfo._audio_node;
				delete nodeInfo._source_node;
			} else {
				console.warn(`Palette: graph['${nodeName}'].sound required for 'stop', skipping.`);
			}
		} else if (nodeInfo.type === 'oscillator') {
			//console.log("STOP: oscillator node:", nodeName);

			// "delay" is only parameter for STOP
			let when = this.ac.currentTime;
			if (params.delay) when += params.delay;

			// current nodes, if they're defined, may be busy at the moment, so...
			this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
			delete nodeInfo._audio_node;
			delete nodeInfo._source_node;
		} else {
			console.warn(`Palette: graph['${nodeName}'].type 'source/oscillator' required for 'stop', skipping.`);
		}
	}

	_set(nodeName, nodeInfo, params) {
		DEBUG && console.log('AUDEO SET: nodeName:', nodeName, 'nodeInfo:', nodeInfo, 'params:', params);

		// general params for basically any audioNode:
		const delay = params.delay || 0;
		const ramp = params.ramp || 0;
		const set_time = this.ac.currentTime + delay;
		delete params.delay;
		delete params.ramp;

		// iterate through remaining params:
		for (const p in params) {
			///// node specific
			// SOURCE
			if (nodeInfo.type === 'source') {
				if (p === 'loop') {
					nodeInfo._props.loop = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.loop = nodeInfo._props.loop;
					}
				} else if (p === 'loopStart') {
					nodeInfo._props.loopStart = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.loopStart = nodeInfo._props.loopStart;
					}
				} else if (p === 'loopEnd') {
					nodeInfo._props.loopEnd = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.loopEnd = nodeInfo._props.loopEnd;
					}
				} else if (p === 'playbackRate') {
					nodeInfo._props.playbackRate = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.playbackRate.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.playbackRate.value = nodeInfo._props.playbackRate;
							*/
							nodeInfo._source_node.playbackRate.setValueAtTime(nodeInfo._props.playbackRate, set_time);
						} else {
							nodeInfo._source_node.playbackRate.setTargetAtTime(
								nodeInfo._props.playbackRate,
								set_time,
								ramp
							);
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// OSCILLATOR
			else if (nodeInfo.type === 'oscillator') {
				if (p === 'frequency') {
					nodeInfo._props.frequency = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.frequency.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.frequency.value = nodeInfo._props.frequency;
							*/
							nodeInfo._source_node.frequency.setValueAtTime(nodeInfo._props.frequency, set_time);
						} else {
							nodeInfo._source_node.frequency.setTargetAtTime(nodeInfo._props.frequency, set_time, ramp);
						}
					}
				} else if (p === 'detune') {
					nodeInfo._props.detune = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.detune.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.detune.value = nodeInfo._props.detune;
							*/
							nodeInfo._source_node.detune.setValueAtTime(nodeInfo._props.detune, set_time);
						} else {
							nodeInfo._source_node.detune.setTargetAtTime(nodeInfo._props.detune, set_time, ramp);
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// WAVESHAPER
			else if (nodeInfo.type === 'waveshaper') {
				if (p === 'curve') {
					// TODO: check that it's an Array incoming
					// copy incoming regular Array "params[p]" to Float32Array[] object "nodeInfo._props.curve"
					// first create new Float32Array[]
					const floater_len = params[p].length;
					const floater = new Float32Array(floater_len);
					for (let ci = 0; ci < floater_len; ci++) {
						floater[ci] = params[p][ci];
					}
					nodeInfo._props.curve = floater;
					DEBUG && console.log('GOT new CURVE of length: ', nodeInfo._props.curve.length);
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.curve = nodeInfo._props.curve;
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// GAIN
			else if (nodeInfo.type === 'gain') {
				if (p === 'gain') {
					nodeInfo._props.gain = params[p];
					if (nodeInfo._audio_node && !nodeInfo.mute) {
						nodeInfo._audio_node.gain.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
							*/
							nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, set_time);
						} else {
							nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, set_time, ramp);
						}
					}
				} else if (p === 'gain_curve') {
					// get gain_curve array (ie [0,1] would be a linear fade in from 0 to 1)
					// copy to Float32Array[]
					const floater_len = params[p].length;
					const floater = new Float32Array(floater_len);
					for (let ci = 0; ci < floater_len; ci++) {
						floater[ci] = params[p][ci];
					}
					nodeInfo._props.gain_curve = floater;
					if (nodeInfo._audio_node && !nodeInfo.mute) {
						nodeInfo._audio_node.gain.cancelScheduledValues(set_time);
						if (ramp > 0) {
							nodeInfo._audio_node.gain.setValueCurveAtTime(nodeInfo._props.gain_curve, set_time, ramp);
						} else {
							console.warn(`Palette._set(): can't schedule volume curve without ramp duration provided`);
						}
					}
				} else if (p === 'mute') {
					nodeInfo._props.mute = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.gain.cancelScheduledValues(set_time);
						if (ramp === 0) {
							if (nodeInfo._props.mute) {
								/**
								This line was present in the past -- correctly or not?  TODO: test more use cases and
								make sure things work properly without this line:
								//nodeInfo._audio_node.gain.value = 0.0;
								*/
								nodeInfo._audio_node.gain.setValueAtTime(0.0, set_time);
							} else {
								/**
								This line was present in the past -- correctly or not?  TODO: test more use cases and
								make sure things work properly without this line:
								//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
								*/
								nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, set_time);
							}
						} else {
							if (nodeInfo._props.mute) {
								nodeInfo._audio_node.gain.setTargetAtTime(0.0, set_time, ramp);
							} else {
								nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, set_time, ramp);
							}
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// ECHO
			else if (nodeInfo.type === 'echo') {
				if (p === 'delayTime') {
					nodeInfo._props.delayTime = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.delayTime.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.delayTime.value = nodeInfo._props.delayTime;
							*/
							nodeInfo._audio_node.delayTime.setValueAtTime(nodeInfo._props.delayTime, set_time);
						} else {
							nodeInfo._audio_node.delayTime.setTargetAtTime(nodeInfo._props.delayTime, set_time, ramp);
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// CONVOLVER
			else if (nodeInfo.type === 'convolver') {
				if (p === 'sound') {
					nodeInfo._props.sound = params[p];
					if (nodeInfo._audio_node) {
						const buff = this.sounds[nodeInfo._props.sound].getBuffer();
						if (buff) {
							nodeInfo._audio_node.buffer = buff;
						} else {
							console.warn(
								`Palette._set(): CONVOLVER: no buffer ready for sound '${nodeInfo._props.sound}'`
							);
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// FILTER
			else if (nodeInfo.type === 'filter') {
				if (p === 'gain') {
					nodeInfo._props.gain = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.gain.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
							*/
							nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, set_time);
						} else {
							nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, set_time, ramp);
						}
					}
				} else if (p === 'frequency') {
					nodeInfo._props.frequency = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.frequency.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.frequency.value = nodeInfo._props.frequency;
							*/
							nodeInfo._audio_node.frequency.setValueAtTime(nodeInfo._props.frequency, set_time);
						} else {
							nodeInfo._audio_node.frequency.setTargetAtTime(nodeInfo._props.frequency, set_time, ramp);
						}
					}
				} else if (p === 'Q') {
					nodeInfo._props.Q = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.Q.cancelScheduledValues(set_time);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.Q.value = nodeInfo._props.Q;
							*/
							nodeInfo._audio_node.Q.setValueAtTime(nodeInfo._props.Q, set_time);
						} else {
							nodeInfo._audio_node.Q.setTargetAtTime(nodeInfo._props.Q, set_time, ramp);
						}
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// ANALYSER
			else if (nodeInfo.type === 'analyser') {
				if (p === 'fftSize') {
					nodeInfo._props.fftSize = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.fftSize = nodeInfo._props.fftSize;
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// SCRIPT
			else if (nodeInfo.type === 'script') {
				if (p === 'func') {
					nodeInfo._props.onaudioprocess = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.onaudioprocess = nodeInfo._props.onaudioprocess;
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// PANNER
			else if (nodeInfo.type === 'panner') {
				if (p === 'position') {
					// update position only when we need to
					if (
						nodeInfo._props.pos_x !== params[p].x ||
						nodeInfo._props.pos_y !== params[p].y ||
						nodeInfo._props.pos_z !== params[p].z
					) {
						//console.log("...updating sound position:", params[p].x, params[p].y, params[p].z);
						nodeInfo._props.pos_x = params[p].x;
						nodeInfo._props.pos_y = params[p].y;
						nodeInfo._props.pos_z = params[p].z;
						if (nodeInfo._audio_node) {
							nodeInfo._audio_node.setPosition(
								nodeInfo._props.pos_x,
								nodeInfo._props.pos_y,
								nodeInfo._props.pos_z
							);
						}
					}
				} else if (p === 'velocity') {
					// update velocity only when we need to
					if (
						nodeInfo._props.vel_x !== params[p].x ||
						nodeInfo._props.vel_y !== params[p].y ||
						nodeInfo._props.vel_z !== params[p].z
					) {
						nodeInfo._props.vel_x = params[p].x;
						nodeInfo._props.vel_y = params[p].y;
						nodeInfo._props.vel_z = params[p].z;
						if (nodeInfo._audio_node) {
							nodeInfo._audio_node.setVelocity(
								nodeInfo._props.vel_x,
								nodeInfo._props.vel_y,
								nodeInfo._props.vel_z
							);
						}
					}
				} else if (p === 'distanceModel') {
					nodeInfo._props.distanceModel = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.distanceModel = nodeInfo._props.distanceModel;
					}
				} else if (p === 'refDistance') {
					nodeInfo._props.refDistance = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.refDistance = nodeInfo._props.refDistance;
					}
				} else if (p === 'maxDistance') {
					nodeInfo._props.maxDistance = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.maxDistance = nodeInfo._props.maxDistance;
					}
				} else if (p === 'rolloffFactor') {
					nodeInfo._props.rolloffFactor = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.rolloffFactor = nodeInfo._props.rolloffFactor;
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// COMPRESSOR
			else if (nodeInfo.type === 'compressor') {
				// TBD
			}
			// OUTPUT
			else if (nodeInfo.type === 'output') {
				if (p === 'position') {
					// update position only when we need to
					if (
						nodeInfo._props.pos_x !== params[p].x ||
						nodeInfo._props.pos_y !== params[p].y ||
						nodeInfo._props.pos_z !== params[p].z
					) {
						//console.log("updating listener:", params[p].x, params[p].y, params[p].z);
						nodeInfo._props.pos_x = params[p].x;
						nodeInfo._props.pos_y = params[p].y;
						nodeInfo._props.pos_z = params[p].z;
						if (this.ac.listener) {
							this.ac.listener.setPosition(
								nodeInfo._props.pos_x,
								nodeInfo._props.pos_y,
								nodeInfo._props.pos_z
							);
						}
					}
				} else if (p === 'velocity') {
					// update velocity only when we need to
					if (
						nodeInfo._props.vel_x !== params[p].x ||
						nodeInfo._props.vel_y !== params[p].y ||
						nodeInfo._props.vel_z !== params[p].z
					) {
						nodeInfo._props.vel_x = params[p].x;
						nodeInfo._props.vel_y = params[p].y;
						nodeInfo._props.vel_z = params[p].z;
						if (this.ac.listener) {
							this.ac.listener.setVelocity(
								nodeInfo._props.vel_x,
								nodeInfo._props.vel_y,
								nodeInfo._props.vel_z
							);
						}
					}
				} else if (p === 'orientation') {
					// update orientation only when we need to
					if (
						nodeInfo._props.ori_x !== params[p].x ||
						nodeInfo._props.ori_y !== params[p].y ||
						nodeInfo._props.ori_z !== params[p].z ||
						nodeInfo._props.oriup_x !== params[p].upx ||
						nodeInfo._props.oriup_y !== params[p].upy ||
						nodeInfo._props.oriup_z !== params[p].upz
					) {
						nodeInfo._props.ori_x = params[p].x;
						nodeInfo._props.ori_y = params[p].y;
						nodeInfo._props.ori_z = params[p].z;
						nodeInfo._props.oriup_x = params[p].upx;
						nodeInfo._props.oriup_y = params[p].upy;
						nodeInfo._props.oriup_z = params[p].upz;
						if (this.ac.listener) {
							DEBUG && console.log(`Palette._set(): setting listener orientation:`, nodeInfo._props);
							this.ac.listener.setOrientation(
								nodeInfo._props.ori_x,
								nodeInfo._props.ori_y,
								nodeInfo._props.ori_z,
								nodeInfo._props.oriup_x,
								nodeInfo._props.oriup_y,
								nodeInfo._props.oriup_z
							);
						}
					}
				} else if (p === 'dopplerFactor') {
					nodeInfo._props.dopplerFactor = params[p];
					if (this.ac.listener) {
						this.ac.listener.dopplerFactor = nodeInfo._props.dopplerFactor;
					}
				} else {
					console.warn(`Palette._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			} else {
				// unknown node type
				console.warn(`Palette._set(): type '${nodeInfo.type}' is unknown`);
			}
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Oddio {
	//static instance;

	constructor() {
		// this is a singleton service
		if (Oddio.instance) return Oddio.instance;
		Oddio.instance = this;

		// members
		this.ac = null; // AudioContext
		this.buffs = {}; // key = filename, value = Buff instance
		this.palettes = []; // array of Palettes

		this.playheadParams = {
			audioContextTime: 0,
			playheadTime: 0,
			playheadSpeed: 1.0
		};
	}

	async init() {
		if (this.ac) {
			console.warn(`Oddio.init(): already initialized!`);
			return;
		}
		try {
			this.ac = new (window.AudioContext || window.webkitAudioContext)();
		} catch (err) {
			console.error(err);
			return Promise.reject(err);
		}
		DEBUG && console.log(`Oddio.init():`, this.ac);
	}

	async destroy() {
		if (!this.ac) {
			console.warn(`Oddio.destroy(): Oddio.init() was never called, skipping.`);
			return;
		}
		// returns promise when done clearing all references to AudioBuffers and
		// other WebAudio objects, and closing audioContext

		// TODO: stop/fadeout everything over some duration first?

		// close AudioContext
		await this.ac
			.close()
			.then(() => {
				this.buffs = {};
				this.palettes.forEach((pal) => pal.destroy()); // do this _before_ ac.close()?
				this.palettes = [];
				this.ac = null;
				DEBUG && console.log(`Oddio.destroy(): complete`);
			})
			.catch(console.warn);
	}

	async resume() {
		// is this used for un-pausing the audiosystem time?
		if (!this.ac) {
			console.warn(`Oddio.resume(): Oddio.init() was never called, skipping.`);
			return;
		}
		await this.ac
			.resume()
			.then(() => {
				DEBUG && console.log(`Oddio.resume(): new state = ${this.ac.state}`);
			})
			.catch(console.warn);
	}

	async suspend() {
		// is this used for pausing the audiosystem time?
		if (!this.ac) {
			console.warn(`Oddio.suspend(): Oddio.init() was never called, skipping.`);
			return;
		}
		await this.ac
			.suspend()
			.then(() => {
				DEBUG && console.log(`Oddio.suspend(): new state = ${this.ac.state}`);
			})
			.catch(console.warn);
	}

	getAC() {
		return this.ac;
	}

	isSuspended() {
		// return undefined if audioContext hasn't been created, otherwise boolean.
		if (!this.ac) {
			console.warn(`Oddio.isSuspended(): Oddio.init() was never called, skipping.`);
			return;
		}
		return this.ac.state === 'suspended';
	}

	getPlayheadNow() {
		const currentTime = this.ac?.currentTime || 0;
		return Object.assign(this.playheadParams, {
			currentTime,
			now: ((currentTime - this.playheadParams.audioContextTime) * this.playheadParams.playheadSpeed)
				+ this.playheadParams.playheadTime
		});
	}

	setPlayheadParams(opts = {}) {
		// if opts.audioContextTime is undefined, then use currentTime
		const playheadNow = this.getPlayheadNow();
		this.playheadParams = {
			audioContextTime: playheadNow.currentTime,
			playheadTime: (typeof opts.playheadTime === 'number')
				? opts.playheadTime
				: playheadNow.now,
			playheadSpeed: (typeof opts.playheadSpeed === 'number')
				? opts.playheadSpeed
				: playheadNow.playheadSpeed
		};
		return this.getPlayheadNow();
	}

	/* BUFFS */
	async load(fileOrFiles = []) {
		// file (URI string) or files (array of URI strings) accepted
		fileOrFiles = typeof fileOrFiles === 'string' ? [fileOrFiles] : fileOrFiles.slice(0);

		// remove falsies and dedupe
		fileOrFiles.filter((elem, pos, arr) => elem && arr.indexOf(elem) === pos);

		const promises = fileOrFiles.map((filename) => {
			if (!this.buffs[filename]) {
				this.buffs[filename] = new Buff(this.ac, filename);
			}
			return this.buffs[filename].load();
		});

		await Promise.all(promises);
	}

	unload(fileOrFiles = []) {
		// file (URI string) or files (array of URI strings) accepted
		fileOrFiles = typeof fileOrFiles === 'string' ? [fileOrFiles] : fileOrFiles.slice(0);

		// remove falsies and dedupe
		fileOrFiles.filter((elem, pos, arr) => elem && arr.indexOf(elem) === pos);

		fileOrFiles.forEach((filename) => {
			if (this.buffs[filename]) {
				this.buffs[filename].unload();
				delete this.buffs[filename];
			} else {
				console.warn(`Oddio.unload(): no Buff for ${filename}`);
			}
		});

		// TODO also remove all references to these audio files from all Sounds?
	}

	getBuff(filename = '') {
		return this.buffs[filename];
	}

	/* INSTANCES */
	createPalette(config = {}, id) {
		DEBUG && console.log(`Oddio.createPalette() [id: '${id}', type: '${config.type}']`);

		// if config.singleton, then return already existing palette of the same config.type
		if (config.singleton) {
			const foundPal = this.palettes.find((pal) => pal.type === config.type);
			if (foundPal) {
				console.warn(
					`Oddio.createPalette() singleton alert! Already created one of type '${config.type}', returning it instead of creating another`
				);
				return foundPal;
			}
		}

		// throw a warning if another palette has the same id?

		const pal = new Palette(config, id);
		this.palettes.push(pal);
		DEBUG &&
			console.log(
				`Oddio.createPalette() success [id: '${pal.id}', type: '${pal.type}'], ${this.palettes.length} palettes total`
			);
		return pal;
	}

	destroyPalette(pal) {
		// tries to clear references to stuff, if possible.  always returns null.
		if (!pal) return null;

		DEBUG && console.log(`Oddio.destroyPalette() [id: '${pal.id}', type: '${pal.type}']`);

		const idx = this.palettes.indexOf(pal);
		if (idx > -1) {
			this.palettes.splice(idx, 1);
			pal.destroy();
			DEBUG &&
				console.log(
					`Oddio.destroyPalette() success [id: '${pal.id}', type: '${pal.type}'], ${this.palettes.length} palettes remain`
				);
		} else {
			DEBUG &&
				console.warn(`Oddio.destroyPalette() palette not found, ${this.palettes.length} palettes still remain`);
		}

		return null;
	}

	getPalettesWithPublicNodes() {
		// used internally when connecting one palette's graph to another
		return this.palettes.filter((pal) => pal.publicNodes);
	}

	getPalettesByType(type) {
		// return array of matches, empty array if none
		if (!type) {
			console.warn(`Oddio.getPalettesByType() failure: specify a type`);
			return;
		}

		// throw warning if there are 0
		const matchingPalettes = this.palettes.filter((pal) => pal.type === type);
		if (matchingPalettes.length === 0) {
			DEBUG && console.warn(`Oddio.getPalettesByType(): no palettes of type '${type}'`);
		}
		return matchingPalettes;
	}

	getPaletteById(id) {
		// return one, or undefined if no matches
		if (!id) {
			console.warn(`Oddio.getPaletteById() failure: specify a non-falsy id`);
			return;
		}

		// throw warning if there are 0 or > 1
		const matchingPalettes = this.palettes.filter((pal) => pal.id === id);
		if (matchingPalettes.length === 0) {
			DEBUG && console.warn(`Oddio.getPaletteById(): no palettes with id of '${id}'`);
			return;
		} else if (matchingPalettes.length > 1) {
			console.warn(
				`Oddio.getPaletteById(): ${matchingPalettes.length} palettes with id '${id}', returning first one`
			);
		}

		// return first match
		return matchingPalettes[0];
	}
}

export default new Oddio();
