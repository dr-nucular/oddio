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

export const getGroupSessionId = () => {
	return window.localStorage.getItem('groupSessionId');
};
export const setGroupSessionId = (id) => {
	window.localStorage.setItem('groupSessionId', id);
};
