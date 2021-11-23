const DEBUG = true;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Auth {
	//static instance;

	constructor() {
		// this is a singleton service
		if (Auth.instance) return Auth.instance;
		Auth.instance = this;

		// members
	}

	isLoggedIn() {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(true);
			}, 2000);
		});
	}
}

export default new Auth();
