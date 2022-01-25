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
			console.log(`${docSnap.id} => ${JSON.stringify(docSnap.data(), null, 2)}`);
			results.push({
				id: docSnap.id,
				data: docSnap.data()
			});
		});
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
			return { id: docSnap.id, data: docSnap.data() };
		} else {
			// doc.data() will be undefined in this case
			throw `No such document with id: ${id}!`;
		}
	} catch (err) {
		console.error(`readContent ERROR: ${err}`);
	}
};
export const createContent = async (collectionName, data) => {
	// data = { project: 'projectRef/here', name: 'something', configJson: 'stringifiedJson goes here' }
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
export const cloneContent = async (collectionName, id) => {
	// makes a copy and appends " [copy]" to the name
	try {
		const srcDocSnap = await readContent(collectionName, id);
		const srcData = srcDocSnap.data;
		const newDocSnap = await createContent(collectionName, {
			project: srcData.project,
			name: `${srcData.name} [copy]`,
			configJson: srcData.configJson
		});
		return newDocSnap;
	} catch (err) {
		console.error(`cloneContent ERROR: ${err}`);
	}
};
export const updateContent = async (collectionName, id, data) => {
	// data = { name: 'something', configJson: 'stringifiedJson goes here' }
	try {
		const docSnap = await updateDoc(doc(db, collectionName, id), {
			updatedAt: serverTimestamp(),
			name: data.name,
			configJson: data.configJson
		});
		console.log(`updateContent: doc ${docSnap.id} updated`);
		return docSnap;
	} catch (err) {
		console.error(`updateContent ERROR: ${err}`);
	}
};
export const deleteContent = async (collectionName, id) => {
	try {
		const docSnap = await deleteDoc(doc(db, collectionName, id));
		console.log(`deleteContent: doc ${docSnap.id} deleted`);
		return docSnap;
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
			console.log(`${docSnap.id} => ${JSON.stringify(docSnap.data(), null, 2)}`);
			results.push({
				id: docSnap.id,
				data: docSnap.data()
			});
		});
		return results;		
	} catch (err) {
		console.error(`queryProjects ERROR: ${err}`);
	}
};
export const createProject = async (name) => {
	// should additionally create "mySoundSet", "myGraph", and "myComposition" items
	try {
		const user = firebaseCurrentUser(true);
		const docRef = await addDoc(collection(db, 'projects'), {
			userId: user.uid,
			createdAt: serverTimestamp(),
			name,
		});
		console.log(`createProject: New project created with id: ${docRef.id}`);
		return docRef;
	} catch (err) {
		console.error(`createProject ERROR: ${err}`);
	}
};
export const updateProject = async (id, data) => {
	try {
		//const user = firebaseCurrentUser(true);
		const docRef = await updateDoc(id, {
			updatedAt: serverTimestamp(),
			data,
		});
		console.log(`updateProject: project ${docRef.id} updated`);
		return docRef;
	} catch (err) {
		console.error(`updateProject ERROR: ${err}`);
	}
};
export const deleteProject = async (id) => {
	try {
		//const user = firebaseCurrentUser(true);
		const docRef = await deleteDoc(id);
		console.log(`deleteProject: project ${docRef.id} updated`);
		return docRef;
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