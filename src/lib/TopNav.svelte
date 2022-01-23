<script>
	import MagicButton from './MagicButton.svelte';
	import { sAuthInfo, sCurProject } from '../stores.js';

	export let showAuth = false;
	let curProjectTitle = "";
	let authButtonText = "";
	let authButtonDisabled = false;

	sAuthInfo.subscribe(obj => {
		authButtonDisabled = obj.isBusy;
		if (authButtonDisabled) {
			authButtonText = "Checking...";
		} else {
			authButtonText = obj.isLoggedIn ? "Log Out" : "Log In";
		}
	});

	sCurProject.subscribe(obj => curProjectTitle = obj?.data?.name || "");

</script>

<div class="nobr">
	<span class="projectTitle">{curProjectTitle}</span>
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
		//overflow: hidden;
	}

	.magic {
		float: right;
	}

</style>