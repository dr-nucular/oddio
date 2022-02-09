import { writable } from 'svelte/store';

export let sAuthInfo = writable({
	isBusy: false,
	isLoggedIn: false,
	username: null,
});

export let sModules = writable({});

export let sProjects = writable([]);
export let sCurProject = writable(null);

export let sProjDocs = writable({
	soundSets: [],
	graphs: [],
	compositions: []
});
export let sActiveProjDocs = writable({
	soundSets: null,
	graphs: null,
	compositions: null
});

// this is just an obj, not a writable store
export const gProjDocProps = {
	soundSets: {
		projRefField: "soundSet",
		singular: "Sound Set",
		plural: "Sound Sets"
	},
	graphs: {
		projRefField: "graph",
		singular: "Audio Graph",
		plural: "Audio Graphs"
	},
	compositions: {
		projRefField: "composition",
		singular: "Composition",
		plural: "Compositions"
	}
};

export let sAudioContextInfo = writable({
	state: undefined
});




