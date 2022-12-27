<script>
	import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
	import { onMount, onDestroy } from 'svelte';
	import { dbGetPeerSession } from '../firebase.js';
	import { sAuthInfo, sModules } from '../stores.js';
	import { getPeerSessionId } from './utils';
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
	
	// other states
	let peerSessionId;
	let peerSession;
	const hostPeerId = 'yay';
	let pMan;
	let peerConns = []; // array of PeerConnections
	let qrCodeCanvas;

	let domLogs = [];
	let domLogData = '';

	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;

	// onMount/onDestroy
	onMount(async () => {
		console.log(`Peers ON MOUNT`);

		peerSessionId = getPeerSessionId();
		if (peerSessionId) {
			peerSession = await dbGetPeerSession(peerSessionId);
			// TODO: tie this into stores.js so other views/listeners are updated
		}

		pMan = new PeerManager();
	});
	onDestroy(() => {
		unsubAuthInfo();
		unsubModules();
	});


	const pmInit = async (myType) => {
		pMan.config({
			myType,
			myUserId: authInfo.uid,
			myName: authInfo.displayName,
			sessionOwner: myType === 'host', // will come from db eventually
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
		if (pMan.sessionOwner) {
			// show QRCode for others to link to
			try {
				const url = `${window.location.href}?gsid=abcde&hostPeerId=${pMan.peerSelf.id}`;
				const result = await QRCode.toCanvas(qrCodeCanvas, url);
				qrCodeCanvas.style.display = 'block';
				//console.log(result);
			} catch (err) {
				console.error(err);
			}
		}
	};


</script>


<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Peers &nbsp;&starf;</h2><hr/>

	{#if peerSession}
		Your Peer Session info:
		<ul>
			<li>id: {peerSession.id}</li>
			<li>createdAt: {peerSession.data().createdAt}</li>
			<li>createdBy: {peerSession.data().createdBy}</li>
			<li>updatedAt: {peerSession.data().updatedAt}</li>
			<li># peers: ... </li>
		</ul>
	{:else}
		You need to create/join a peer session before you can connect as a peer.<br/><br/>
	{/if}

	PeerManager: <button on:click={() => pmInit('host')}>Init as Host</button>
		or <button on:click={() => pmInit('controller')}>Init as Controller</button><br/>
	<canvas bind:this={qrCodeCanvas}></canvas><br/>
	
	{#if pMan?.peerSelf}
		Your Peer info:
		<ul>
			<li>peerSelf.id: {pMan.peerSelf.id}</li>
			<li>myType: {pMan.myType}</li>
			<li>myUserId: {pMan.myUserId}</li>
			<li>myName: {pMan.myName}</li>
			<li>myDeviceId: {pMan.myDeviceId}</li>
			<li>sessionOwner: {pMan.sessionOwner}</li>
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
					<li>peerIsSessionOwner: {peerConn.peerIsSessionOwner}</li>
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
	}
</style>