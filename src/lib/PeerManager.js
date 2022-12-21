let Peer;
if (typeof navigator !== "undefined") {
	import("peerjs").then(imported => {
		Peer = imported.Peer;
	});
}

const DEBUG = true;
const hostPeerId = 'yayyay';
const controllerPeerId = '';


class PeerConnection {

	constructor(peerId, conn) {
		// get reference to singleton PeerManager and peerSelf
		this.peerManager = new PeerManager();
		this.peerSelf = this.peerManager.peerSelf;

		this.peerId = peerId;
		this.conn = conn; // might be undefined

		// conn is a peerjs DataConnection obj
		// https://peerjs.com/docs/#dataconnection
		// metadata might exist, and if it does it should have info about peer
		

		// custom metadata to track locally
		this.peerType = undefined; // host, controller, etc
		this.numIn = 0;
		this.numOut = 0;
		this.lastIn = undefined;
		this.lastOut = undefined;
	}

	open() {
		if (!this.peerSelf) {
			const err = `*** peerSelf NOT created yet, aborting`;
			this.log(err);
			return Promise.reject(err);
		}


		const openPromise = new Promise((resolve, reject) => {
			try {
				if (!this.conn) {
					this.conn = this.peerSelf.connect(this.peerId, {
						metadata: { test: "hello" },
						//label: 'needs to be unique',
						//serialization: 'binary',
						//reliable: false,
					});
				}

				this.conn.on('open', () => {
					this.log(`*** conn established between ${this.peerSelf.id} and ${this.peerId}`);
					//outConns.push(conn);
					//outConns = outConns; // trigger reactivity
		
					// send hello msg
					//sendMsg(conn);
					resolve(this);
				});

				this.conn.on('data', (data) => {
					this.log(`<<< conn data received by ${this.peerSelf.id} from ${this.peerId}: ${data}`);
					//conn.metadata.lastTransmission = Date.now();
					//outConns = outConns; // trigger reactivity
				});

				this.conn.on('error', (err) => {
					this.log(`!!! conn NOT established between ${this.peerSelf.id} and ${this.peerId}: ${err}`);
					reject(err);
				});
		
				// already open?  resolve now
				this.conn.open && resolve(this);
			
			} catch (err) {
				this.log(`*** conn FAILED to be opened, err: ${err}`);
				reject(err);
			}

		});
		return openPromise;
	}

	ping() {
		// send data about self
	}

	onPong() {
		// received data about peer
	}

	log(data) {
		console.log(`PeerConnection: ${data}`);
		this.peerManager.logCallback && this.peerManager.logCallback(`PeerConnection: ${data}`);
	}

};




class PeerManager {

	constructor(opts = {}) {
		// this is a singleton service
		if (PeerManager.instance) return PeerManager.instance;
		PeerManager.instance = this;

		console.log(`PeerManager.constructor()`);
		this.peerSelf = undefined;
		this.peerSelfType = undefined;

		this.conns = []; // array of PeerConnections
		
		this.config(opts);
	}

	config(opts) {
		this.logCallback = opts.logCallback || undefined;
		this.connsUpdatedCallback = opts.connsUpdatedCallback || undefined;
	}

	init(peerSelfType) {
		// set this.peerSelf, return promise after opened

		if (this.peerSelf) {
			this.log(`*** peerSelf ALREADY created (type=${this.peerSelfType})`);
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
					this.log(`*** peerSelf created (type=${peerSelfType}): ${id}`);
					if (peerSelfType === 'host') {
						//priPeerButton.innerText = `${id}`;
						//isGameHost = true;
						// if gameHost, display QRCode
						//generateUriForPeers();
					} else {
						//secPeerButton.innerText = `${id}`;
						// if controller, connect to gameHost and send a hello msg
						/*
						createOutConn(hostPeerId, {
							toPeerType: undefined,
							toAuthInfo: undefined,
						});
						createFullConn(hostPeerId);
						*/
						//const conn = new PeerConnection(hostPeerId);
						//conn.init();
					}
					this.peerSelfType = peerSelfType;
					resolve(this);
				});

				this.peerSelf.on('connection', (conn) => {
					this.log(`*** peerSelf connection created by peerId ${conn.peer})`);

					// throw an error if we already have this pConn
					const dupeConn = this.conns.find(pc => pc.peerId === conn.peer);
					if (dupeConn) {
						this.log(`*** already have this peer connection`);
						return;
					}
			
					const peerConn = new PeerConnection(conn.peer, conn);
					this.log(`*** new PeerConnection added: ${conn.peer})`);
					this.conns.push(peerConn);
				});

				this.peerSelf.on('error', (err) => {
					this.log(`!!! peerSelf error (type=${peerSelfType}): ${err.type}, ${err}`);
					this.peerSelf.destroy && this.peerSelf.destroy();
					this.peerSelf = undefined;
					reject(err);
				});
	


			} catch (err) {
				this.log(`*** peerSelf FAILED to be created (type=${this.peerSelfType}): ${err}`);
				reject(err);
			}
		});
		return openPromise;
	}

	async connectToHost() {
		const dupeConn = this.conns.find(pc => pc.peerId === hostPeerId);
		if (dupeConn) {
			this.log(`*** already have this peer connection`);
			return;
		}

		this.log(`*** connectToHost attempt`);
		const peerConn = new PeerConnection(hostPeerId);
		await peerConn.open().then(pc => {
			// add pc to this.conns[]
			this.conns.push(pc);
			this.log(`*** connectToHost success.. added to manager's conns array`);
		}).catch(err => {
			this.log(`*** connectToHost FAIL: ${err.message || err}`);
		});

		
	}

	log(data) {
		console.log(`PeerManager: ${data}`);
		this.logCallback && this.logCallback(`PeerManager: ${data}`);
	}

	connsUpdated() {
		this.connsUpdatedCallback && this.connsUpdatedCallback(this.conns);
	}

};

export default PeerManager;
