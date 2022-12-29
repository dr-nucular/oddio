import { writable } from 'svelte/store';

export let sAuthInfo = writable({
	isBusy: false,
	isLoggedIn: false,
	// then some firestore user props:
	isAnonymous: false,
	displayName: null,
	email: null,
	uid: null
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


// ODDIO shizzle
export let sBuffs = writable({});

//////////////////////////////////////// 

export let sProject = writable({});

export let sSyncSettings = writable({
	clockOffset: 0,
	baseLatency: 0,
	outputLatency: 0,
	latencyAdjustment: 0,
	lastUpdated: 0
});

export let sPeerSession = writable(null);
export let sPeerSessions = writable([]);