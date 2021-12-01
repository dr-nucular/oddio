import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
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

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
//const analytics = getAnalytics(firebaseApp);

export const firebaseLogin = async () => {
	try {
		const auth = getAuth(firebaseApp);
		const res = await signInWithPopup(auth, provider).then((result) => {
			const user = result.user;
			console.log(`firebaseLogin SUCCESS: ${user.email} (${user.displayName})`);
		});
		return res;
	} catch (err) {
		console.log(`firebaseLogin ERROR: ${err}`);
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
		console.log(`firebaseLogout ERROR: ${err}`);
	}
};

export const firebaseCurrentUser = () => {
	try {
		const auth = getAuth(firebaseApp);
		const user = auth.currentUser;
		if (user) {
			console.log(`firebaseCurrentUser: ${user.email} (${user.displayName})`);
		} else {
			console.log(`firebaseCurrentUser: no user currently logged in, or auth obj hasn't finished initializing`);
		}
		return user;
	} catch (err) {
		console.log(`firebaseCurrentUser ERROR: ${err}`);
	}
};

export const firebaseCreateUserObserver = (cb) => {
	try {
		const auth = getAuth(firebaseApp);
		onAuthStateChanged(auth, cb);
	} catch (err) {
		console.log(`firebaseCreateUserObserver ERROR: ${err}`);
		cb();
	}
};

// onAuthStateChanged:
// https://firebase.google.com/docs/auth/web/manage-users