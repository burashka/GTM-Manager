class Debouncer {
	constructor(timeout){
		this.queue = [];
		this.inProgress = false;
		this.timeout = timeout;
	}
	async push(fn){
		return new Promise(async (resolve, reject) => {
			this.queue.push({ fn, resolve, reject });
			if (!this.inProgress) this.run();
		});
	}
	async run(){
		const { fn, resolve, reject } = this.queue.shift();

		try {
			this.inProgress = true;
			resolve(await fn());
		} catch (e) {
			reject(e);
		}

		setTimeout(() => {
			this.inProgress = false;
			if (this.queue.length) this.run();
		}, this.timeout);
	}
}

module.exports = Debouncer;