import Oddio from './Oddio';

const DEBUG = true;

class Buff {
	constructor(filename, opts) {
		this.filename = filename;
		this.stateCallback = opts.stateCallback;

		this.ac = Oddio.getAC();

		this.loadPromise = null;
		this.xhrResponse = null;

		this.decodePromise = null;
		this.audioBuffer = null;

		this.stateData = {
			loading: false,
			loaded: false,
			decoding: false,
			decoded: false,
			error: false
		};

		this.updateStateData({});
	}

	// returns promise
	load(opts) {
		if (this.loadPromise) return this.loadPromise;

		this.loadPromise = new Promise((resolve, reject) => {
			DEBUG && console.log(`Buff.load() STARTED: ${this.filename}`);
			const xhr = new XMLHttpRequest();
			this.updateStateData({ loading: true });
			xhr.open('GET', this.filename, true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = () => {
				if (xhr.status === 200) {
					this.updateStateData({ loading: false, loaded: true });
					DEBUG && console.log(`Buff.load() DONE, ready to decode: ${this.filename}`);
					this.xhrResponse = xhr.response;

					// TODO: only continue to decode if opts says so
					if (opts.decodeImmediately) {
						this.decode().then(resolve, reject);
					} else {
						resolve();
					}

				} else {
					this.updateStateData({ loading: false, error: true });
					reject(`Buff.load() ${xhr.status} ERROR loading ${this.filename}: ${xhr.statusText}`);
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
				this.updateStateData({ loading: false, error: true });
				reject(`Buff.load() network ERROR trying to load: ${this.filename}`);
			};
			//xhr.timeout = 10000;
			xhr.send();
		}).catch(console.error);
		return this.loadPromise;
	}

	// returns promise
	decode() {
		if (this.decodePromise) return this.decodePromise;

		if (!this.loadPromise) {
			return Promise.reject(`Buff.decode() ERROR: load first?  Filename: ${this.filename}`);
		}
		if (!this.xhrResponse) {
			// TODO: optionally chain self to end of loadPromise?
			return Promise.reject(`Buff.decode() ERROR: wait until load is done?  Filename: ${this.filename}`);
		}
		this.decodePromise = new Promise((resolve, reject) => {
			DEBUG && console.log(`Buff.decode() STARTED: ${this.filename}`);
			this.updateStateData({ decoding: true });
			this.ac.decodeAudioData(
				this.xhrResponse,
				(audioBuffer) => {
					// only save decoded result if this.decodePromise or this.loadPromise haven't been nulled...
					// if either has, then download was likely canceled intentionally via undecode() or unload().
					if (this.decodePromise && this.loadPromise) {
						this.audioBuffer = audioBuffer;
						this.updateStateData({ decoding: false, decoded: true });
						DEBUG && console.log(`Buff.decode() DONE, ready to play: ${this.filename}`);
						resolve();
					} else {
						this.updateStateData({ decoding: false });
						reject(
							`Buff.decode() DONE, but aborting because undecode/unload was called first: ${this.filename}`
						);
						//return Promise.resolve();
					}
				},
				(err) => {
					this.updateStateData({ decoding: false, error: true });
					reject(`Buff.decode() ERROR decoding ${this.filename}: ${err}`);
				}
			);
		}).catch(console.error);
		return this.decodePromise;
	}

	undecode() {
		if (DEBUG) {
			if (this.decodePromise && this.audioBuffer) {
				DEBUG && console.log(`Buff.undecode(): ${this.filename} undecoded`);
			} else if (this.decodePromise) {
				console.warn(`Buff.undecode(): ${this.filename} undecoded before it finished decoding`);
			} else {
				console.warn(`Buff.undecode(): ${this.filename} not decoded in the first place`);
			}
		}
		this.updateStateData({
			//loading: false,
			//loaded: false,
			decoding: false,
			decoded: false,
			error: false
		});
		this.decodePromise = null;
		this.audioBuffer = null;
	}

	unload() {
		if (DEBUG) {
			if (this.loadPromise && this.xhrResponse) {
				DEBUG && console.log(`Buff.unload(): ${this.filename} unloaded`);
			} else if (this.loadPromise) {
				console.warn(`Buff.unload(): ${this.filename} unloaded before it finished loading`);
			} else {
				console.warn(`Buff.unload(): ${this.filename} not loaded in the first place`);
			}
		}
		this.updateStateData({
			loading: false,
			loaded: false,
			//decoding: false,
			//decoded: false,
			error: false
		});
		this.loadPromise = null;
		this.xhrResponse = null;
	}

	updateStateData(updatedProps) {
		Object.assign(this.stateData, updatedProps);
		this.stateCallback?.({
			filename: this.filename,
			stateData: this.stateData
		});

		// TODO: how to "notify" Sounds that rely on this Buff that the Sound is ready to be played?
		// should a Buff know what Sounds it's a part of?
		// Oddio should at least....  so should we "get all Sounds" from Oddio then iterate and notify?
	}

	getLoadPromise() {
		return this.loadPromise;
	}

	getDecodePromise() {
		return this.decodePromise;
	}

	getAudioBuffer() {
		return this.audioBuffer;
	}
}


class Sound {
	constructor(buffOrBuffs, opts) {
		this.setBuffs(buffOrBuffs);
		// opts: stateCallback here too?
	}

	setBuffs(buffOrBuffs) {
		this.buffs = Array.isArray(buffOrBuffs) ? buffOrBuffs.slice(0) : [buffOrBuffs]; // if > 1, they are triggered randomly
		this.recentlySelected = []; // reset
	}

	getBuffer(selectionType = 'randomNoRepeat') {
		// selectionType <str> is 'randomNoRepeat', 'exhaustiveRandom', random', or 'cycle'.   TODO: implement
		// return AudioBuffer instance

		// filter this.buffs to make playable buffs
		const playableBuffs = this.buffs.filter(buff => buff && buff.audioBuffer);

		// bail if there are 0
		const numBuffs = playableBuffs.length;
		if (!numBuffs) {
			console.warn(`Sound.getBuffer(): there are no AudioBuffers ready to play for Sound:`, this);
			return;		
		}

		// splice items from the this.recentlySelected array if there are too many.
		// half the numBuffs is appropriate for random-no-repeat effectiveness.
		const numToRemove = this.recentlySelected.length - Math.floor(numBuffs * 0.5);
		if (numToRemove > 0) {
			this.recentlySelected.splice(0, numToRemove);
		}

		// choose a random filename from the collection (no repeat if > 1)
		let selectedBuff = null;
		if (numBuffs === 1) {
			selectedBuff = playableBuffs[0];
		} else if (numBuffs > 1) {
			let tries = 0;
			do {
				selectedBuff = playableBuffs[Math.floor(Math.random() * numBuffs)];
				tries++;
			} while (this.recentlySelected.indexOf(selectedBuff) > -1 && tries < 10);
		}

		if (selectedBuff) {
			this.recentlySelected.push(selectedBuff);
			return selectedBuff.getAudioBuffer();
		}
		return;
	}
}

export { Buff, Sound };
