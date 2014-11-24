'use strict';

var mongoose = require('mongoose'),
		bcrypt = require('bcrypt'),
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

schema.pre('save', function(next){
	var user = this;
	if (!user.isModified('password')) return next();

	bcrypt.hash(user.password, null, null, function(err, hash) {
	    if (err) return next(err);
			user.password = hash;
			next();
	});
});

schema.methods.validPassword = function(password){
	return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', schema);
