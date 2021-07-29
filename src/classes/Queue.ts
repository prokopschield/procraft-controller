export type Value<T> = T | Value<T>[] | PromiseLike<Value<T>>;

export class Queue<T>
	implements Generator<Promise<T> | T, T | undefined, Value<T>>
{
	/**
	 * Create a new Queue of type T
	 * @param init Initial values
	 */
	constructor(...init: Value<T>[]) {
		this.add(init);
	}
	/**
	 * Add values to Queue
	 * Resolves pre-existing Promises first
	 * @param vals Values to add
	 */
	async add(...vals: Value<T>[]) {
		for (const val of vals) {
			if (typeof val === 'object' && 'then' in val) {
				// resolve Promise, then add
				//await this.add(await val);
				await val.then((v) => this.add(v));
			} else if (val instanceof Array) {
				// add each val in array
				this.add(...val);
			} else {
				// get existing Promise resolver, if it exists
				const callback = this.empties.length && this.empties.shift();
				if (callback) {
					// resolve existing Promise
					callback(val);
				} else {
					// resolve a later Promise
					this.values.push(val);
				}
			}
		}
	}
	/**
	 * Add values to Queue
	 * Does NOT resolve pre-existing values
	 * @param vals Values to add
	 */
	push(...vals: Value<T>[]) {
		for (const val of vals) {
			if (typeof val === 'object' && 'then' in val) {
				val.then((val) => this.push(val));
			} else if (val instanceof Array) {
				this.push(...val);
			} else {
				this.values.push(val);
			}
		}
	}
	/**
	 * Internal array of values, that will be yielded
	 */
	values = Array<T>();
	/**
	 * Internal array of Promise resolvers
	 */
	empties = Array<(value: T | PromiseLike<T>) => void>();
	/**
	 * Get a Promise that will be resolved after add() is called
	 */
	get empty(): Promise<T> {
		return new Promise((resolve) => this.empties.push(resolve));
	}
	/**
	 * Internal done state
	 */
	done = false;
	/**
	 * Get next value
	 * @param val [OPTIONAL] Values to add
	 */
	next(...val: Value<T>[]):
		| {
				value: Promise<T>;
				done: false;
		  }
		| {
				value: undefined;
				done: true;
		  } {
		const self = this;
		setImmediate(() => self.add(...val));
		const value = this.values.shift();
		if (value) {
			return {
				value: Promise.resolve(value),
				done: false,
			};
		} else if (this.done) {
			return {
				value: undefined,
				done: true,
			};
		} else {
			return {
				value: this.empty,
				done: false,
			};
		}
	}
	return(val?: T): {
		value: T | undefined;
		done: true;
	} {
		this.done = true;
		return {
			value: val,
			done: true,
		};
	}
	throw(err: Error) {
		throw err;
		return this.next();
	}
	[Symbol.iterator]() {
		return this;
	}
}

export default module.exports = Queue;

Object.defineProperties(Queue, {
	default: { get: () => Queue },
	Queue: { get: () => Queue },
});
