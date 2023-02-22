/**
 * various utility methods
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * return Promise that resolves after ms milliseconds
 *
 * @param      {number}   ms      Specify desired delay in milliseconds
 * @return     {Promise} 
 */
export const delay = (ms) => {
	if (ms > 0) {
		return new Promise(function (resolve) {
			setTimeout(() => { resolve(); }, ms);
		});
	}
	return Promise.resolve();
};

export const getDeviceId = () => {
	/*
	OLD:
	let deviceId = window.localStorage.getItem('deviceId');
	if (!deviceId) {
		deviceId = uuidv4();
		//deviceId = Math.random().toString(36).substring(7);
		window.localStorage.setItem('deviceId', deviceId);
	}
	return deviceId;
	*/
	return window.localStorage.getItem('deviceId');
};
export const setDeviceId = (id) => {
	window.localStorage.setItem('deviceId', id);
};

/*
export const getGroupSessionId = () => {
	return window.localStorage.getItem('groupSessionId');
};
export const setGroupSessionId = (id) => {
	window.localStorage.setItem('groupSessionId', id);
};
*/

export const lsGetPeerSessionId = () => {
	return window.localStorage.getItem('peerSessionId');
};
export const lsSetPeerSessionId = (id) => {
	if (id) {
		window.localStorage.setItem('peerSessionId', id);
	} else {
		window.localStorage.removeItem('peerSessionId');
	}
};

export const lsGetPeerId = () => {
	return window.localStorage.getItem('peerId');
};
export const lsSetPeerId = (id) => {
	if (id) {
		window.localStorage.setItem('peerId', id);
	} else {
		window.localStorage.removeItem('peerId');
	}
};

export const processUpdatedAtData = (ps) => {
	if (!ps?.data) return;
	//const newPs = JSON.parse(JSON.stringify(ps));
	ps.data.updatedAtPretty = agePrettified(Date.now() - ps.data.updatedAt.toDate().valueOf());
	return ps;
};

export const agePrettified = (ms) => {
	if (ms > 31536000000) {
		const years = (ms / 31536000000).toFixed(1);
		return `${years} years ago`;
	} else if (ms > 2592000000) {
		const months = (ms / 2592000000).toFixed(1);
		return `${months} months ago`;
	} else if (ms > 604800000) {
		const weeks = (ms / 604800000).toFixed(1);
		return `${weeks} weeks ago`;
	} else if (ms > 86400000) {
		const days = (ms / 86400000).toFixed(1);
		return `${days} days ago`;
	} else if (ms > 3600000) {
		const hours = (ms / 3600000).toFixed(1);
		return `${hours} hours ago`;
	} else if (ms > 60000) {
		const mins = (ms / 60000).toFixed(1);
		return `${mins} mins ago`;
	} else if (ms > 1000) {
		const secs = (ms / 1000).toFixed(1);
		return `${secs} secs ago`;
	} else {
		return `just now`;
	}
};

export const getUrlParams = () => {
	const urlParams = {};
	let match;
	const pl = /\+/g;
	const search = /([^&=]+)=?([^&]*)/g;
	const decode = function (s) {
		return decodeURIComponent(s.replace(pl, ' '));
	};
	const query = window.location.search.substring(1);
	// eslint-disable-next-line no-cond-assign
	while ((match = search.exec(query)) !== null) {
		urlParams[decode(match[1])] = decode(match[2]);
	}
	return urlParams;
};

export const mean = (values) => {
    const sum = values.reduce((previous, current) => current += previous);
    return sum / values.length;
};

export const median = (arr) => {
    const mid = Math.floor(arr.length * 0.5);
    const sorted = [...arr].sort((a, b) => a - b);
    return arr.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) * 0.5 : sorted[mid];
};

export const trimmedMean = (values, trimPerc) => {
    const trimCount = Math.floor(trimPerc * values.length);
    return mean(values.sort((a, b) => a - b).slice(trimCount, values.length - trimCount));
};

/**
 * @template T
 * @param {T[]} srcArray
 * @param {boolean} ensureDifferentOrder if true, then will ensure result order is different from srcArray (if > 1 element)
 * @returns {T[]} a new array with a shuffle attempted on items
 */
 export const shuffle = (srcArray, ensureDifferentOrder = false) => {
	const result = srcArray.slice(0); // make a copy
	const arrayLen = result.length;
	if (arrayLen < 2) return result;

	let shuffleCompleted = false;
	const maxTries = 10;
	for (let t = 0; t < maxTries; t++) {
		// Fisher-Yates shuffle
		let curIdx = arrayLen;
		let tmpVal, randIdx;
		while (0 !== curIdx) {
			// pick a random remaining item
			randIdx = Math.floor(Math.random() * curIdx);
			curIdx -= 1;
			// swap it with current item
			tmpVal = result[curIdx];
			result[curIdx] = result[randIdx];
			result[randIdx] = tmpVal;
		}
		// end FY shuffle

		if (!ensureDifferentOrder || !areEqual(result, srcArray)) {
			shuffleCompleted = true;
			break;
		}
	}
	return shuffleCompleted ? result : derange(srcArray);
};