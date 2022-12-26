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

export const getPeerSessionId = () => {
	return window.localStorage.getItem('peerSessionId');
};
export const setPeerSessionId = (id) => {
	window.localStorage.setItem('peerSessionId', id);
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