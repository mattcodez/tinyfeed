'use strict';

var mongoose = require('mongoose'),
		bcrypt = require('bcrypt-nodejs'),
		Schema = mongoose.Schema,
		ObjectId = Schema.ObjectId;

var fields = {
	//e-mail right now is effectively their username for logging in
	email: { type: String, required:true, unique:true, lowercase:true, trim:true },
	displayName: { type: String },
	password: { type: String, select:false },
	active: { type: Boolean, default: true },
	created: { type: Date , default: Date.now }
};

var schema = new Schema(fields);

schema.pre('save', function(next, done){
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
