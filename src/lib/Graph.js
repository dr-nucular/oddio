import Oddio from './Oddio';

const DEBUG = false;

class Graph {
	constructor(config) {
		this.config = config;
	}

	getConfig() {
		return this.config;
	}
}

class Voice {
	constructor(graph, id) {
		const config = graph.getConfig();

		this.id = id; // optional identifier
		this.graphId = config.id || null;
		this.publicNodes = config.publicNodes || false;
		this.singleton = config.singleton || false;

		this.graph = null;
		this.methods = null;
		this.graphNodes = [];
		this.ac = Oddio.getAC();

		// clone config's graph
		if (config && config.graph) {
			this.graph = JSON.parse(JSON.stringify(config.graph));
		} else {
			console.warn(`Voice.constructor(): config's graph is undefined`);
		}

		// clone config's methods
		if (config && config.methods) {
			this.methods = JSON.parse(JSON.stringify(config.methods));
		} else {
			console.warn(`Voice.constructor(): config's methods are undefined`);
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
			console.warn("Voice.getGraphNode("+name+") is undefined.");
		}
		*/
		return result;
	}

	connectNodesByName(a, b) {
		const nodeA = this.getGraphNode(a);
		let nodeB = this.getGraphNode(b);
		if (nodeA !== null) {
			// if nodeB is null, look in other voices with publicNodes, use the first one it finds
			if (nodeB === null) {
				const otherVoices = Oddio.getVoicesWithPublicNodes();
				for (let op = 0; op < otherVoices.length; op++) {
					nodeB = otherVoices[op].getGraphNode(b);
					if (nodeB !== null) break;
				}
			}

			// connect if both nodes were found!
			if (nodeB !== null) {
				if (typeof nodeA._audio_node !== 'undefined' && typeof nodeB._audio_node !== 'undefined') {
					nodeA._audio_node.connect(nodeB._audio_node);
					DEBUG && console.log(`Voice.connectNodesByName(${a}, ${b}): success`);
					if (nodeA.type !== 'source' && nodeA.type !== 'oscillator') {
						this.graphNodes.push(nodeA._audio_node);
						DEBUG && console.log(`...${a} also added to graphNodes array for disconnection later`);
					}
					return;
				}
			}
		}
		console.warn(`Voice.connectNodesByName(${a}, ${b}): failure`);
	}

	disconnectNodesAtTime(nodes = [], when = 0) {
		DEBUG && console.log(`Voice.disconnectNodesAtTime():`, nodes, when);
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
			console.warn(`Voice.buildGraph(): no graph data defined`);
			return;
		}

		// create
		for (const g in this.graph) {
			// g = name of node, this.graph[g] = { node info }
			if (typeof this.graph[g]._audio_node === 'undefined' && typeof this.graph[g].type !== 'undefined') {
				DEBUG && console.log(`Voice.buildGraph(): CREATING NODE '${g}'`);
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
					if (this.graph[g].panningModel) {
						this.graph[g]._audio_node.panningModel = this.graph[g].panningModel;
					}
					this.graph[g]._props = {};
					//this.graph[g]._props.panningModel = 'equalpower'; // TODO
					this.graph[g]._props.distanceModel = 'inverse';
					this.graph[g]._props.refDistance = 1; // min distance
					this.graph[g]._props.maxDistance = 10000; // max distance
					this.graph[g]._props.rolloffFactor = 1;
					this.graph[g]._props.positionX = 0;
					this.graph[g]._props.positionY = 0;
					this.graph[g]._props.positionZ = 0;
					this.graph[g]._props.orientationX = 1;
					this.graph[g]._props.orientationY = 0;
					this.graph[g]._props.orientationZ = 0;
				} else if (this.graph[g].type === 'compressor') {
					this.graph[g]._audio_node = this.ac.createDynamicsCompressor();
					this.graph[g]._props = {};
					this.graph[g]._props.gain = 1.0;
					this.graph[g]._props.mute = false;
				} else if (this.graph[g].type === 'output') {
					this.graph[g]._audio_node = this.ac.destination;
					this.graph[g]._props = {};
					this.graph[g]._props.positionX = 0;
					this.graph[g]._props.positionY = 0;
					this.graph[g]._props.positionZ = 0;
					this.graph[g]._props.forwardX = 0;
					this.graph[g]._props.forwardY = 0;
					this.graph[g]._props.forwardZ = -1;
					this.graph[g]._props.upX = 0;
					this.graph[g]._props.upY = 1;
					this.graph[g]._props.upZ = 0;

					console.log(`Voice.buildGraph(): output numberOfInputs:`, this.ac.destination.numberOfInputs);
					console.log(`Voice.buildGraph(): output numberOfOutputs:`, this.ac.destination.numberOfOutputs);
					console.log(`Voice.buildGraph(): output channelCount:`, this.ac.destination.channelCount);
					console.log(`Voice.buildGraph(): output channelCountMode:`, this.ac.destination.channelCountMode);
					console.log(`Voice.buildGraph(): output channelInterpretation:`, this.ac.destination.channelInterpretation);
	
				} else {
					console.warn(`Voice.buildGraph(): type '${this.graph[g].type}' not supported`);
				}
			}
		}

		// connect
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
			console.warn(`Voice: method['${name}'] is undefined.`);
			return;
		}

		DEBUG && console.log(`Voice.doMethod(${name}):`, this.methods[name]);
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
									console.warn(`Voice: method step type '${action}' not available.`);
								}
							} else {
								console.warn(`Voice: graph['${nodeName}'] does not have a type defined.`);
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
	// params = method params for _play/_stop/_set
	_play(nodeName, nodeInfo, params) {
		DEBUG && console.log('ODDIO PLAY: nodeName:', nodeName, 'nodeInfo:', nodeInfo, 'params:', params);
		if (nodeInfo.type === 'source') {

			if (params.sound) nodeInfo.sound = params.sound; // override

			if (typeof nodeInfo.sound !== 'undefined') {
				//console.log("PLAY: source node:", nodeName);
				// PLAY params: sound (override above), when, delay, offset, duration
				let when = params.when ?? this.ac.currentTime;
				if (params.delay) when += params.delay;
				const offset = params.offset || 0.0;
				const duration = params.duration || undefined;

				// current nodes, if they're defined, may be busy at the moment, so...
				this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
				delete nodeInfo._audio_node;
				delete nodeInfo._source_node;

				// set buffer, copy props for _audio_node, and PLAY
				const buff = Oddio.getSound(nodeInfo.sound).getBuffer(params.bufferSelection);
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
					nodeInfo._source_node.start(when, offset, duration);
				} else {
					console.warn(
						`Voice._play(): graph[${nodeName}] no buff available for sound '${nodeInfo.sound}', skipping.`
					);
				}
			} else {
				console.warn(`Voice._play(): graph[${nodeName}].sound (or sound override) required, skipping.`);
			}
		} else if (nodeInfo.type === 'oscillator') {
			//console.log("PLAY: oscillator node:", nodeName);
			// PLAY params: when, delay
			
			let when = params.when ?? this.ac.currentTime;
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
			console.warn(`Voice: graph['${nodeName}'].type 'source' or 'oscillator' required for 'play', skipping.`);
		}
	}

	_stop(nodeName, nodeInfo, params) {
		DEBUG && console.log('ODDIO STOP: nodeName:', nodeName, 'nodeInfo:', nodeInfo, 'params:', params);
		if (nodeInfo.type === 'source') {
			if (typeof nodeInfo.sound !== 'undefined') {
				//console.log("STOP: source node:", nodeName);

				// STOP params: when, delay
				let when = params.when ?? this.ac.currentTime;
				if (params.delay) when += params.delay;

				// current nodes, if they're defined, may be busy at the moment, so...
				this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
				delete nodeInfo._audio_node;
				delete nodeInfo._source_node;
			} else {
				console.warn(`Voice: graph['${nodeName}'].sound required for 'stop', skipping.`);
			}
		} else if (nodeInfo.type === 'oscillator') {
			//console.log("STOP: oscillator node:", nodeName);

			// STOP params: when, delay
			let when = params.when ?? this.ac.currentTime;
			if (params.delay) when += params.delay;

			// current nodes, if they're defined, may be busy at the moment, so...
			this._fastFadeOutAndStopSource(nodeInfo._source_node, nodeInfo._audio_node, when);
			delete nodeInfo._audio_node;
			delete nodeInfo._source_node;
		} else {
			console.warn(`Voice: graph['${nodeName}'].type 'source/oscillator' required for 'stop', skipping.`);
		}
	}

	_set(nodeName, nodeInfo, params) {
		DEBUG && console.log('ODDIO SET: nodeName:', nodeName, 'nodeInfo:', nodeInfo, 'params:', params);

		// general SET params: when, delay, ramp
		let when = params.when ?? this.ac.currentTime;
		if (params.delay) when += params.delay;
		const ramp = params.ramp || 0;
		delete params.when;
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
						nodeInfo._source_node.playbackRate.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.playbackRate.value = nodeInfo._props.playbackRate;
							*/
							nodeInfo._source_node.playbackRate.setValueAtTime(nodeInfo._props.playbackRate, when);
						} else {
							nodeInfo._source_node.playbackRate.setTargetAtTime(
								nodeInfo._props.playbackRate,
								when,
								ramp
							);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// OSCILLATOR
			else if (nodeInfo.type === 'oscillator') {
				if (p === 'frequency') {
					nodeInfo._props.frequency = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.frequency.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.frequency.value = nodeInfo._props.frequency;
							*/
							nodeInfo._source_node.frequency.setValueAtTime(nodeInfo._props.frequency, when);
						} else {
							nodeInfo._source_node.frequency.setTargetAtTime(nodeInfo._props.frequency, when, ramp);
						}
					}
				} else if (p === 'detune') {
					nodeInfo._props.detune = params[p];
					if (nodeInfo._source_node) {
						nodeInfo._source_node.detune.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._source_node.detune.value = nodeInfo._props.detune;
							*/
							nodeInfo._source_node.detune.setValueAtTime(nodeInfo._props.detune, when);
						} else {
							nodeInfo._source_node.detune.setTargetAtTime(nodeInfo._props.detune, when, ramp);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
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
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// GAIN
			else if (nodeInfo.type === 'gain') {
				if (p === 'gain') {
					nodeInfo._props.gain = params[p];
					if (nodeInfo._audio_node && !nodeInfo.mute) {
						nodeInfo._audio_node.gain.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
							*/
							nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, when);
						} else {
							nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, when, ramp);
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
						nodeInfo._audio_node.gain.cancelScheduledValues(when);
						if (ramp > 0) {
							nodeInfo._audio_node.gain.setValueCurveAtTime(nodeInfo._props.gain_curve, when, ramp);
						} else {
							console.warn(`Voice._set(): can't schedule volume curve without ramp duration provided, setting to final curve value ${floater[floater_len - 1]} at time ${when}`);
							nodeInfo._audio_node.gain.setValueAtTime(floater[floater_len - 1], when);
						}
					}
				} else if (p === 'mute') {
					nodeInfo._props.mute = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.gain.cancelScheduledValues(when);
						if (ramp === 0) {
							if (nodeInfo._props.mute) {
								/**
								This line was present in the past -- correctly or not?  TODO: test more use cases and
								make sure things work properly without this line:
								//nodeInfo._audio_node.gain.value = 0.0;
								*/
								nodeInfo._audio_node.gain.setValueAtTime(0.0, when);
							} else {
								/**
								This line was present in the past -- correctly or not?  TODO: test more use cases and
								make sure things work properly without this line:
								//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
								*/
								nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, when);
							}
						} else {
							if (nodeInfo._props.mute) {
								nodeInfo._audio_node.gain.setTargetAtTime(0.0, when, ramp);
							} else {
								nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, when, ramp);
							}
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// ECHO
			else if (nodeInfo.type === 'echo') {
				if (p === 'delayTime') {
					nodeInfo._props.delayTime = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.delayTime.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.delayTime.value = nodeInfo._props.delayTime;
							*/
							nodeInfo._audio_node.delayTime.setValueAtTime(nodeInfo._props.delayTime, when);
						} else {
							nodeInfo._audio_node.delayTime.setTargetAtTime(nodeInfo._props.delayTime, when, ramp);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// CONVOLVER
			else if (nodeInfo.type === 'convolver') {
				if (p === 'sound') {
					nodeInfo._props.sound = params[p];
					if (nodeInfo._audio_node) {
						const buff = Oddio.getSound(nodeInfo._props.sound).getBuffer();
						if (buff) {
							nodeInfo._audio_node.buffer = buff;
						} else {
							console.warn(
								`Voice._set(): CONVOLVER: no buffer ready for sound '${nodeInfo._props.sound}'`
							);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// FILTER
			else if (nodeInfo.type === 'filter') {
				if (p === 'gain') {
					nodeInfo._props.gain = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.gain.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.gain.value = nodeInfo._props.gain;
							*/
							nodeInfo._audio_node.gain.setValueAtTime(nodeInfo._props.gain, when);
						} else {
							nodeInfo._audio_node.gain.setTargetAtTime(nodeInfo._props.gain, when, ramp);
						}
					}
				} else if (p === 'frequency') {
					nodeInfo._props.frequency = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.frequency.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.frequency.value = nodeInfo._props.frequency;
							*/
							nodeInfo._audio_node.frequency.setValueAtTime(nodeInfo._props.frequency, when);
						} else {
							nodeInfo._audio_node.frequency.setTargetAtTime(nodeInfo._props.frequency, when, ramp);
						}
					}
				} else if (p === 'Q') {
					nodeInfo._props.Q = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.Q.cancelScheduledValues(when);
						if (ramp === 0) {
							/**
							This line was present in the past -- correctly or not?  TODO: test more use cases and
							make sure things work properly without this line:
							//nodeInfo._audio_node.Q.value = nodeInfo._props.Q;
							*/
							nodeInfo._audio_node.Q.setValueAtTime(nodeInfo._props.Q, when);
						} else {
							nodeInfo._audio_node.Q.setTargetAtTime(nodeInfo._props.Q, when, ramp);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
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
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
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
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// PANNER
			else if (nodeInfo.type === 'panner') {
				if (p === 'positionX') {
					nodeInfo._props.positionX = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.positionX.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.positionX.setValueAtTime(nodeInfo._props.positionX, when);
						} else {
							nodeInfo._audio_node.positionX.setTargetAtTime(nodeInfo._props.positionX, when, ramp);
						}
					}
				} else if (p === 'positionY') {
					nodeInfo._props.positionY = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.positionY.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.positionY.setValueAtTime(nodeInfo._props.positionY, when);
						} else {
							nodeInfo._audio_node.positionY.setTargetAtTime(nodeInfo._props.positionY, when, ramp);
						}
					}
				} else if (p === 'positionZ') {
					nodeInfo._props.positionZ = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.positionZ.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.positionZ.setValueAtTime(nodeInfo._props.positionZ, when);
						} else {
							nodeInfo._audio_node.positionZ.setTargetAtTime(nodeInfo._props.positionZ, when, ramp);
						}
					}
				} else if (p === 'orientationX') {
					nodeInfo._props.orientationX = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.orientationX.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.orientationX.setValueAtTime(nodeInfo._props.orientationX, when);
						} else {
							nodeInfo._audio_node.orientationX.setTargetAtTime(nodeInfo._props.orientationX, when, ramp);
						}
					}
				} else if (p === 'orientationY') {
					nodeInfo._props.orientationY = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.orientationY.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.orientationY.setValueAtTime(nodeInfo._props.orientationY, when);
						} else {
							nodeInfo._audio_node.orientationY.setTargetAtTime(nodeInfo._props.orientationY, when, ramp);
						}
					}
				} else if (p === 'orientationZ') {
					nodeInfo._props.orientationZ = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.orientationZ.cancelScheduledValues(when);
						if (ramp === 0) {
							nodeInfo._audio_node.orientationZ.setValueAtTime(nodeInfo._props.orientationZ, when);
						} else {
							nodeInfo._audio_node.orientationZ.setTargetAtTime(nodeInfo._props.orientationZ, when, ramp);
						}
					}
				} else if (p === 'panningModel') {
					nodeInfo._props.panningModel = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.panningModel = nodeInfo._props.panningModel;
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
				} else if (p === 'coneInnerAngle') {
					nodeInfo._props.coneInnerAngle = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.coneInnerAngle = nodeInfo._props.coneInnerAngle;
					}
				} else if (p === 'coneOuterAngle') {
					nodeInfo._props.coneOuterAngle = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.coneOuterAngle = nodeInfo._props.coneOuterAngle;
					}
				} else if (p === 'coneOuterGain') {
					nodeInfo._props.coneOuterGain = params[p];
					if (nodeInfo._audio_node) {
						nodeInfo._audio_node.coneOuterGain = nodeInfo._props.coneOuterGain;
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			}
			// COMPRESSOR
			else if (nodeInfo.type === 'compressor') {
				// TBD
			}
			// OUTPUT
			else if (nodeInfo.type === 'output') {

				if (p === 'positionX') {
					nodeInfo._props.positionX = params[p];
					if (this.ac.listener) {
						this.ac.listener.positionX.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.positionX.setValueAtTime(nodeInfo._props.positionX, when);
						} else {
							this.ac.listener.positionX.setTargetAtTime(nodeInfo._props.positionX, when, ramp);
						}
					}
				} else if (p === 'positionY') {
					nodeInfo._props.positionY = params[p];
					if (this.ac.listener) {
						this.ac.listener.positionY.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.positionY.setValueAtTime(nodeInfo._props.positionY, when);
						} else {
							this.ac.listener.positionY.setTargetAtTime(nodeInfo._props.positionY, when, ramp);
						}
					}
				} else if (p === 'positionZ') {
					nodeInfo._props.positionZ = params[p];
					if (this.ac.listener) {
						this.ac.listener.positionZ.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.positionZ.setValueAtTime(nodeInfo._props.positionZ, when);
						} else {
							this.ac.listener.positionZ.setTargetAtTime(nodeInfo._props.positionZ, when, ramp);
						}
					}
				} else if (p === 'forwardX') {
					nodeInfo._props.forwardX = params[p];
					if (this.ac.listener) {
						this.ac.listener.forwardX.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.forwardX.setValueAtTime(nodeInfo._props.forwardX, when);
						} else {
							this.ac.listener.forwardX.setTargetAtTime(nodeInfo._props.forwardX, when, ramp);
						}
					}
				} else if (p === 'forwardY') {
					nodeInfo._props.forwardY = params[p];
					if (this.ac.listener) {
						this.ac.listener.forwardY.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.forwardY.setValueAtTime(nodeInfo._props.forwardY, when);
						} else {
							this.ac.listener.forwardY.setTargetAtTime(nodeInfo._props.forwardY, when, ramp);
						}
					}
				} else if (p === 'forwardZ') {
					nodeInfo._props.forwardZ = params[p];
					if (this.ac.listener) {
						this.ac.listener.forwardZ.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.forwardZ.setValueAtTime(nodeInfo._props.forwardZ, when);
						} else {
							this.ac.listener.forwardZ.setTargetAtTime(nodeInfo._props.forwardZ, when, ramp);
						}
					}
				} else if (p === 'upX') {
					nodeInfo._props.upX = params[p];
					if (this.ac.listener) {
						this.ac.listener.upX.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.upX.setValueAtTime(nodeInfo._props.upX, when);
						} else {
							this.ac.listener.upX.setTargetAtTime(nodeInfo._props.upX, when, ramp);
						}
					}
				} else if (p === 'upY') {
					nodeInfo._props.upY = params[p];
					if (this.ac.listener) {
						this.ac.listener.upY.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.upY.setValueAtTime(nodeInfo._props.upY, when);
						} else {
							this.ac.listener.upY.setTargetAtTime(nodeInfo._props.upY, when, ramp);
						}
					}
				} else if (p === 'upZ') {
					nodeInfo._props.upZ = params[p];
					if (this.ac.listener) {
						this.ac.listener.upZ.cancelScheduledValues(when);
						if (ramp === 0) {
							this.ac.listener.upZ.setValueAtTime(nodeInfo._props.upZ, when);
						} else {
							this.ac.listener.upZ.setTargetAtTime(nodeInfo._props.upZ, when, ramp);
						}
					}
				} else {
					console.warn(`Voice._set(): param '${p}' not known for type '${nodeInfo.type}'.`);
				}
			} else {
				// unknown node type
				console.warn(`Voice._set(): type '${nodeInfo.type}' is unknown`);
			}
		}
	}
}

export { Graph, Voice };
