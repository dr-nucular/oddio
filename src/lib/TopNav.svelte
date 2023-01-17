<script>
	import { onDestroy } from 'svelte';
	import MagicButton from './MagicButton.svelte';
	import { sAuthInfo, sCurProject } from '../stores.js';

	// exported attributes
	export let showAuth = false;

	// subscription vars
	let curProject = null;
	let authButtonText = "";
	let authButtonDisabled = false;

	// subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		authButtonDisabled = obj.isBusy;
		if (authButtonDisabled) {
			authButtonText = "Checking...";
		} else {
			authButtonText = obj.isLoggedIn ? "Log Out" : "Log In";
		}
	});
	const unsubCurProject = sCurProject.subscribe(obj => curProject = obj);

	onDestroy(() => {
		unsubAuthInfo();
		unsubCurProject();
	});

</script>

<div class="nobr">
	<span class="projectTitle">{curProject?.data().name || ""}</span>
	<div class="magic">
		&nbsp;&nbsp;&nbsp;&nbsp;
		<MagicButton text={authButtonText} disabled={authButtonDisabled} color="#ff6600" moduleName="auth" visible={showAuth}/>
	</div>
</div>

<style>

	.nobr {
		white-space: nowrap;
	}
	.projectTitle {
		color: #ccc;
		font: italic 400 40px/35px Ubuntu;
		white-space: normal;
	}
	.magic {
		float: right;
	}

</style>