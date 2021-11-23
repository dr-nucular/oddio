<script>

	import { firebaseLogin, firebaseLogout, firebaseCurrentUser } from '../firebase.js';

	import { uiModulesData, authData } from '../stores.js';
	export let modules = {};

	export let title = 'Log In';
	authData.subscribe(obj => {
		title = obj.isLoggedIn ? "Log Out" : "Log In";
	});

	uiModulesData.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.logInOut?.bgColor}`;

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<b>{title}</b><hr/>
	Make this dynamic of course.  Use Firebase's Cloud Firestore & Authentication<br/>

	<b>firebaseCurrentUser: {firebaseCurrentUser()?.email}</b><br/>

	<button on:click={firebaseLogin}>
		Login using google
	</button>

	<button on:click={firebaseLogout}>
		Logout
	</button>

</div>


<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>