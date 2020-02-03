'use strict';
const superagent = require('superagent');
const crypto = require('crypto');

require('util').inherits(Granny, require('events').EventEmitter);

module.exports = Granny;

function Granny(options = {}) {
	/* Access level / credentials */
	this.accessToken = false;
	if (options.accessToken) this.setAccessToken(options.accessToken);

	/* Access level / domain */
	this.domain = '';
	if (options.domain) this.setDomain(options.domain);

	this.accessKey = options.accessKey || '';
	this.accessSecret = options.accessSecret || '';
}

Granny.prototype.setOptions = function(options) {
	/* Access level / domain */
	if (options.domain) this.setDomain(options.domain);
	if (options.accessKey) this.accessKey = options.accessKey;
	if (options.accessSecret) this.accessSecret = options.accessSecret;
};

Granny.prototype.setAccessToken = function(token) {
	this.accessToken = token;
};
Granny.prototype.setDomain = function(domain) {
	this.domain = domain;
};

Granny.prototype.request = async function(method, path, data = {}, options = {}) {
	try {
		let request = superagent;

		if (method == 'GET') {
			request = request.get(this.domain + path);
		} else if (method == 'POST') {
			request = request.post(this.domain + path);
		} else throw new Error('method is not supported');

		if (data.query) request = request.query(data.query);
		if (data.form) request = data.file ? request.field(data.form) : request.send(data.form);
		if (data.file) request = request.attach('image', data.file);

		request = request.set('Accept', 'application/json');

		//auth
		if (options.auth) {
			if (options.auth.indexOf('accessToken') != -1 && this.accessToken)
				request = request.set('Authorization', this.accessToken);

			if (options.auth.indexOf('accessKey') != -1 && this.accessKey && this.accessSecret) {
				let sign =
					this.accessKey +
					'||' +
					crypto
						.createHmac('sha1', this.accessSecret)
						.update(this.accessKey)
						.digest('hex');

				if (method == 'POST') request = data.file ? request.field({ sign }) : request.send({ sign });
				if (method == 'GET') request = request.query({ sign });
			}
		}

		let response = await request;

		let responseData = response.text;
		if (response.type == 'application/json') {
			responseData = JSON.parse(responseData);
			if (!responseData.success && responseData.error) {
				if (responseData.error == 'login_required') this.emit('logged_out');

				return [new Error(responseData.error), responseData, response];
			}
		}

		return [null, responseData, response];
	} catch (e) {
		return [e, null, null];
	}
};

/* openAPI */
require('./components/openAPI.js');
require('./components/authAPI.js');
require('./components/domainAPI.js');
require('./components/imageAPI.js');
require('./components/directoryAPI.js');
