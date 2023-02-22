/**
 * Oddio.js
 * - HTML5 WebAudio API interface
 * (c) 2019-2023 by Owen Grace
 */

import { Buff, Sound } from './Sound';
import { Graph, Voice } from './Graph';
import { ScheduledEvent, Scheduler } from './Scheduler';

const DEBUG = false;

class Oddio {
	//static instance;

	constructor() {
		// this is a singleton service
		if (Oddio.instance) return Oddio.instance;
		Oddio.instance = this;

		// members
		this.ac = null; // AudioContext
		this.buffs = {}; // key = filename, value = Buff instance
		this.sounds = {}; // key = id, value = Sound instance
		this.graphs = {}; // key = graph id, value = obj
		this.voices = []; // array of Voices
		this.schedulers = {}; // key = id, value = Scheduler instance
		this.clockParams = {
			acTime: 0,
			mediaTime: 0,
			mediaSpeed: 1.0,
		};
	}

	async init() {
		if (this.ac) {
			console.warn(`Oddio.init(): already initialized!`);
			return;
		}
		try {
			this.ac = new (window.AudioContext || window.webkitAudioContext)();
			console.log(`Oddio.init(): destination numberOfInputs:`, this.ac.destination.numberOfInputs);
			console.log(`Oddio.init(): destination numberOfOutputs:`, this.ac.destination.numberOfOutputs);
			console.log(`Oddio.init(): destination channelCount:`, this.ac.destination.channelCount);
			console.log(`Oddio.init(): destination channelCountMode:`, this.ac.destination.channelCountMode);
			console.log(`Oddio.init(): destination channelInterpretation:`, this.ac.destination.channelInterpretation);
			// this might be TEMP
			const buffsAlreadyCreated = Object.keys(this.buffs);
			buffsAlreadyCreated.forEach(key => {
				this.buffs[key].refreshAudioContext();
			});
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
				this.voices.forEach(voice => voice.destroy()); // do this _before_ ac.close()?
				this.voices = [];
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


	/* BUFFS */
	setBuff(filename, opts) {
		if (!filename || typeof filename !== 'string') {
			console.error(`Oddio.setBuff() ERROR: filename must be provided.`);
			return;
		}
		if (this.buffs[filename]) {
			DEBUG && console.warn(`Oddio.setBuff() ERROR: already created Buff for filename "${filename}".`);
			return this.buffs[filename];
		}
		DEBUG && console.log(`Oddio.setBuff() [filename: '${filename}']`);
		this.buffs[filename] = new Buff(filename, opts);
		return this.buffs[filename];
	}

	getBuff(filename) {
		if (!filename || typeof filename !== 'string') {
			console.error(`Oddio.getBuff() ERROR: filename must be provided.`);
			return;
		}
		if (!this.buffs[filename]) {
			console.error(`Oddio.getBuff() ERROR: no Buff for filename "${filename}" found.`);
		}
		return this.buffs[filename];
	}

	async load(fileOrFiles = [], opts) {
		// file (URI string) or files (array of URI strings) accepted
		fileOrFiles = typeof fileOrFiles === 'string' ? [fileOrFiles] : fileOrFiles.slice(0);

		// remove falsies and dedupe
		fileOrFiles.filter((elem, pos, arr) => elem && arr.indexOf(elem) === pos);
		const promises = fileOrFiles.map((filename) => {
			if (!this.buffs[filename]) {
				this.buffs[filename] = new Buff(filename, opts);
			}
			return this.buffs[filename].load(opts);
		});

		const buffs = await Promise.all(promises);
		return buffs;
	}

	unload(fileOrFiles = []) {
		// file (URI string) or files (array of URI strings) accepted
		fileOrFiles = typeof fileOrFiles === 'string' ? [fileOrFiles] : fileOrFiles.slice(0);

		// remove falsies and dedupe
		fileOrFiles.filter((elem, pos, arr) => elem && arr.indexOf(elem) === pos);
		fileOrFiles.forEach((filename) => {
			if (this.buffs[filename]) {
				this.buffs[filename].unload();
				//delete this.buffs[filename];
			} else {
				console.warn(`Oddio.unload(): no Buff for ${filename}`);
			}
		});
	}


	/* SOUNDS */
	setSound(id, buffs) { // TODO: make params obj
		if (!id || typeof id !== 'string') {
			console.error(`Oddio.setSound() ERROR: id must be provided.`);
			return;
		}
		if (this.sounds[id]) {
			DEBUG && console.warn(`Oddio.setSound() ERROR: already defined sound data for id "${id}".`);
			return this.sounds[id];
		}
		DEBUG && console.log(`Oddio.setSound() [id: '${id}']`);
		this.sounds[id] = new Sound(buffs);
		return this.sounds[id];
	}

	getSound(id) {
		if (!id || typeof id !== 'string') {
			console.error(`Oddio.getSound() ERROR: id must be provided.`);
			return;
		}
		if (!this.sounds[id]) {
			console.error(`Oddio.getSound() ERROR: no sound w/ id "${id}" found.`);
		}
		return this.sounds[id];
	}


	/* GRAPHS */
	setGraph(id, data) { // TODO: make params obj
		//const id = data?.id;
		if (!id || typeof id !== 'string') {
			console.error(`Oddio.setGraph() ERROR: id must be provided.`);
			return;
		}
		if (this.graphs[id]) {
			DEBUG && console.warn(`Oddio.setGraph() ERROR: already defined graph for id "${id}".`);
			return this.graphs[id];
		}
		DEBUG && console.log(`Oddio.setGraph() [id: '${id}']`);
		this.graphs[id] = new Graph(data);
		return this.graphs[id];
	}

	getGraph(id) {
		if (!id || typeof id !== 'string') {
			console.error(`Oddio.getGraph() ERROR: id must be provided.`);
			return;
		}
		if (!this.graphs[id]) {
			console.error(`Oddio.getGraph() ERROR: no graph w/ id "${id}" found.`);
		}
		return this.graphs[id];
	}


	/* INSTANCES / VOICES */
	createVoice(graphId, id) {
		const graph = this.getGraph(graphId);
		if (!graph) {
			console.error(`Oddio.createVoice() ERROR: there's no graph with the id '${graphId}'`);
			return;
		}

		const config = graph.getConfig();
		DEBUG && console.log(`Oddio.createVoice() [id: '${id}', graphId: '${graphId}']`);

		// if config.singleton, then return already existing voice of the same config.id
		// TODO: throw error instead?
		if (config.singleton) {
			const foundPal = this.voices.find(voice => voice.graphId === graphId);
			if (foundPal) {
				console.warn(
					`Oddio.createVoice() singleton alert! Already created one w/ graphId '${graphId}', returning it instead of creating another`
				);
				return foundPal;
			}
		}

		// throw warn if another voice has the same id and return it instead
		const existingPalWithId = this.getVoiceById(id);
		if (existingPalWithId) {
			console.warn(
				`Oddio.createVoice() Already created one w/ id '${id}', returning it instead of creating another`
			);
			return existingPalWithId;
		}

		const voice = new Voice(graph, id);
		this.voices.push(voice);
		DEBUG &&
			console.log(
				`Oddio.createVoice() success [id: '${voice.id}', graphId: '${voice.graphId}'], ${this.voices.length} voices total`
			);
		return voice;
	}

	destroyVoice(voice) {
		// tries to clear references to stuff, if possible.  always returns null.
		if (!voice) return null;

		DEBUG && console.log(`Oddio.destroyVoice() [id: '${voice.id}', graphId: '${voice.graphId}']`);

		const idx = this.voices.indexOf(voice);
		if (idx > -1) {
			this.voices.splice(idx, 1);
			voice.destroy();
			DEBUG &&
				console.log(
					`Oddio.destroyVoice() success [id: '${voice.id}', graphId: '${voice.graphId}'], ${this.voices.length} voices remain`
				);
		} else {
			DEBUG &&
				console.warn(`Oddio.destroyVoice() voice not found, ${this.voices.length} voices still remain`);
		}

		return null;
	}

	getVoicesWithPublicNodes() {
		// used internally when connecting one voice's graph to another
		return this.voices.filter(voice => voice.publicNodes);
	}

	getVoicesByGraphId(graphId) {
		// return array of matches, empty array if none
		if (!graphId) {
			console.warn(`Oddio.getVoicesByGraphId() failure: specify a graphId`);
			return;
		}

		// throw warning if there are 0
		const matchingVoices = this.voices.filter(voice => voice.graphId === graphId);
		if (matchingVoices.length === 0) {
			DEBUG && console.warn(`Oddio.getVoicesByName(): no voices w/ graphId '${graphId}'`);
		}
		return matchingVoices;
	}

	getVoiceById(id) {
		// return one, or undefined if no matches
		if (!id) {
			console.warn(`Oddio.getVoiceById() failure: specify a non-falsy id`);
			return;
		}

		// throw warning if there are 0 or > 1
		const matchingVoices = this.voices.filter(voice => voice.id === id);
		if (matchingVoices.length === 0) {
			DEBUG && console.warn(`Oddio.getVoiceById(): no voices with id of '${id}'`);
			return;
		} else if (matchingVoices.length > 1) {
			console.warn(
				`Oddio.getVoiceById(): ${matchingVoices.length} voices with id '${id}', returning first one`
			);
		}

		// return first match
		return matchingVoices[0];
	}


	/* SCHEDULER */
	getScheduler(id) {
		if (!id || typeof id !== 'string') {
			console.error(`getScheduler() ERROR: id must be provided.`);
			return;
		}
		if (!this.schedulers[id]) {
			this.schedulers[id] = new Scheduler(id);
		}
		return this.schedulers[id];
	}

	/* clock params, might be temp, might move to Scheduler class */
	getClock() {
		// returns { currentTime, now, acTime, mediaTime, mediaSpeed }
		const currentTime = this.ac?.currentTime || 0;
		return Object.assign(this.clockParams, {
			currentTime,
			now: ((currentTime - this.clockParams.acTime) * this.clockParams.mediaSpeed)
				+ this.clockParams.mediaTime
		});
	}

	setClockParams(opts = {}) {
		// if opts.acTime is undefined, then use currentTime
		// TODO whenever these are changed, AND the scheduler is running, gotta be sure scheduler doesn't miss events or play too many.
		// i.e. when speed is changed, ensure scheduler clears everything scheduled and immediately  re-schedules
		// i.e. when mediaTime jumps, stop all playback.... resume after the  jump.
		const playheadNow = this.getClock();
		this.clockParams = {
			acTime: (typeof opts.acTime === 'number')
				? opts.acTime
				: playheadNow.currentTime,
			mediaTime: (typeof opts.mediaTime === 'number')
				? opts.mediaTime
				: playheadNow.now,
			mediaSpeed: (typeof opts.mediaSpeed === 'number')
				? opts.mediaSpeed
				: playheadNow.mediaSpeed
		};
		return this.getClock();
	}
}

export default new Oddio();
