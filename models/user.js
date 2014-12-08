'use strict';

var mongoose = require('mongoose'),
		bcrypt = require('bcrypt-nodejs'),
		Schema = mongoose.Schema,
		ObjectId = Schema.ObjectId;

var fields = {
	//email right now is effectively their username for logging in
	email:				{ type: String, select: false, required: true, unique: true, lowercase: true, trim: true },
	password:			{ type: String, select: false, required: true, trim: true },
	displayName:	{ type: String, default: 'Your name here', required: true, trim: true },
	active:				{ type: Boolean, default: true },
	created:			{ type: Date, default: Date.now },
	uploads: {
		videos:			{ type: [String], default: [] }
	},
	metrics: {
		fame:			{ type: Number, default: 0 },
		timeWatching:	{ type: Number, default: 0 }
	}
};

var schema = new Schema(fields);

schema.pre('save', true, function(next, done){
	var user = this;
	if (!user.isModified('password')) return next();

	next();
	bcrypt.hash(user.password, null, null, function(err, hash) {
	    if (err) return done(err);
			user.password = hash;
			done();
	});
});

schema.methods.validPassword = function(password){
	return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', schema);
