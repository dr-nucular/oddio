<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbGetPeerSession, dbGetMyPeerSessions, dbCreatePeerSession, dbUpdatePeerSession } from '../firebase.js';
import { sAuthInfo, sModules, sProject, sSyncSettings, sPeerSession, sMyPeerSessions } from '../stores.js';
import { lsGetPeerSessionId, lsSetPeerSessionId } from './utils';

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};
let peerSession;
let myPeerSessions;

// other states
const MAX_AGE_HOURS = 48;
let qrCanvas;
let project;



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peerSession?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);
const unsubPeerSession = sPeerSession.subscribe(obj => {
	if (qrCanvas) qrCanvas.style.display = 'none';
	peerSession = obj;
});
const unsubMyPeerSessions = sMyPeerSessions.subscribe(obj => myPeerSessions = obj);


onMount(async () => {
	console.log(`PeerSession ON MOUNT`);
	if (authInfo.isLoggedIn) {
		if (!peerSession) {
			await initPeerSession();
		}
		if (!myPeerSessions.length) {
			await initMyPeerSessions();
		}
	}
});
onDestroy(() => {
	unsubAuthInfo();
	unsubModules();
	unsubProject();
	unsubSyncSettings();
	unsubPeerSession();
	unsubMyPeerSessions();
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

const initMyPeerSessions = async () => {
	try {
		const psArray = await dbGetMyPeerSessions();
		const psArrayFiltered = psArray.map(psd => {
			return { id: psd.id, data: psd.data() };
		}).filter(ps => {
			const sameAsActive = ps.id === peerSession?.id;
			const tooOld = (Date.now() - ps.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60) > MAX_AGE_HOURS;
			return !sameAsActive && !tooOld;
		});
		sMyPeerSessions.set(psArrayFiltered);
	} catch (err) {
		console.error(`initMyPeerSessions() ERROR:`, err);
	}
};




const activatePeerSession = async (id) => {
	try {
		lsSetPeerSessionId(id);

		// if there, load it from db and save to store
		let dataToStore;
		if (id) {
			const ps = await dbUpdatePeerSession(id);
			const psUnpacked = { id: ps.id, data: ps.data() };
			if (psUnpacked) {
				dataToStore = psUnpacked;
			}
		}
		sPeerSession.set(dataToStore);
		initMyPeerSessions();
	} catch (err) {
		console.error(`activatePeerSession() ERROR:`, err);
	}
};

const createPeerSession = async () => {
	const sesh = await dbCreatePeerSession();
	initMyPeerSessions();
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
	<h2>&starf;&nbsp; Peer Session &nbsp;&starf;</h2><hr/>

	{#if peerSession}
		Active Peer Session:
		<ul>
			<li>id: {peerSession.id}</li>
			<li>createdBy: {peerSession.data.createdBy}</li>
			<li>last updated: {(Date.now() - peerSession.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60)} hours ago</li>
			<li># peers: ... </li>
			<li>
				<button on:click={() => generateQR(peerSession.id)}>Invite others to join</button>
				or
				<button on:click={() => activatePeerSession(undefined)}>Deactivate</button>
			</li>
		</ul>
		<canvas bind:this={qrCanvas}></canvas>
	{:else}
		You don't have an active Peer Session at the moment.
		<ul>
			<li>Join a friend's peer session from a link or QRcode</li>
			<li><button on:click={createPeerSession}>Create a new peer session</button> that you can share</li>
		</ul>
	{/if}

	{#if myPeerSessions?.length}
		Your inactive Peer Sessions:
		<ol>
		{#each myPeerSessions as ps}
			<li>
				id: {ps.id}
				<ul>
					<li>updatedAt: {ps.data.updatedAt.toDate().toUTCString()}</li>
					<li>last updated: {(Date.now() - ps.data.updatedAt.toDate().valueOf()) / (1000 * 60 * 60)} hours ago</li>
					<li># peers: ... </li>
					<li><button on:click={() => activatePeerSession(ps.id)}>Activate</button></li>
				</ul>
			</li>
		{/each}
		</ol>
	{/if}


	


	
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
		margin: 0 auto 20px;
	}
</style>