'use strict';

var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		ObjectId = Schema.ObjectId;

var fields = {
	email: { type: String },
	displayName: { type: String },
	password: { type: String },
	active: { type: Boolean, default: true },
	created: { type: Date , default: Date.now }
};

var schema = new Schema(fields);

module.exports = mongoose.model('User', schema);
