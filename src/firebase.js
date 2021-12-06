import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
//import { getAnalytics } from "firebase/analytics";
//
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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


// Auth methods
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
	try {
		const auth = getAuth(firebaseApp);
		const user = auth.currentUser;
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

// db methods
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



// PRJECTS //
export const readProjects = async (limit = 100, offset = 0) => {
	const querySnapshot = await getDocs(collection(db, 'projects'));
	console.log(`readProjects:`);
	querySnapshot.forEach((doc, d) => {
		console.log(`#${d}: ${doc.id} => ${doc.data()}`);
	});
	return querySnapshot;
};
export const createProject = async (name) => {
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