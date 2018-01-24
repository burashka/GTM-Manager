const util = require('util');

function promisify(fn, params, parent){
	return util.promisify(fn).call(parent, params);
}

module.exports = promisify;