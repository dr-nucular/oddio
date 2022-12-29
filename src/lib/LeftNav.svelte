<script>
	import { onDestroy } from 'svelte';
	import MagicButton from './MagicButton.svelte';
	import { sAuthInfo, sCurProject, sPeerSession } from '../stores.js';

	// exported attributes
	export let showProjects = false;
	export let showClock = false;
	export let showSync = false;
	export let showGroupSession = false;
	export let showPeerSession = false;
	export let showPeers = false;

	// subscription vars
	let notLoggedIn = true;
	let noCurProject = true;
	let noAccessYet = true;
	let peerSession;

	// subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		notLoggedIn = !obj.isLoggedIn;
		noAccessYet = notLoggedIn || noCurProject;
	});
	const unsubCurProject = sCurProject.subscribe(obj => {
		noCurProject = obj === null;
		noAccessYet = notLoggedIn || noCurProject;
	});
	const unsubPeerSession = sPeerSession.subscribe(obj => peerSession = obj);

	onDestroy(() => {
		unsubAuthInfo();
		unsubCurProject();
		unsubPeerSession();
	});

</script>

<MagicButton text="Projects" disabled={notLoggedIn} color="#bb99bb" moduleName="projects" visible={showProjects}/>
<hr/>
<MagicButton text="Sync" color="#ccaa88" moduleName="sync" visible={showSync}/>
<br/>
<MagicButton text="Clock" color="#88cccc" moduleName="clock" visible={showClock}/>
<br/>
<MagicButton text="Group Session" color="#8888cc" moduleName="groupSession" visible={showGroupSession}/>
<br/>
<MagicButton text="Peer Session" disabled={notLoggedIn} color="#cc8888" moduleName="peerSession" visible={showPeerSession}/>
<br/>
<MagicButton text="Peers" disabled={notLoggedIn || !peerSession} color="#88cc88" moduleName="peers" visible={showPeers}/>
<br/>

<style>

	hr {
		border: 0;
		height: 2px;
		background: #ff3e00;
		background-image: linear-gradient(to left, #fff, #ff3e00);
		margin: 6px 0 12px;
	}

</style>