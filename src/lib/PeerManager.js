import { trimmedMean } from './utils.js';
let Peer;
if (typeof navigator !== "undefined") {
	import("peerjs").then(imported => {
		Peer = imported.Peer;
	});
}

const SHOW_ALL_LOGS = true;
const LOG_LEVEL = {
	log: 0,
	warn: 1,
	error: 2
};
const MAX_UNANSWERED_PINGS = 5;

const hostPeerId = 'yay'; // TODO un-hardcode
const controllerPeerId = '';







class PeerManager {

	constructor(opts = {}) {
		// this is a singleton service
		if (PeerManager.instance) return PeerManager.instance;
		PeerManager.instance = this;

		this.peerSelf = undefined; // Peer instance
		this.peerConns = []; // array of PeerConnections

		this.myType = undefined;
		this.myUserId = undefined;
		this.myName = undefined;
		this.myDeviceId = undefined;
		this.sessionOwner = false;

		this.logCallback = undefined;
		this.peerMgrUpdatedCB = undefined; // triggered only from peer.open callback right now
		this.peerConnsUpdatedCB = undefined; // triggered any time there's a change to PeerConnection info

		this.config(opts);
	}

	config(opts) {
		if (opts.resetAll) {
			this.myType = undefined;
			this.myUserId = undefined;
			this.myName = undefined;
			this.myDeviceId = undefined;
			this.sessionOwner = false;
			this.logCallback = undefined;
			this.peerConnsUpdatedCB = undefined;
		}
		if (opts.myType) this.myType = opts.myType;
		if (opts.myUserId) this.myUserId = opts.myUserId;
		if (opts.myName) this.myName = opts.myName;
		if (opts.myDeviceId) this.myDeviceId = opts.myDeviceId;
		if (opts.sessionOwner) this.sessionOwner = opts.sessionOwner;
		if (opts.logCallback) this.logCallback = opts.logCallback;
		if (opts.peerMgrUpdatedCB) this.peerMgrUpdatedCB = opts.peerMgrUpdatedCB;
		if (opts.peerConnsUpdatedCB) this.peerConnsUpdatedCB = opts.peerConnsUpdatedCB;
	}

	init(peerSelfType) {
		// return promise that resolves after this.peerSelf is opened

		if (this.peerSelf) {
			this.log(LOG_LEVEL.warn, `*** peerSelf ALREADY created (type=${this.peerSelfType})`);
			// ? what if peerSelfType is different?  can we update it?
			return Promise.resolve(this);
		}

		const openPromise = new Promise((resolve, reject) => {
			const desiredPeerId = peerSelfType === 'host' ? hostPeerId : controllerPeerId;
			try {
				this.peerSelf = new Peer(desiredPeerId, {
					host: window.location.hostname,
					port: 9000,
					path: '/peerserver',
					//debug: 3,
					//config: { 'iceServers': [
					//	{ url: 'stun:stun.l.google.com:19302' },
					//	{ url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
					//] },
				});

				// TODO: set busy flag here?

				this.peerSelf.on('open', (id) => {
					this.log(LOG_LEVEL.log, `*** peerSelf created (type=${peerSelfType}): ${id}`);
					if (peerSelfType === 'host') {
						// if gameHost, display QRCode
						//generateUriForPeers();
					}
					this.peerSelfType = peerSelfType;
					resolve(this);
				});

				this.peerSelf.on('error', (err) => {
					this.log(LOG_LEVEL.error, `!!! peerSelf error (type=${peerSelfType}): ${err.type}, ${err}`);
					this.peerSelf.destroy && this.peerSelf.destroy();
					this.peerSelf = undefined;
					reject(err);
				});
	
			} catch (err) {
				this.log(LOG_LEVEL.error, `*** peerSelf FAILED to be created (type=${this.peerSelfType}): ${err}`);
				reject(err);
			}
		});

		return openPromise.then(() => {
			// now add other callbacks
			// TODO move to own method attachPeerListeners() or something
			this.peerSelf.on('connection', async (conn) => {
				const peerConn = await this.onDataConnection(conn);
				peerConn.updatePeer();
			});
			this.peerMgrUpdatedCB && this.peerMgrUpdatedCB(this);
			return this;
		}).catch(err => {
			this.log(LOG_LEVEL.error, `ERROR: ${err}`);
			this.peerMgrUpdatedCB && this.peerMgrUpdatedCB(this);
			return this;
		});
	}

	async initiateDataConnection(peerId) {
		// throw an error if we already have this pConn
		const dupeConn = this.peerConns.find(pc => pc.peerId === peerId);
		if (dupeConn) {
			this.log(LOG_LEVEL.warn, `*** outgoing conn: already have this peer connection`);
			return;
		}

		// create PeerConnection from peerId
		const peerConn = new PeerConnection({ peerId });
		await peerConn.open();
		return peerConn;
	}

	async onDataConnection(conn) {
		// throw an error if we already have this pConn
		const dupeConn = this.peerConns.find(pc => pc.peerId === conn.peer);
		if (dupeConn) {
			this.log(LOG_LEVEL.warn, `*** incoming conn: already have this peer connection`);
			return;
		}

		// create PeerConnection from conn
		const peerConn = new PeerConnection({ conn });
		await peerConn.open();
		return peerConn;
	}

	updateConns(peerConn) {
		// if peerConn.conn is open, then ensure it's part of this.peerConns.
		// if peerConn.conn is not open, then remove it from this.peerConns
		const idx = this.peerConns.indexOf(peerConn);
		if (peerConn?.conn) {
			if (idx === -1) {
				this.peerConns.push(peerConn);
			}
			/*
			if (peerConn.conn.open) {
				if (idx === -1) {
					this.peerConns.push(peerConn);
				}
			} else {
				if (idx !== -1) {
					this.peerConns.splice(idx, 1);
				}
			}
			*/
		} else {
			if (idx !== -1) {
				this.peerConns.splice(idx, 1);
			}
		}

		// finally trigger the provided callback, if defined
		this.peerConnsUpdatedCB && this.peerConnsUpdatedCB(this.peerConns);
	}

	log(logLevel, data) {
		const consoleMethod = logLevel >= 2
			? console.error : logLevel === 1
				? console.warn : SHOW_ALL_LOGS
					? console.log : undefined;
		if (consoleMethod) {
			consoleMethod(`PeerManager: ${data}`);
			this.logCallback && this.logCallback(`PeerManager: ${data}`);
		}
	}

};





class PeerConnection {

	constructor(opts = {}) {
		// get reference to singleton PeerManager and peerSelf
		this.peerManager = new PeerManager();
		this.peerSelf = this.peerManager.peerSelf;

		// conn is a peerjs DataConnection obj
		// https://peerjs.com/docs/#dataconnection
		// metadata might exist, and if it does it should have info about peer

		this.conn = undefined;
		this.peerId = undefined;
		if (opts.conn) {
			this.conn = opts.conn;
			this.peerId = opts.conn.peer;
		} else if (opts.peerId) {
			this.peerId = opts.peerId;
		} else {
			this.log(LOG_LEVEL.error, `ERR: PeerConnection must be created with a peerId str or conn obj`);
		}

		// custom metadata to track locally
		this.peerType = undefined; // host, controller, etc
		this.peerUserId = undefined;
		this.peerName = undefined;
		this.peerDeviceId = undefined;
		this.peerIsSessionOwner = false;

		this.createdOn = undefined;

		this.numMsgsIn = 0;
		this.numMsgsOut = 0;
		this.lastMsgIn = undefined;
		this.lastMsgOut = undefined;
		this.lastPeerUpdateIn = undefined;
		this.lastPeerUpdateOut = undefined;

		this.pastPingPongData = [];
		this.roundTripAvg = undefined;
		this.latencyAvg = undefined;
		this.peerClockOffsetAvg = undefined;
		this.numPingsSinceLastPong = 0;
		this.pingTimeoutId = undefined;
	}

	open() {
		if (!this.peerSelf) {
			const err = `*** peerSelf NOT created yet, aborting`;
			this.log(LOG_LEVEL.error, err);
			return Promise.reject(err);
		}
		const openPromise = new Promise((resolve, reject) => {
			try {
				this.createdOn = Date.now();
				if (!this.conn) {
					// we are initiating the connection with metadata about self
					this.conn = this.peerSelf.connect(this.peerId, {
						metadata: {
							peerType: this.peerManager.myType,
							peerUserId: this.peerManager.myUserId,
							peerName: this.peerManager.myName,
							peerDeviceId: this.peerManager.myDeviceId,
							peerIsSessionOwner: this.peerManager.sessionOwner,
						},
						//label: 'needs to be unique',
						//serialization: 'binary',
						//reliable: false,
					});
					this.lastPeerUpdateOut = this.createdOn;
				} else {
					// we are receiving an already made connection -- save any provided metadata about peer
					const metadata = this.conn.metadata;
					if (metadata?.peerType !== undefined) this.peerType = metadata.peerType;
					if (metadata?.peerUserId !== undefined) this.peerUserId = metadata.peerUserId;
					if (metadata?.peerName !== undefined) this.peerName = metadata.peerName;
					if (metadata?.peerDeviceId !== undefined) this.peerDeviceId = metadata.peerDeviceId;
					if (metadata?.peerIsSessionOwner !== undefined) this.peerIsSessionOwner = metadata.peerIsSessionOwner;
					this.lastPeerUpdateIn = this.createdOn;
				}

				this.conn.on('open', () => {
					this.log(LOG_LEVEL.log, `*** conn established between ${this.peerSelf.id} and ${this.peerId}`);
					resolve();
				});

				this.conn.on('error', (err) => {
					this.log(LOG_LEVEL.error, `*** conn err between ${this.peerSelf.id} and ${this.peerId}: ${err}`);
					reject(err); // only applies to openPromise
				});
		
				// already open?
				if (this.conn.open) {
					resolve();
				}
			} catch (err) {
				reject(err);
			}

		});

		return openPromise.then(() => {
			// remove original "open" callbacks???   overkill perhaps
			// now add other callbacks
			// TODO move to own method attachConnectionListeners() or something
			this.conn.on('data', (data) => {
				this.onData(data);
			});
			this.conn.on('close', () => {
				this.log(LOG_LEVEL.warn, `*** conn closed between ${this.peerSelf.id} and ${this.peerId}. How to reconnect?`);
				this.updateManager();
			});

			this.updateManager();
			return this;
		}).catch(err => {
			this.log(LOG_LEVEL.error, `ERROR: ${err}`);
			this.updateManager();
			return this;
		});
	}

	//////////////////// send data methods
	sendData(data, skipUpdateMgr = false) {
		// return bool representing success
		if (!this.conn.open) {
			this.log(LOG_LEVEL.error, `sendData() FAIL (conn closed): type=${data?.type} to ${this.peerId}`);
			!skipUpdateMgr && this.updateManager();
			return false;
		} 

		this.log(LOG_LEVEL.log, `sendData() type=${data?.type} to ${this.peerId}`);
		this.conn.send(data);

		const now = Date.now();
		this.lastMsgOut = now;
		this.numMsgsOut += 1;
		!skipUpdateMgr && this.updateManager();
		return true;
	}

	updatePeer() {
		// send updated information about self to peer so they can update their PeerConnection metadata
		const msg = {
			type: 'peerUpdate',
			peerType: this.peerManager.myType,
			peerUserId: this.peerManager.myUserId,
			peerName: this.peerManager.myName,
			peerDeviceId: this.peerManager.myDeviceId,
			peerIsSessionOwner: this.peerManager.sessionOwner,
		};
		const sendSuccess = this.sendData(msg, true);
		if (sendSuccess) {
			this.lastPeerUpdateOut = this.lastMsgOut;
		}
		this.updateManager();
	}

	ping() {
		// close connection if too many unanswered pings
		if (this.numPingsSinceLastPong >= MAX_UNANSWERED_PINGS && this.conn.open) {
			this.log(LOG_LEVEL.error, `ping() ERR: MAX_UNANSWERED_PINGS reached (${MAX_UNANSWERED_PINGS}) between ${this.peerSelf.id} and ${this.peerId}, closing connection...`);
			this.stopPings();
			this.conn.close();
			return;
		}

		// send simple ping, expect onPong back very soon
		const data = {
			type: 'ping',
			pingClock: Date.now(),
		};
		const sendSuccess = this.sendData(data, true);
		if (sendSuccess) {
			this.numPingsSinceLastPong += 1;
		} else {
			this.stopPings();
		}
		this.updateManager();
	}

	/////////////////////////////// receive data methods
	onData(data) {
		this.log(LOG_LEVEL.log, `onData() type=${data?.type} from ${this.peerId}`);
		const now = Date.now();
		if (data.type === 'peerUpdate') {
			// save data to this PeerConnection
			this.peerType = data.peerType;
			this.peerUserId = data.peerUserId;
			this.peerName = data.peerName;
			this.peerDeviceId = data.peerDeviceId;
			this.peerIsSessionOwner = data.peerIsSessionOwner;
			this.lastPeerUpdateIn = now;
		} else if (data.type === 'ping') {
			// just return a pong msg
			const pongData = {
				type: 'pong',
				peerClock: now,
				pingClock: data.pingClock,
			};
			this.sendData(pongData);
		} else if (data.type === 'pong') {
			const ppData = {
				pingClock: data.pingClock,
				peerClock: data.peerClock,
				pongClock: now,
			};
			this.onPong(ppData);	
		}
		this.lastMsgIn = now;
		this.numMsgsIn += 1;
		this.updateManager();
	}
	
	onPong(ppData) {
		// received pong
		this.numPingsSinceLastPong = 0;

		// compute some ping latencies and clock offsets
		const roundTrip = ppData.pongClock - ppData.pingClock;
		const latency = roundTrip * 0.5;
		const peerClockOffset = (ppData.peerClock - latency) - ppData.pingClock;
		this.log(LOG_LEVEL.log, `onPong() roundTrip=${roundTrip}ms, latency=${latency}ms, peerClockOffset=${peerClockOffset}ms`);

		this.pastPingPongData.unshift({ roundTrip, latency, peerClockOffset });
		if (this.pastPingPongData.length > 10) {
			this.pastPingPongData.pop();
		}

		const roundTrips = this.pastPingPongData.map(v => v.roundTrip);
		this.roundTripAvg = trimmedMean(roundTrips, 0.4);
		const latencies = this.pastPingPongData.map(v => v.latency);
		this.latencyAvg = trimmedMean(latencies, 0.4);
		const peerClockOffsets = this.pastPingPongData.map(v => v.peerClockOffset);
		this.peerClockOffsetAvg = trimmedMean(peerClockOffsets, 0.4);
	}

	//////////////////////// utility methods
	startPings() {
		this.log(LOG_LEVEL.log, `startPings()`);
		if (!this.pingTimeoutId) {
			const pingTimeoutCallback = () => {
				this.pingTimeoutId = setTimeout(pingTimeoutCallback, 3000);
				this.ping();
			};
			pingTimeoutCallback();
		}
	}

	stopPings() {
		this.log(LOG_LEVEL.log, `stopPings()`);
		if (this.pingTimeoutId) {
			clearTimeout(this.pingTimeoutId);
			this.pingTimeoutId = undefined;
		}
	}

	updateManager() {
		this.log(LOG_LEVEL.log, `updateManager()`);
		// let peerManager know that this conn has some updated info.
		// call this after creation/destruction, or metadata update.
		this.peerManager.updateConns(this);
	}

	log(logLevel, data) {
		const consoleMethod = logLevel >= 2
			? console.error : logLevel === 1
				? console.warn : SHOW_ALL_LOGS
					? console.log : undefined;
		if (consoleMethod) {
			consoleMethod(`PeerConnection: ${data}`);
			this.peerManager.logCallback && this.peerManager.logCallback(`PeerConnection: ${data}`);
		}
	}

};

export default PeerManager;
