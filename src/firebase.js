import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import {
	getFirestore, collection, query, where, orderBy, limit,
	doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
	serverTimestamp
} from "firebase/firestore";
//import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDphv39jnv7UcFhH94XFajtfa12gpG48wY",
  authDomain: "odddio.firebaseapp.com",
  projectId: "odddio",
  storageBucket: "odddio.appspot.com",
  messagingSenderId: "410607179750",
  appId: "1:410607179750:web:6b32f8d4e2cec85c33a827",
  measurementId: "G-5NT142J8J9"
};

// Initialize Firebase, Cloud Firestore, etc.
const firebaseApp = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
const db = getFirestore();
//const analytics = getAnalytics(firebaseApp);


//////////
// AUTH //
//////////
export const firebaseLogin = async () => {
	try {
		const auth = getAuth(firebaseApp);
		const res = await signInWithPopup(auth, provider).then((result) => {
			const user = result.user;
			console.log(`firebaseLogin SUCCESS: ${user.email} (${user.displayName})`);
		});
		return res;
	} catch (err) {
		console.error(`firebaseLogin ERROR: ${err}`);
	}
};

export const firebaseLogout = async () => {
	try {
		const auth = getAuth(firebaseApp);
		const res = await signOut(auth).then(() => {
			console.log(`firebaseLogout SUCCESS!`);
		});
		return res;
	} catch (err) {
		console.error(`firebaseLogout ERROR: ${err}`);
	}
};

export const firebaseCurrentUser = (strict = false) => {
	let user;
	try {
		const auth = getAuth(firebaseApp);
		user = auth.currentUser;
		if (user) {
			console.log(`firebaseCurrentUser: ${user.email} (${user.displayName})`);
		} else {
			console.log(`firebaseCurrentUser: no user currently logged in, or auth obj hasn't finished initializing`);
		}
		if (strict && !user) {
			throw `firebaseCurrentUser: user must be logged in`;
		}
		return user;
	} catch (err) {
		console.error(`firebaseCurrentUser ERROR: ${err}`);
		if (strict && !user) {
			throw new Error(err);
		}
	}
};

export const firebaseCreateUserObserver = (cb) => {
	try {
		const auth = getAuth(firebaseApp);
		onAuthStateChanged(auth, cb);
	} catch (err) {
		console.error(`firebaseCreateUserObserver ERROR: ${err}`);
		cb();
	}
};



/////////////////////////////////////
// QUERY & CRUD general content:   //
// soundSets, graphs, compositions //
/////////////////////////////////////

export const queryContent = async (collectionName, projectId, limitNum = 100, offset = 0) => {
	try {
		//const user = firebaseCurrentUser(true);
		const projectDocRef = doc(db, "projects", projectId);
		const q = query(
			collection(db, collectionName),
			//where('userId', '==', user.uid),
			where('project', '==', projectDocRef),
			orderBy('updatedAt', 'desc'),
			limit(limitNum)
		);
		const querySnap = await getDocs(q);
		const results = [];
		querySnap.forEach((docSnap) => {
			//console.log(`${docSnap.id} => ${JSON.stringify(docSnap.data(), null, 2)}`);
			results.push(docSnap);
			/*
			results.push({
				id: docSnap.id,
				data: docSnap.data()
			});
			*/
		});
		console.log(`queryContent ${collectionName}: ${results.length} documents`);
		return results;
	} catch (err) {
		console.error(`queryContent ERROR: ${err}`);
	}
};
export const readContent = async (collectionName, id) => {
	try {
		const docRef = doc(db, collectionName, id);
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			console.log(`readContent (id: ${id}):`, docSnap.data());
			return docSnap;
			//return { id: docSnap.id, data: docSnap.data() };
		} else {
			// doc.data() will be undefined in this case
			throw `No such document with id: ${id}!`;
		}
	} catch (err) {
		console.error(`readContent ERROR: ${err}`);
	}
};
export const createContent = async (collectionName, data) => {
	// data = { project: 'projectRef/goeshere', name: 'something', configJson: 'stringifiedJson goes here' }
	try {
		const user = firebaseCurrentUser(true);
		const ts = serverTimestamp();
		const docSnap = await addDoc(collection(db, collectionName), {
			userId: user.uid,
			createdAt: ts,
			updatedAt: ts,
			project: data.project,
			name: data.name,
			configJson: data.configJson
		});
		console.log(`createContent: New ${collectionName} doc created with id: ${docSnap.id}`);
		return docSnap;
	} catch (err) {
		console.error(`createContent ERROR: ${err}`);
	}
};
export const cloneContent = async (collectionName, id, newProjectRef) => {
	// if newProjectRef, makes a copy and sets project to newProjectRef.
	// if no newProjectRef, makes a copy and appends " [copy]" to the name.
	try {
		const srcDocSnap = await readContent(collectionName, id);
		const srcData = srcDocSnap.data();
		const newDocSnap = await createContent(collectionName, {
			project: newProjectRef ? newProjectRef : srcData.project,
			name: newProjectRef ? srcData.name : `${srcData.name} [copy]`,
			configJson: srcData.configJson
		});
		console.log(`cloneContent: New ${collectionName} doc ${newDocSnap.id} cloned from id: ${id}`);
		return newDocSnap;
	} catch (err) {
		console.error(`cloneContent ERROR: ${err}`);
	}
};
export const updateContent = async (collectionName, id, data) => {
	// data = { name: 'something', configJson: 'stringifiedJson goes here' }
	try {
		const docRef = doc(db, collectionName, id);
		await updateDoc(docRef, {
			updatedAt: serverTimestamp(),
			name: data.name,
			configJson: data.configJson
		});
		console.log(`updateContent: doc id ${id} updated`);
		return;
	} catch (err) {
		console.error(`updateContent ERROR: ${err}`);
	}
};
export const deleteContent = async (collectionName, id) => {
	try {
		const docRef = doc(db, collectionName, id);
		await deleteDoc(docRef);
		console.log(`deleteContent: doc id ${id} deleted`);
		return;
	} catch (err) {
		console.error(`deleteContent ERROR: ${err}`);
	}
};



///////////////////////////
// QUERY & CRUD projects //
///////////////////////////

export const queryProjects = async (limitNum = 100, offset = 0) => {
	try {
		const user = firebaseCurrentUser(true);
		const q = query(collection(db, 'projects'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(limitNum));
		const querySnap = await getDocs(q);
		const results = [];
		querySnap.forEach((docSnap) => {
			//console.log(`${docSnap.id} => ${JSON.stringify(docSnap.data(), null, 2)}`);
			results.push(docSnap);
			/*
			results.push({
				id: docSnap.id,
				data: docSnap.data()
			});
			*/
		});
		console.log(`queryProjects: ${results.length} documents`);
		return results;
	} catch (err) {
		console.error(`queryProjects ERROR: ${err}`);
	}
};
export const readProject = async (id) => {
	try {
		const docRef = doc(db, 'projects', id);
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			console.log(`readProject (id: ${id}):`, docSnap.data());
			return docSnap;
			//return { id: docSnap.id, data: docSnap.data() };
		} else {
			// doc.data() will be undefined in this case
			throw `No such project with id: ${id}!`;
		}
	} catch (err) {
		console.error(`readProject ERROR: ${err}`);
	}
};
export const createProject = async (data) => {
	// data = { name: 'string', soundSet: 'soundSets/id', graph: 'graphs/id', composition: 'compositions/id' }
	// set whatever fields you want to set
	try {
		const user = firebaseCurrentUser(true);
		const ts = serverTimestamp();
		data.userId = user.uid;
		data.createdAt = ts;
		data.updatedAt = ts;
		const docSnap = await addDoc(collection(db, 'projects'), data);
		console.log(`createProject: New projects doc created with id: ${docSnap.id}`);
		return docSnap;
	} catch (err) {
		console.error(`createProject ERROR: ${err}`);
	}
};
export const cloneProject = async (id) => {
	// 1. clone project but leave ref fields unset.  get newProjectRef
	// 2. get all docs for the other proj
	// 3. clone all the docs exactly as they are, setting new proj
	// 4. keep id map of each srcDoc to newDoc
	// 5. update new project, setting soundSet, graph, composition accordingly
	// makes a copy and appends " [copy]" to the name
	try {
		// 1
		const srcDocSnap = await readProject(id);
		const srcData = srcDocSnap.data();
		const newDocSnap = await createProject({
			name: `${srcData.name} [copy]`,
			//soundSet: srcData.soundSet,
			//graph: srcData.graph,
			//composition: srcData.composition
		});
		console.log(`cloneProject: New projects doc ${newDocSnap.id} cloned from id: ${id}`);
		const newProjectRef = doc(db, 'projects', newDocSnap.id);

		// 2
		const srcSoundSets = await queryContent('soundSets', id);
		const srcGraphs = await queryContent('graphs', id);
		const srcCompositions = await queryContent('compositions', id);

		// 3 and 4
		const soundSetMap = {};
		for (const srcSoundSet of srcSoundSets) {
			const newSoundSetSnap = await cloneContent('soundSets', srcSoundSet.id, newProjectRef);
			console.log(`....setting soundSetMap[${srcSoundSet.id}] =`, newSoundSetSnap);
			soundSetMap[srcSoundSet.id] = newSoundSetSnap;
		}
		const graphMap = {};
		for (const srcGraph of srcGraphs) {
			const newGraphSnap = await cloneContent('graphs', srcGraph.id, newProjectRef);
			console.log(`....setting graphMap[${srcGraph.id}] =`, newGraphSnap);
			graphMap[srcGraph.id] = newGraphSnap;
		}
		const compositionMap = {};
		for (const srcComposition of srcCompositions) {
			const newCompositionSnap = await cloneContent('compositions', srcComposition.id, newProjectRef);
			console.log(`....setting compositionMap[${srcComposition.id}] =`, newCompositionSnap);
			compositionMap[srcComposition.id] = newCompositionSnap;
		}

		// 5
		const updateData = {};
		console.log(`....need srcData.soundSet.id =`, srcData.soundSet?.id);
		if (srcData.soundSet?.id && soundSetMap[srcData.soundSet.id]) {
			updateData.soundSet = soundSetMap[srcData.soundSet.id];
		}
		console.log(`....need srcData.graph.id =`, srcData.graph?.id);
		if (srcData.graph?.id && graphMap[srcData.graph.id]) {
			updateData.graph = graphMap[srcData.graph.id];
		}
		console.log(`....need srcData.composition.id =`, srcData.composition?.id);
		if (srcData.composition?.id && compositionMap[srcData.composition.id]) {
			updateData.composition = compositionMap[srcData.composition.id];
		}
		if (Object.keys(updateData).length) {
			await updateProject(newDocSnap.id, updateData);
			const updatedDocSnap = await readProject(newDocSnap.id);
			return updatedDocSnap;
		}
		return newDocSnap;
	} catch (err) {
		console.error(`cloneProject ERROR: ${err}`);
	}
};
export const updateProject = async (id, data) => {
	// possible data fields are:
	// data = { name: 'string', soundSet: 'soundSets/idGoesHere', graph: 'graphs/idGoesHere', composition: 'compositions/idGoesHere' }
	// set whatever fields you want to update
	try {
		const docRef = doc(db, 'projects', id);
		data.updatedAt = serverTimestamp(); // set updatedAt
		// convert reference strings, i.e. "collectionName/idString", into docRefs
		if (typeof data.soundSet === 'string') {
			data.soundSet = doc(db, data.soundSet);
		}
		if (typeof data.graph === 'string') {
			data.graph = doc(db, data.graph);
		}
		if (typeof data.composition === 'string') {
			data.composition = doc(db, data.composition);
		}
		await updateDoc(docRef, data);
		console.log(`updateProject: project id ${id} updated`);
		return;
	} catch (err) {
		console.error(`updateProject ERROR: ${err}`);
	}
};
export const deleteProject = async (id) => {
	try {
		// first delete all docs for this project id
		const soundSets = await queryContent('soundSets', id);
		for (const soundSet of soundSets) {
			await deleteContent('soundSets', soundSet.id);
		}
		const graphs = await queryContent('graphs', id);
		for (const graph of graphs) {
			await deleteContent('graphs', graph.id);
		}
		const compositions = await queryContent('compositions', id);
		for (const composition of compositions) {
			await deleteContent('compositions', composition.id);
		}

		// finally delete the project itself
		const docRef = doc(db, 'projects', id);
		await deleteDoc(docRef);
		console.log(`deleteProject: doc id ${id} deleted (and all its related content)`);
		return;
	} catch (err) {
		console.error(`deleteProject ERROR: ${err}`);
	}
};



////// TEMP //////
export const firebaseAddDoc = async (collectionName, data) => {
	try {
		const docRef = await addDoc(collection(db, collectionName), data);
		console.log(`firebaseAddDoc: Document written with id: ${docRef.id}`);
	} catch (err) {
		console.error(`firebaseAddDoc ERROR: ${err}`);
	}
};

export const firebaseGetDocs = async (collectionName) => {
	const querySnapshot = await getDocs(collection(db, collectionName));
	console.log(`firebaseGetDocs:`);
	querySnapshot.forEach((doc, d) => {
		console.log(`#${d}: ${doc.id} => ${doc.data()}`);
	});
};