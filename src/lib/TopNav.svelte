<script>

	import MagicButton from './MagicButton.svelte';

	export let showLogInOut = false;
	export let showLoadProject = false;


	import { authData } from '../stores.js';
	export let authButtonText = 'Log In?';
	export let authButtonDisabled = true;
	authData.subscribe(obj => {
		authButtonText = obj.isLoggedIn ? "Log Out" : "Log In";
		authButtonDisabled = obj.isBusy;
	});




</script>


<MagicButton text="Load Project" color="#dd9999" moduleName="loadProject" visible={showLoadProject}/>
&nbsp;
<MagicButton text={authButtonText} disabled={authButtonDisabled} color="#66aa66" moduleName="logInOut" visible={showLogInOut}/>
