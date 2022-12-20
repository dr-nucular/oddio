<script>
	import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
	import { onDestroy } from 'svelte';
	import { sAuthInfo, sModules } from '../stores.js';
	import { getUrlParams } from './utils.js';
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
	const controllerPeerId = '';
	let peerSelf;
	let qrCanvas;
	let priPeerButton;
	let secPeerButton;


	let isGameHost = false;
	let outConns = [];
	let inConns = [];

	let peerFeedbackData = '';


	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.peers?.bgColor}`;

	const createPeerConn = (gameHost) => {
		if (!Peer) {
			consoley(`Peer lib not imported, bail.`);
			return;
		}
		if (!peerSelf) {
			const peerId = gameHost ? hostPeerId : controllerPeerId;
			peerSelf = new Peer(peerId, {
				host: window.location.hostname,
				port: 9000,
				path: '/peerserver',
				//debug: 3,
				//config: { 'iceServers': [
				//	{ url: 'stun:stun.l.google.com:19302' },
				//	{ url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
				//] },
			});
			peerSelf.on('open', (id) => {
				consoley(`*** peerSelf created (gameHost=${gameHost}): ${id}`);
				if (gameHost) {
					priPeerButton.innerText = `${id}`;
					isGameHost = true;

					// if gameHost, display QRCode
					generateUriForPeers();
				} else {
					secPeerButton.innerText = `${id}`;

					// if controller, connect to gameHost and send a hello msg
					createOutConn(hostPeerId, {
						toPeerType: undefined,
						toAuthInfo: undefined,
					});
				}
			});
			peerSelf.on('connection', (conn) => {
				consoley(`*** inConn initiated (gameHost=${gameHost}) by ${conn.peer}`);
				//console.log(`inconn keys`, Object.keys(conn));
				//console.log(`inconn peer`, conn.peer);
				conn.on('open', () => {
					consoley(`*** inConn opened (gameHost=${gameHost}) by ${conn.peer}`);
					inConns.push(conn);
					inConns = inConns; // trigger reactivity

					// TODO: update outConn of same peerId with updated toPeerType/Email etc... 
					// this is the use case where host replies back with info about itself

					// establish outConn and say hello back
					createOutConn(conn.peer, {
						toPeerType: conn.metadata.fromPeerType,
						toAuthInfo: JSON.parse(JSON.stringify(conn.metadata.fromAuthInfo)),
					});
				});
				conn.on('data', (data) => {
					consoley(`<<< data received from ${conn.peer} (gameHost=${gameHost}): ${data}`);
				});
				conn.on('error', (err) => {
					consoley(`!!! inConn error (peer ${conn.peer}) (gameHost=${gameHost}): ${err}`);
				});
			});
			peerSelf.on('error', (err) => {
				consoley(`!!! peerSelf error (gameHost=${gameHost}): ${err}`);
				peerSelf = undefined;
			});
		} else {
			consoley(`*** peerSelf ALREADY created (gameHost=${gameHost})`);
		}

	};


	const createOutConn = (peerId, toMetadata) => {
		if (peerId === peerSelf.id) {
			consoley(`*** outConn CAN'T be established from/to self`);
			return;
		}

		const existingOutConn = outConns.find(conn => conn.peer === peerId);
		if (existingOutConn) {
			consoley(`*** outConn ALREADY established from ${peerSelf.id} to ${peerId}; updating metadata`);

			// assign toMetadata into the conn's metadata
			const toMetadataCloned = JSON.parse(JSON.stringify(toMetadata));
			existingOutConn.metadata = Object.assign(existingOutConn.metadata, toMetadataCloned);
			outConns = outConns; // trigger reactivity
			return;
		}

		/*
		const curConnectedPeerIds = outConns.map(conn => conn.peer);
		const idx = curConnectedPeerIds.indexOf(peerId);
		if (idx > -1) {
			consoley(`*** outConn ALREADY established from ${peerSelf.id} to ${peerId}`);
			return;
		}
		*/

		const fromMetadata = {
			fromPeerType: isGameHost ? 'host' : 'controller',
			fromAuthInfo: JSON.parse(JSON.stringify(authInfo)),
		};
		const metadata = Object.assign({}, fromMetadata, toMetadata);
		const conn = peerSelf.connect(peerId, {
			metadata,
			//label: 'needs to be unique',
			//serialization: 'binary',
			//reliable: false,
		});
		conn.on('open', () => {
			consoley(`*** outConn established from ${peerSelf.id} to ${peerId}`);
			outConns.push(conn);
			outConns = outConns; // trigger reactivity

			// send hello msg
			const openMsg = `Hi ${peerId}, this is ${peerSelf.id}`;
			consoley(`>>> ${peerSelf.id} sending hello msg to ${peerId}: ${openMsg}`);
			conn.send(openMsg);
		});
		conn.on('error', (err) => {
			consoley(`!!! outConn NOT established from ${peerSelf.id} to ${peerId}: ${err}`);
		});

	};

	const sendMsg = (peerId) => {
		// send to all if peerId is falsy
		const helloMsg = `Hi from ${peerSelf.id}`;
		outConns.forEach(conn => {
			if (!peerId || conn.peer === peerId) {
				consoley(`>>> sending msg to ${conn.peer}: ${helloMsg}`);
				conn.send(helloMsg);
			}
		});
	};

	const sendMsgByConn = (conn) => {
		const helloMsg = `Hi from ${peerSelf.id}`;
		consoley(`>>> sending msg to ${conn.peer}: ${helloMsg}`);
		conn.send(helloMsg);
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
		unsubAuthInfo();
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
				<ul>
					<li>fromPeerType: {conn.metadata.fromPeerType}</li>
					<li>fromAuthInfo.uid: {conn.metadata.fromAuthInfo?.uid}</li>

				</ul>
			</li>
		{/each}
		</ul>
	{:else}
		There are no inbound peer connections.<br/><br/>
	{/if}
	
	{#if outConns?.length}
		Outbound peer connections:
		<ul>
		{#each outConns as conn}
			<li>
				{conn.peer}
				<ul>
					<li>toPeerType: {conn.metadata.toPeerType}</li>
					<li>toAuthInfo.uid: {conn.metadata.toAuthInfo?.uid}</li>

				</ul>
				<button on:click={() => sendMsgByConn(conn)}>Send Message</button>
			</li>
		{/each}
		</ul>
	{:else}
		There are no outbound peer connections.<br/><br/>
	{/if}

	<button on:click={() => sendMsg()}>Send Message to all outConns</button><br/>
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