const Response = require('./response');

class DefaultResponse extends Response {

	constructor(response, options) {
		super(response, options);
	}
}

module.exports = DefaultResponse;