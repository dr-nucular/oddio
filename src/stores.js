import { writable } from 'svelte/store';

export let sAuthInfo = writable({
	isBusy: false,
	isLoggedIn: false,
	username: null,
});

export let sModules = writable({});

export let sProjects = writable([]);
export let sCurProject = writable(null);

export let sSoundSets = writable([]);
export let sCurSoundSet = writable(null);

export let sGraphs = writable([]);
export let sCurGraph = writable(null);

export let sCompositions = writable([]);
export let sCurComposition = writable(null);


export let sAudioContextInfo = writable({
	state: undefined
});




