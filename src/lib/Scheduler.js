import Oddio from './Oddio';

const DEBUG = true;

class ScheduledEvent {
	// clockType = "audio" or "dom"
	// at = <mediaTime>
	// data = {}
}

class Scheduler {

	constructor(id) {
		console.log(`Scheduler.constructor('${id}')`);
		this.id = id;
		this.ac = Oddio.getAC();
		this.events = []; // array of objects, each like: { at: <float seconds>, method: "<methodName>", etc }
		this.curEventIdx = 0; // not used yet
		this.scheduledEvents = [];

		this.pollPeriod = 1; //0.5; // seconds
		this.pollPeriodOverlap = 1; //0.1; // seconds
		this.pollTimeoutId = null;
	}

	setEvents(events) {
		console.log(`Scheduler.setEvents(): ${events.length} events total`);
		this.events = events;
	}
	// addEvents()
	// removeEvents()?

	start(fromTime) {
		// clear it if its already going
		this.stop();

		// fromTime, if !undefined, should set Oddio's playheadNow data first
		if (fromTime !== undefined) {
			Oddio.setClockParams({ mediaTime: fromTime });
		}
		
		// timeout callback
		const timeoutCB = () => {
			this.pollTimeoutId = setTimeout(timeoutCB, this.pollPeriod * 1000);
			this._scheduleEvents();
		};

		// run it now to kickstart it
		this.pollTimeoutId = setTimeout(timeoutCB, this.pollPeriod * 1000);
		this._scheduleEvents();
	}

	stop() {
		if (this.pollTimeoutId) {
			clearTimeout(this.pollTimeoutId);
			this.pollTimeoutId = null;
		}
		this._cancelScheduledEvents();
	}

	_scheduleEvents(clock) {
		if (!clock) {
			clock = Oddio.getClock();
		}
		const eventTimeSpan = (this.pollPeriod + this.pollPeriodOverlap) * clock.mediaSpeed;
		const mediaTimeStart = clock.now;
		const mediaTimeEnd = clock.now + eventTimeSpan;

		// prune scheduledEvents, removing any items that are not in the scheduleWindow
		this.scheduledEvents = this.scheduledEvents.filter(event => !(event.at < mediaTimeStart || event.at > mediaTimeEnd));

		console.log(`_scheduleEvents(): scheduling events from ${mediaTimeStart} to ${mediaTimeEnd}`);
		this.events.forEach((event, eventIdx) => {
			if (event.at < mediaTimeStart || event.at > mediaTimeEnd) return;
			if (this.scheduledEvents.indexOf(event) !== -1) {
				console.log(`_scheduleEvents(): SKIP: already scheduled event ${JSON.stringify(event)} (idx ${eventIdx}) (at: ${event.at})`);
				return;
			}
			const when = ((event.at - clock.mediaTime) / clock.mediaSpeed) + clock.acTime;
			console.log(`_scheduleEvents(): scheduling event ${JSON.stringify(event)} (idx ${eventIdx}) (at: ${event.at} == when: ${when})`);

			// do it... based on event props
			if (event.createVoice) {
				Oddio.createVoice(event.createVoice.graphId, event.createVoice.id);
			}
			if (event.method) {
				const voice = Oddio.getVoiceById(event.method.voiceId);
				voice.doMethod(event.method.name, { acTime: when });
			}

			this.scheduledEvents.push(event);
		});
	}

	_cancelScheduledEvents(clock) {
		if (!clock) {
			clock = Oddio.getClock();
		}
		//console.log(`_cancelScheduledEvents(): canceling all scheduled events from ${clock.now} and on...`);
		console.log(`_cancelScheduledEvents(): canceling all scheduled events`);

		// TODO

		this.scheduledEvents = [];
	}

}

export { ScheduledEvent, Scheduler };
