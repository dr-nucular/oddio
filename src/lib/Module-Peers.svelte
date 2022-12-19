<script>
	import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
	import { onDestroy } from 'svelte';
	import { sModules } from '../stores.js';
	import { getUrlParams } from './utils.js';
	let Peer;
	if (typeof navigator !== "undefined") {
		import("peerjs").then(imported => {
			Peer = imported.Peer;
		});
	}

	// subscription vars
	let modules = {};

	// other states
	const hostPeerId = 'yay';
	const controllerPeerId = '';
	let peer;
	let qrCanvas;
	let priPeerButton;
	let secPeerButton;
	let sendMsgButton;

	let isGameHost = false;
	let outConns = [];
	let inConns = [];

	let peerFeedbackData = '';


	// store subscriptions
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;

	const createPeerConn = (gameHost) => {
		if (!Peer) {
			consoley(`Peer lib not imported, bail.`);
			return;
		}
		if (!peer) {
			const peerId = gameHost ? hostPeerId : controllerPeerId;
			peer = new Peer(peerId, {
				host: window.location.hostname,
				port: 9000,
				path: '/peerserver',
				//debug: 3,
				//config: { 'iceServers': [
				//	{ url: 'stun:stun.l.google.com:19302' },
				//	{ url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
				//] },
			});
			peer.on('open', (id) => {
				consoley(`*** peer created (gameHost=${gameHost}): ${id}`);
				if (gameHost) {
					priPeerButton.innerText = `${id}`;
					isGameHost = true;

					// if gameHost, display QRCode
					generateUriForPeers();
				} else {
					secPeerButton.innerText = `${id}`;

					// if controller, connect to gameHost and send a hello msg
					establishConnection(hostPeerId);
				}
			});
			peer.on('connection', (conn) => {
				consoley(`*** peer connected (gameHost=${gameHost})`);
				//console.log(`inconn keys`, Object.keys(conn));
				//console.log(`inconn peer`, conn.peer);
				conn.on('open', () => {
					consoley(`*** connection opened (gameHost=${gameHost}) by peer`);
					inConns.push(conn);
					inConns = inConns; // trigger reactivity
					//if (gameHost) {
						// if gameHost received the connection, establish outConn and say hello back
						establishConnection(conn.peer);
					//}
					//else {
					//	consoley(`>>> controller NOT sending msg`);
					//}
				});
				conn.on('data', (data) => {
					consoley(`<<< msg received (gameHost=${gameHost}): ${data}`);
				});
				conn.on('error', (err) => {
					consoley(`*** inConn error (gameHost=${gameHost}): ${err}`);
				});
			});
			peer.on('error', (err) => {
				consoley(`*** peer error (gameHost=${gameHost}): ${err}`);
				peer = undefined;
			});
		} else {
			consoley(`*** peer ALREADY created (gameHost=${gameHost})`);
		}

	};


	const establishConnection = (peerId) => {
		const curConnectedPeerIds = outConns.map(conn => conn.peer);
		const idx = curConnectedPeerIds.indexOf(peerId);
		if (idx > -1) {
			consoley(`*** outConn ALREADY established from ${peer.id} to ${peerId}`);
			return;
		}

		const conn = peer.connect(peerId);
		conn.on('open', () => {
			consoley(`*** outConn established from ${peer.id} to ${peerId}`);
			outConns.push(conn);
			outConns = outConns; // trigger reactivity

			// send hello msg
			const openMsg = `Hi ${peerId}, this is ${peer.id}`;
			consoley(`>>> ${peer.id} sending hello msg to ${peerId}: ${openMsg}`);
			conn.send(openMsg);
		});
		conn.on('error', (err) => {
			consoley(`!!! outConn NOT established from ${peer.id} to ${peerId}: ${err}`);
		});

	};

	const sendMsg = () => {
		//if (isGameHost) {
		//	consoley(`XXX gameHost can't send msg to self`);
		//	return;
		//}
		const helloMsg = `hi again!`;
		outConns.forEach(conn => {
			consoley(`>>> sending msg (isGameHost=${isGameHost}): ${helloMsg}`);
			conn.send(helloMsg);
		});
	};

	const generateUriForPeers = async () => {
		try {
			const url = `${window.location.href}?gsid=abcde&hostPeerId=${hostPeerId}`; // TODO: remove peerId
			const result = await QRCode.toCanvas(qrCanvas, url);
			qrCanvas.style.display = 'block';
			//console.log(result);
		} catch (err) {
			console.error(err);
		}
	}

	const consoley = (str) => {
		console.log(str);
		peerFeedbackData = str + `\n` + peerFeedbackData;
	};




	onDestroy(() => {
		unsubModules();
	});

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Peers &nbsp;&starf;</h2><hr/>

	{#if getUrlParams().hostPeerId}
		Host: {getUrlParams().hostPeerId}<br/>
		Controller: <button on:click={() => createPeerConn(false)} bind:this={secPeerButton}>Create Peer</button><br/>
		<br/>
	{:else}	
		Host: <button on:click={() => createPeerConn(true)} bind:this={priPeerButton}>Create Peer</button><br/>
		<canvas bind:this={qrCanvas}></canvas><br/>
	{/if}




	

	{#if inConns?.length}
		Inbound peer connections:
		<ul>
		{#each inConns as conn}
			<li>
				{conn.peer}
			</li>
		{/each}
		</ul>
	{:else}
		There are {inConns?.length} inbound peer connections.<br/><br/>
	{/if}
	
	{#if outConns?.length}
		Outbound peer connections:
		<ul>
		{#each outConns as conn}
			<li>
				{conn.peer}
			</li>
		{/each}
		</ul>
	{:else}
		There are {outConns?.length} outbound peer connections.<br/><br/>
	{/if}

	<button on:click={sendMsg} bind:this={sendMsgButton}>Send Message to all outConns</button><br/>
	<textarea id="peerFeedback" bind:value={peerFeedbackData} /><br/>
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