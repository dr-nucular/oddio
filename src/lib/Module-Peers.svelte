<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbGetPeerSession } from '../firebase.js';
import { sAuthInfo, sModules, sPeerSession } from '../stores.js';
import { lsGetPeerSessionId } from './utils';
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

// other states
let peerSessionId;
const hostPeerId = 'yay';
let pMan;
let peerConns = []; // array of PeerConnections
let qrCanvas;

let domLogs = [];
let domLogData = '';



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;
const unsubPeerSession = sPeerSession.subscribe(obj => {
	if (qrCanvas) qrCanvas.style.display = 'none';
	peerSession = obj;
});

// onMount/onDestroy
onMount(async () => {
	console.log(`Peers ON MOUNT`);
	if (authInfo.isLoggedIn && !peerSession) {
		if (!peerSession) {
			await initPeerSession();
		}
	}
	pMan = new PeerManager();
});
onDestroy(() => {
	unsubAuthInfo();
	unsubModules();
	unsubPeerSession();
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
			<li>id: {peerSession.id}</li>
			<li>createdBy: {peerSession.data.createdBy}</li>
			<li>last updated: {(Date.now() - peerSession.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60)} hours ago</li>
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