// @flow

class Stack {
	
	count: number;
	storage: any;
	
	constructor() {
		this.count = 0;
		this.storage = {};
	}

	push(value: any) {
		this.storage[this.count] = value;
		this.count++;
	}

	pop() {
		// Check to see if the stack is empty
		if (this.count === 0) {
			return undefined;
		}

		this.count--;
		const result = this.storage[this.count];
		delete this.storage[this.count];
		return result;
	}

	size() {
		return this.count;
	}

	isEmpty() {
		return this.size() === 0;
	}

	static create(data: string, sep: string) : Stack {
		const dataArray = data.split(sep).reverse();
		const result = new Stack();
		dataArray.forEach(elem => result.push(elem));

		return result;
	}
}

module.exports = Stack;
