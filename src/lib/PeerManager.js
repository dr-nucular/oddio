let Peer;
if (typeof navigator !== "undefined") {
	import("peerjs").then(imported => {
		Peer = imported.Peer;
	});
}

const DEBUG = true;
const hostPeerId = 'yay'; // TODO un-hardcode
const controllerPeerId = '';







class PeerManager {

	constructor(opts = {}) {
		// this is a singleton service
		if (PeerManager.instance) return PeerManager.instance;
		PeerManager.instance = this;

		console.log(`PeerManager.constructor()`);
		this.peerSelf = undefined; // Peer instance
		this.conns = []; // array of PeerConnections

		this.myType = undefined;
		this.myUserId = undefined;
		this.myName = undefined;
		this.myDeviceId = undefined;
		this.sessionOwner = false;
		this.logCallback = undefined;
		this.connsUpdatedCallback = undefined;

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
			this.connsUpdatedCallback = undefined;
		}
		if (opts.myType) this.myType = opts.myType;
		if (opts.myUserId) this.myUserId = opts.myUserId;
		if (opts.myName) this.myName = opts.myName;
		if (opts.myDeviceId) this.myDeviceId = opts.myDeviceId;
		if (opts.sessionOwner) this.sessionOwner = opts.sessionOwner;
		if (opts.logCallback) this.logCallback = opts.logCallback;
		if (opts.connsUpdatedCallback) this.connsUpdatedCallback = opts.connsUpdatedCallback;
	}

	init(peerSelfType) {
		// return promise that resolves after this.peerSelf is opened

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
						//const conn = new PeerConnection({ peerId: hostPeerId });
						//conn.init();
					}
					this.peerSelfType = peerSelfType;
					resolve(this);
				});

				this.peerSelf.on('connection', async (conn) => {
					const peerConn = await this.receiveDataConnection(conn);
					peerConn.updatePeer();
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

	async initiateDataConnection(peerId) {
		this.log(`*** outgoing conn attempt to peerId ${peerId})`);

		// throw an error if we already have this pConn
		const dupeConn = this.conns.find(pc => pc.peerId === peerId);
		if (dupeConn) {
			this.log(`*** outgoing conn FAIL: already have this peer connection`);
			return;
		}

		// create PeerConnection from peerId
		const peerConn = new PeerConnection({ peerId });
		await peerConn.open().then(pc => {
			// add pc to this.conns[]
			this.conns.push(pc);
			this.log(`*** outgoing conn open success: ${pc.peerId}`);
		}).catch(err => {
			this.log(`*** outgoing conn open FAIL: ${err.message || err}`);
		});
		return peerConn;
	}

	async receiveDataConnection(conn) {
		this.log(`*** incoming conn attempt from peerId ${conn.peer})`);

		// throw an error if we already have this pConn
		const dupeConn = this.conns.find(pc => pc.peerId === conn.peer);
		if (dupeConn) {
			this.log(`*** incoming conn FAIL: already have this peer connection`);
			return;
		}

		// create PeerConnection from conn
		const peerConn = new PeerConnection({ conn });
		await peerConn.open().then(pc => {
			// add pc to this.conns[]
			this.conns.push(pc);
			this.log(`*** incoming conn open success: ${pc.peerId}`);
		}).catch(err => {
			this.log(`*** incoming conn open FAIL: ${err.message || err}`);
		});
		return peerConn;
	}

	log(data) {
		console.log(`PeerManager: ${data}`);
		this.logCallback && this.logCallback(`PeerManager: ${data}`);
	}

	connsUpdated() {
		this.connsUpdatedCallback && this.connsUpdatedCallback(this.conns);
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
			this.log(`ERR: PeerConnection must be created with a peerId str or conn obj`);
		}

		// custom metadata to track locally
		this.peerType = undefined; // host, controller, etc
		this.peerUserId = undefined;
		this.peerName = undefined;
		this.peerDeviceId = undefined;
		this.peerIsSessionOwner = false;

		this.createdOn = undefined;
		this.updatedOn = undefined;
		this.numMsgsIn = 0;
		this.numMsgsOut = 0;
		this.lastMsgIn = undefined;
		this.lastMsgOut = undefined;
	}

	open() {
		if (!this.peerSelf) {
			const err = `*** peerSelf NOT created yet, aborting`;
			this.log(err);
			return Promise.reject(err);
		}
		const openPromise = new Promise((resolve, reject) => {
			try {
				this.createdOn = Date.now();
				if (!this.conn) {
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
				} else {
					// TODO: protect this from getting overwritten in case multiple .open() calls occur?
					const metadata = this.conn.metadata;
					this.peerType = metadata.peerType;
					this.peerUserId = metadata.peerUserId;
					this.peerName = metadata.peerName;
					this.peerDeviceId = metadata.peerDeviceId;
					this.peerIsSessionOwner = metadata.peerIsSessionOwner;
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
					if (data.type === 'peerUpdate') {
						this.log(`*** peerUpdate data received from ${this.peerId}`);
						const now = Date.now();
						this.peerType = data.peerType;
						this.peerUserId = data.peerUserId;
						this.peerName = data.peerName;
						this.peerDeviceId = data.peerDeviceId;
						this.peerIsSessionOwner = data.peerIsSessionOwner;
						this.updatedOn = now;
						this.lastMsgIn = now;
						this.numMsgsIn += 1;
					}
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

	updatePeer() {
		// send updated information about self to peer so they can update their PeerConnection metadata
		this.log(`*** updatePeer()`);
		const now = Date.now();
		this.conn.send({
			type: 'peerUpdate',
			peerType: this.peerManager.myType,
			peerUserId: this.peerManager.myUserId,
			peerName: this.peerManager.myName,
			peerDeviceId: this.peerManager.myDeviceId,
			peerIsSessionOwner: this.peerManager.sessionOwner,
		});
		this.updatedOn = now;
		this.lastMsgOut = now;
		this.numMsgsOut += 1;
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

export default PeerManager;
