<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbCreatePeerSession, dbGetPeerSession, dbQueryPeerSessions } from '../firebase.js';
import { sAuthInfo, sModules, sProject, sSyncSettings, sPeerSession } from '../stores.js';
import { getPeerSessionId, setPeerSessionId } from './utils';

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};
let peerSession;

// other states
let peerSessionId;
let peerSessions;
let createButton;
let qrCanvas;
let project;



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peerSession?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);
const unsubPeerSession = sPeerSession.subscribe(obj => peerSession = obj);


onMount(() => {
	console.log(`ON MOUNT`);

	if (authInfo.isLoggedIn && !peerSession) {
		setPeerSession(); // from localStorage
	}

	peerSessionId = getPeerSessionId(); // grabs from localStorage
	getPeerSessions();
});
onDestroy(() => {
	unsubAuthInfo();
	unsubModules();
	unsubProject();
	unsubSyncSettings();
	unsubPeerSession();
});



// initialize peerSession if the store is empty
const setPeerSession = async (id) => {
	// use optional id provided, or look in localstorage for a prior peerSessionId...
	if (id) {
		qrCanvas.style.display = 'none';
		setPeerSessionId(id);
	}
	let priorPeerSessionId = getPeerSessionId();
	if (priorPeerSessionId) {
		// if there, load it from db and save to store
		const psData = await dbGetPeerSession(priorPeerSessionId); // TODO: catch errs (i.e. a stale sesh)
		sPeerSession.set(psData);
	}
};





const getPeerSessions = async () => {
	try {
		const peerSessionsData = await dbQueryPeerSessions();
		peerSessions = peerSessionsData.map(psd => {
			return { id: psd.id, data: psd.data() };
		});
	} catch (err) {
		console.error(`getPeerSessions() ERROR:`, err);
	}
};

const createPeerSession = async () => {
	// TODO
	console.log(`createPeerSession: not implemented yet.`);
	//const sesh = await dbCreatePeerSession();
};

/*
const setPeerSesssion = (id) => {
	qrCanvas.style.display = 'none';
	setPeerSessionId(id);
	setPeerSession();
	
};
*/

const generateQR = async (psid) => {
	try {
		//const url = `${window.location.href}/?psid=${psid}`;
		const url = `${window.location.origin}${window.location.pathname}?psid=${psid}`;
		const result = await QRCode.toCanvas(qrCanvas, url);
		qrCanvas.style.display = 'block';
	} catch (err) {
		console.error(err);
	}
}



</script>


<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Peer Session &nbsp;&starf;</h2><hr/>

	{#if peerSession}
		Your Peer Session info:
		<ul>
			<li>id: {peerSession.id}</li>
			<li>createdBy: {peerSession.data().createdBy}</li>
			<li>createdAt: {peerSession.data().createdAt.toDate().toUTCString()}</li>
			<li>updatedAt: {peerSession.data().updatedAt.toDate().toUTCString()}</li>
			<li>hours diff: {(Date.now() - peerSession.data().updatedAt.toDate().valueOf()) / (1000 * 60 * 60)}</li>
			<li># peers: ... </li>
			<li><button on:click={() => generateQR(peerSession.id)}>Invite others to join</button></li>
		</ul>
	{:else}
		Please create or join a peer session.<br/><br/>
	{/if}
		

	{#if peerSessions?.length}
		Recent Peer Sessions:
		<ul>
		{#each peerSessions as ps}
			<li>
				id: {ps.id}
				<ul>
					<li>(created {ps.data.createdAt})</li>
					{#if ps.id === peerSessionId}
						<li>*** currently active: <button on:click={() => generateQR(ps.id)}>Invite others</button></li>
					{:else}
						<li><button on:click={() => setPeerSession(ps.id)}>Join</button></li>
					{/if}
				</ul>
			</li>
		{/each}
		</ul>
	{:else}
		No recent Peer Sessions found. Create one and share a link with others.<br/><br/>
	{/if}

	<canvas bind:this={qrCanvas}></canvas>

	<button on:click={createPeerSession} bind:this={createButton}>Create New Group Session</button>
	


	
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
	canvas {
		display: none;
	}
</style>