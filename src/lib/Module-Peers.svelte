<script>
	import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
	import { onMount, onDestroy } from 'svelte';
	import { sAuthInfo, sModules } from '../stores.js';
	import { getUrlParams } from './utils.js';
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
	const hostPeerId = 'yay';
	let pMan;
	let conns = []; // array of PeerConnections
	let qrCodeCanvas;
	let domLogData = '';

	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;

	// onMount/onDestroy
	onMount(() => {
		console.log(`Peers ON MOUNT`);
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
				domLogData = str + `\n` + domLogData;
			},
			connsUpdatedCallback: (peerConns) => {
				conns = peerConns; // triggers reactivity
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

	{#if conns.length}
		Peer Connections:
		<ul>
		{#each conns as conn}
			<li>
				Peer id: {conn.peerId}
				<ul>
					<li>
						<button on:click={() => conn.sendData({ type: 'hello' })}>Send Hello</button>
						<button on:click={() => conn.ping()}>Send 1 Ping</button>
					</li>
					<li>
						<button on:click={() => conn.ping()}>Start Repeated Pings</button>
						<button on:click={() => conn.ping()}>Stop Repeated Pings</button>
					</li>
					
					<li>peerType: {conn.peerType}</li>
					<li>peerUserId: {conn.peerUserId}</li>
					<li>peerName: {conn.peerName}</li>
					<li>peerDeviceId: {conn.peerDeviceId}</li>
					<li>peerIsSessionOwner: {conn.peerIsSessionOwner}</li>

					<li>createdOn: {conn.createdOn}</li>
					<li>updatedOn: {conn.updatedOn}</li>
					<li>numMsgsIn: {conn.numMsgsIn}</li>
					<li>numMsgsOut: {conn.numMsgsOut}</li>
					<li>lastMsgIn: {conn.lastMsgIn}</li>
					<li>lastMsgOut: {conn.lastMsgOut}</li>

					<li>roundTripAvg: {conn.roundTripAvg}ms</li>
					<li>latencyAvg: {conn.latencyAvg}ms</li>
					<li>peerClockOffsetAvg: {conn.peerClockOffsetAvg}ms</li>
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