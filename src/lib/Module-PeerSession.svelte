<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbGetPeerSession, dbGetMyPeerSessions, dbCreatePeerSession, dbUpdatePeerSession, dbQueryPeerSessionPeers } from '../firebase.js';
import { sAuthInfo, sModules, sSyncSettings, sPeerSession, sMyPeerSessions, sPeerSessionsAndTheirPeers } from '../stores.js';
import { lsGetPeerSessionId, lsSetPeerSessionId, processUpdatedAtData } from './utils';

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};
let peerSession;
let myPeerSessions;
let peerSessionsAndTheirPeers;

// other states
const MAX_AGE_HOURS = 200;
let qrCanvas;
let peerSessionName;
let iSaveNameButton;


// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peerSession?.bgColor}`;
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);
const unsubPeerSession = sPeerSession.subscribe(ps => {
	if (qrCanvas) qrCanvas.style.display = 'none';
	peerSession = processUpdatedAtData(ps);
	peerSessionName = peerSession?.data?.name;
});
const unsubMyPeerSessions = sMyPeerSessions.subscribe(arr => {
	myPeerSessions = arr.map(ps => processUpdatedAtData(ps));
});
const unsubPeerSessionsAndTheirPeers = sPeerSessionsAndTheirPeers.subscribe(obj => peerSessionsAndTheirPeers = obj);

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
	unsubSyncSettings();
	unsubPeerSession();
	unsubMyPeerSessions();
	unsubPeerSessionsAndTheirPeers();
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
			if (!tooOld) {
				sPeerSession.set(psUnpacked);

				// add to peerSessionsAndTheirPeers
				const pspArray = await dbQueryPeerSessionPeers(id);
				console.log(`*** pspArray length:`, pspArray.length);
				const pspArrayUnpacked = pspArray.map(psp => {
					return { id: psp.id, data: psp.data() };
				});
				console.log(`*** pspArrayUnpacked:`, pspArrayUnpacked);
				sPeerSessionsAndTheirPeers.update(obj => {
					obj[id] = pspArrayUnpacked;
					return obj;
				});
			}
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

		// add each to peerSessionsAndTheirPeers
		psArrayFiltered.forEach(async (ps) => {
			const pspArray = await dbQueryPeerSessionPeers(ps.id);
			const pspArrayUnpacked = pspArray.map(psp => {
				return { id: psp.id, data: psp.data() };
			});
			console.log(`*** pspArrayUnpacked:`, pspArrayUnpacked);
			sPeerSessionsAndTheirPeers.update(obj => {
				obj[ps.id] = pspArrayUnpacked;
				return obj;
			});
		});


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
			dataToStore = psUnpacked;
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





const updatePeerSessionName = async () => {
	console.log(`updatePeerSessionName() ...`);
	try {
		console.log(`.... peerSessionName: ${peerSessionName}`);
		if (!peerSession?.id) {
			throw `peerSession.id must be set`;
		}
		if (!peerSessionName) {
			throw `peerSessionName must be set`;
		}
		const name = peerSessionName.trim();
		if (name === peerSession.data.name) {
			throw `peerSessionName is the same as what's in the db, aborting.`;
		}
		iSaveNameButton.innerText = "Saving...";
		iSaveNameButton.disabled = true;
		const ps = await dbUpdatePeerSession(peerSession.id, { name });
		const psUnpacked = { id: ps.id, data: ps.data() };
		sPeerSession.set(psUnpacked);
		initMyPeerSessions();
		iSaveNameButton.innerText = "Save";
		iSaveNameButton.disabled = false;
	} catch (err) {
		console.error(`updatePeerSessionName() ERROR: ${err}`);
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
	<h2>&starf;&nbsp; Peer Session &nbsp;&starf;</h2><hr/>

	{#if peerSession}
		Active Peer Session:
		<ul>
			{#if peerSession.data.createdBy === authInfo.uid}
			<li>
				<form on:submit|preventDefault={updatePeerSessionName}>
					Name: <input id="iPeerSessionName" type="text" bind:value={peerSessionName} />
					<button id="iSaveNameButton" type="submit" bind:this={iSaveNameButton}>Save</button>
				</form>
			</li>
			{:else}
			<li>Name: {peerSessionName}</li>
			{/if}

			<li>id: {peerSession.id}</li>
			<li>last updated: {peerSession.data.updatedAtPretty}</li>
			<li>
				# peers:
				{#if peerSessionsAndTheirPeers[peerSession.id]?.length}
					{peerSessionsAndTheirPeers[peerSession.id].length}:
					{peerSessionsAndTheirPeers[peerSession.id].map(psp => psp.data.name || psp.id).join(', ')}
				{:else}
					0
				{/if}
			</li>
			<li>
				<button on:click={() => generateQR(peerSession.id)}>Invite others to join</button>
				or
				<button on:click={() => activatePeerSession(undefined)}>Deactivate</button>
			</li>
		</ul>
		<canvas bind:this={qrCanvas}></canvas>
	{:else}
		You don't have an active Peer Session at the moment.  You can:
		<ul>
			<li>Join a friend's peer session from a link or QRcode</li>
			<li>Activate one of your inactive peer session from the past</li>
			<li><button on:click={createPeerSession}>Create a new peer session</button> that you can share</li>
		</ul>
	{/if}

	{#if myPeerSessions?.length}
		Your inactive Peer Sessions:
		<ol>
		{#each myPeerSessions as ps}
			<li>
				{#if ps.data.name}
					{ps.data.name}
				{:else}
					No name set (id: {ps.id})
				{/if}
				<ul>
					<li>last updated: {ps.data.updatedAtPretty}</li>
					<li>
						# peers:
						{#if peerSessionsAndTheirPeers[ps.id]?.length}
							{peerSessionsAndTheirPeers[ps.id].length}:
							{peerSessionsAndTheirPeers[ps.id].map(psp => psp.data.name || psp.id).join(', ')}
						{:else}
							0
						{/if}
					</li>
					<li><button on:click={() => activatePeerSession(ps.id)}>Activate</button></li>
				</ul>
			</li>
		{/each}
		</ol>
	{/if}

	Other previous Peer Sessions...
	


	
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