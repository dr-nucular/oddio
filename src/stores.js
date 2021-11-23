import { writable } from 'svelte/store';

export let authData = writable({
	isBusy: true,
	isLoggedIn: false,
	username: null,
});

export let audioContextData = writable({
	state: undefined
});

export let soundSourcesData = writable([
	{ name: "Drumz", src: "abc123" },
	{ name: "Twinklez", src: "abcd1234" }
]);

export let channelGraphData = writable([
	{ name: "Input", type: "soundSourceNode" },
	{ name: "Output", type: "destinationNode" }
]);

export let uiModulesData = writable({
	default: {
		visible: false,
		bgcolor: "#123456",
	}
});