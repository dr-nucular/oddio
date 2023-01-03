<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbGetPeerSession, dbGetPeer, dbGetMyPeers, dbCreatePeer, dbUpdatePeer } from '../firebase.js';
import { sAuthInfo, sModules, sPeerSession, sPeer, sMyPeers } from '../stores.js';
import { lsGetPeerSessionId, lsGetPeerId, lsSetPeerId, processUpdatedAtData } from './utils';

import PeerManager from './PeerManager.js';
let Peer;
if (typeof navigator !== "undefined") {
	import("peerjs").then(imported => {
		Peer = imported.Peer;
	});
}

// subscription vars
let authInfo = {};
let modules = {};
let peerSession;
let peer;
let myPeers;

// other states
const MAX_AGE_HOURS = 48;
let peerSessionId;
const hostPeerId = 'yay';
let pMan;
let peerConns = []; // array of PeerConnections

let qrCanvas;
let peerName;
let iSaveNameButton;

let domLogs = [];
let domLogData = '';



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;
const unsubPeerSession = sPeerSession.subscribe(ps => {
	if (qrCanvas) qrCanvas.style.display = 'none';
	peerSession = processUpdatedAtData(ps);
});
const unsubPeer = sPeer.subscribe(p => {
	peer = processUpdatedAtData(p);
	peerName = peer?.data?.name;
});
const unsubMyPeers = sMyPeers.subscribe(arr => {
	myPeers = arr.map(p => processUpdatedAtData(p));
});

// onMount/onDestroy
onMount(async () => {
	console.log(`Peers ON MOUNT`);
	if (authInfo.isLoggedIn) {
		if (!peerSession) {
			await initPeerSession();
		}
		if (!peer) {
			await initPeer();
		}
		if (!myPeers.length) {
			await initMyPeers();
		}
	}
	pMan = new PeerManager();
});
onDestroy(() => {
	unsubAuthInfo();
	unsubModules();
	unsubPeerSession();
	unsubPeer();
	unsubMyPeers();
});


// initialize peerSession if the store is empty
const initPeerSession = async () => {
	try {
		// look in localstorage for a prior peerSessionId saved there...
		const id = lsGetPeerSessionId();
		if (id) {
			// if there, load it from db and save to store
			const ps = await dbGetPeerSession(id);
			const psUnpacked = { id: ps.id, data: ps.data() };
			const tooOld = (Date.now() - psUnpacked.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60) > MAX_AGE_HOURS;
			!tooOld && sPeerSession.set(psUnpacked);
		}
	} catch (err) {
		console.error(`initPeerSession() ERROR:`, err);
	}
};

const initPeer = async () => {
	try {
		// look in localstorage for a prior peerId saved there...
		const id = lsGetPeerId();
		if (id) {
			// if there, load it from db and save to store
			const ps = await dbGetPeer(id);
			const psUnpacked = { id: ps.id, data: ps.data() };
			const tooOld = false;//(Date.now() - psUnpacked.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60) > MAX_AGE_HOURS;
			!tooOld && sPeer.set(psUnpacked);
		}
	} catch (err) {
		console.error(`initPeer() ERROR:`, err);
	}
};

const initMyPeers = async () => {
	try {
		const pArray = await dbGetMyPeers();
		const pArrayFiltered = pArray.map(pd => {
			return { id: pd.id, data: pd.data() };
		}).filter(p => {
			const sameAsActive = p.id === peer?.id;
			const tooOld = (Date.now() - p.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60) > MAX_AGE_HOURS;
			return !sameAsActive && !tooOld;
		});
		sMyPeers.set(pArrayFiltered);
	} catch (err) {
		console.error(`initMyPeers() ERROR:`, err);
	}
};


const activatePeer = async (id) => {
	try {
		lsSetPeerId(id);

		// if there, load it from db and save to store
		let dataToStore;
		if (id) {
			const p = await dbUpdatePeer(id);
			const pUnpacked = { id: p.id, data: p.data() };
			if (pUnpacked) {
				dataToStore = pUnpacked;
			}
		}
		sPeer.set(dataToStore);
		initMyPeers();
	} catch (err) {
		console.error(`activatePeer() ERROR:`, err);
	}
};


/**
 * Create the Peer db entry in its simplest form
 */
const createPeer = async () => {
	await dbCreatePeer();
	initMyPeers();
};

/**
 * Set crucial data on the Peer entry -- activate Peer?
 * @param opts
 */
const updatePeer = async (opts) => {
	if (!peerSession?.id) {
		console.error(`updatePeer() ERROR: can't update Peer db entry w/out an active peerSession`);
		return;
	}
	const data = {
		peerSession: `peerSessions/${peerSession.id}`,
		peerType: opts.peerType,
		peerServerId: opts.peerServerId
	};
	const p = await dbUpdatePeer(peer.id, data);
	const pUnpacked = { id: p.id, data: p.data() };
	const tooOld = false;//(Date.now() - psUnpacked.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60) > MAX_AGE_HOURS;
	!tooOld && sPeer.set(pUnpacked);

	initMyPeers(); // ???
};

/**
 * Update peer session with a fresh updatedAt timestamp, that is all
 */
const updatePeerSession = async () => {
	if (!peerSession?.id) {
		console.error(`updatePeerSession() ERROR: you haven't set an active peerSession`);
		return;
	}
	await dbUpdatePeerSession();

};








const pmInit = async (myType) => {
	pMan.config({
		myType,
		myUserId: authInfo.uid,
		myName: authInfo.displayName,
		logCallback: (str) => {
			domLogs.unshift(str);
			if (domLogs.length > 10) {
				domLogs.pop();
			}
			domLogData = domLogs.join(`\n`);
		},
		peerMgrUpdatedCB: (pm) => {
			pMan = pm; // triggers reactivity
		},
		peerConnsUpdatedCB: (pc) => {
			peerConns = pc; // triggers reactivity
		},
	});
	await pMan.init(myType);
};



const updatePeerName = async () => {
	console.log(`updatePeerName() ...`);
	try {
		console.log(`.... peerName: ${peerName}`);
		if (!peer?.id) {
			throw `peer.id must be set`;
		}
		if (!peerName) {
			throw `peerName must be set`;
		}
		const name = peerName.trim();
		if (name === peer.data.name) {
			throw `peerName is the same as what's in the db, aborting.`;
		}
		iSaveNameButton.innerText = "Saving...";
		iSaveNameButton.disabled = true;
		const ps = await dbUpdatePeer(peer.id, { name });
		const psUnpacked = { id: ps.id, data: ps.data() };
		sPeer.set(psUnpacked);
		initMyPeers();
		iSaveNameButton.innerText = "Save";
		iSaveNameButton.disabled = false;
	} catch (err) {
		console.error(`updatePeerName() ERROR: ${err}`);
	}
};

const generateQR = async (psid) => {
	try {
		//const url = `${window.location.href}/?psid=${psid}`;
		const url = `${window.location.origin}${window.location.pathname}?psid=${psid}`;
		if (qrCanvas) {
			const result = await QRCode.toCanvas(qrCanvas, url);
			qrCanvas.style.display = 'block';
		}
	} catch (err) {
		console.error(err);
	}
};

</script>





<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Peers &nbsp;&starf;</h2><hr/>

	{#if peerSession}
		Active Peer Session:
		<ul>
			<li>Name: {peerSession.data.name}</li>
			<li>id: {peerSession.id}</li>
			<li>last updated: {peerSession.data.updatedAtPretty}</li>
			<li># peers: ... </li>
			<li><button on:click={() => generateQR(peerSession.id)}>Invite others to join</button></li>
		</ul>
		<canvas bind:this={qrCanvas}></canvas>
	{:else}
		You don't have an active Peer Session at the moment.
		<ul>
			<li>Join a friend's peer session from a link or QRcode</li>
			<li>Create a new peer session that you can share</li>
		</ul>
	{/if}

	<hr/>

	{#if peer}
		Active Peer:
		<ul>
			<li>
				<form on:submit|preventDefault={updatePeerName}>
					Name: <input id="iPeerName" type="text" bind:value={peerName} />
					<button id="iSaveNameButton" type="submit" bind:this={iSaveNameButton}>Save</button>
				</form>
			</li>
			<li>id: {peer.id}</li>
			<li>last updated: {peer.data.updatedAtPretty}</li>
			<li>Peer Session: ?</li>
			<li><button on:click={() => activatePeer(undefined)}>Deactivate</button></li>
		</ul>
	{:else}
		You don't have an active Peer at the moment.
		<ul>
			<li><button on:click={createPeer}>Create a new peer</button></li>
		</ul>
	{/if}

	{#if myPeers?.length}
		Your inactive Peers:
		<ol>
		{#each myPeers as p}
			<li>
				{#if p.data.name}
					{p.data.name}
				{:else}
					No name set (id: {p.id})
				{/if}
				<ul>
					<li>last updated: {p.data.updatedAtPretty}</li>
					<li>Peer Session: ?</li>
					<li><button on:click={() => activatePeer(p.id)}>Activate</button></li>
				</ul>
			</li>
		{/each}
		</ol>
	{/if}



	<hr/>




	Join as a
	<button on:click={() => pmInit('host')}>Game Host (computer/tablet)</button>
	or
	<button on:click={() => pmInit('controller')}>Player (phone/tablet)</button><br/>


	
	{#if pMan?.peerSelf}
		Your Peer info:
		<ul>
			<li>peerSelf.id: {pMan.peerSelf.id}</li>
			<li>myType: {pMan.myType}</li>
			<li>myUserId: {pMan.myUserId}</li>
			<li>myName: {pMan.myName}</li>
			<li>myDeviceId: {pMan.myDeviceId}</li>
		</ul>
	{:else}
		Peer info has not yet been initialized.<br/><br/>
	{/if}

	<button on:click={() => pMan.initiateDataConnection(hostPeerId)}>PeerManager connect controller to host</button><br/>

	{#if peerConns.length}
		Peer Connections:
		<ul>
		{#each peerConns as peerConn}
			<li>
				Peer [{peerConn.conn.open ? 'open' : 'closed'}]: {peerConn.peerId}
				<ul>					
					<li>createdOn: {peerConn.createdOn}</li>
					
					<li>peerType: {peerConn.peerType}</li>
					<li>peerUserId: {peerConn.peerUserId}</li>
					<li>peerName: {peerConn.peerName}</li>
					<li>peerDeviceId: {peerConn.peerDeviceId}</li>
					<li>lastPeerUpdateIn: {peerConn.lastPeerUpdateIn}</li>
					<li>lastPeerUpdateOut: {peerConn.lastPeerUpdateOut}</li>

					<li>
						<button on:click={() => peerConn.sendData({ type: 'hello' })}>Send Hello Msg</button>
					</li>
					
					<li>numMsgsIn: {peerConn.numMsgsIn}</li>
					<li>numMsgsOut: {peerConn.numMsgsOut}</li>
					<li>lastMsgIn: {peerConn.lastMsgIn}</li>
					<li>lastMsgOut: {peerConn.lastMsgOut}</li>

					<li>
						<button on:click={() => peerConn.ping()}>Send 1 Ping</button>
					</li>

					<li>roundTripAvg: {peerConn.roundTripAvg} ms</li>
					<li>latencyAvg: {peerConn.latencyAvg} ms</li>
					<li>peerClockOffsetAvg: {peerConn.peerClockOffsetAvg} ms</li>
					<li>numPingsSinceLastPong: {peerConn.numPingsSinceLastPong}</li>

					<li>
						<button on:click={() => peerConn.startPings()}>Start Repeated Pings</button>
						<button on:click={() => peerConn.stopPings()}>Stop Repeated Pings</button>
					</li>
				</ul>
			</li>
		{/each}
		</ul>
	{:else}
		There are no Peer Connections.<br/><br/>
	{/if}

	<textarea id="domLog" bind:value={domLogData} /><br/>

</div>


<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
	h2 {
		margin: 0 0 12px;
	}
	textarea {
		width: 100%;
		height: 100px;
	}
	canvas {
		display: none;
		margin: 0 auto 20px;
	}
</style>