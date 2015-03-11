var ffmpeg = require('fluent-ffmpeg'),
		fs = require('fs'),
		passport = require('passport'),
		LocalStrategy = require('passport-local').Strategy,
		mongoose = require('mongoose'),
		User = mongoose.models.User;
var _ = require('lodash');

module.exports = function(app) {
	var route = {};
	var vidIndex = 0;
	var publicVidPath = 'public/video/';
	var vidList = [];

	try {
		var vidFiles = fs.readdirSync(publicVidPath);
	}
	catch(err) {
		console.log('Error reading video directory');
		console.dir(err);
		if (err.code === 'ENOENT'){
			console.log('Video path missing, attempting to create');
			fs.mkdirSync(publicVidPath);
			vidFiles = [];
		}
	}
	var filesSorted = vidFiles.sort();
	var lastFile = filesSorted[filesSorted.length - 1];


	//Build vid list
	if (vidFiles.length === 0){
		//just start play loop if no videos yet
		console.log('No videos to play');
		playFunc();
		fileBroadcast();
	}
	else {
		for (var i = 0; i < vidFiles.length; i++){
			var vid = vidFiles[i];
			ffmpeg(publicVidPath + vid).ffprobe(function(vid, i, err, data){
				if (i == vidFiles.length - 1){
					//If we're at the last file, start the play loop
					//may not be completely in order but should be close enough
					//since video playback will take time anyways
					playFunc();
					fileBroadcast();
				}

				addVidToList(vid, err, data);
			}.bind(null, vid, i));
		}
	}

	passport.serializeUser(function(user, done) {
	  done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
	  User.findById(id, function (err, user) {
	    done(err, user);
	  });
	});

	passport.use(new LocalStrategy(
	  function(username, password, done) {
	    User.findOne({ email: username }, 'email password displayName uploads metrics', function (err, user) {
	      if (err) { return done(err); }
	      if (!user) {
	        return done(null, false, { message: 'Incorrect username.' });
	      }
	      if (!user.validPassword(password)) {
	        return done(null, false, { message: 'Incorrect password.' });
	      }
	      return done(null, user);
	    });
	  }
	));

	route.main = function(req, res){
		if (app.get('env') == 'development'){
			//vidList[vidIndex].file
			res.render('main', require('../config/assets.js'));
		}
		else{
			res.render('main');
		}
	};

	route.login = function(req, res, next){
		passport.authenticate('local', function(err, user, info) {
	    if (err) { return next(err); }
	    if (!user) {
	      return res.json({errMsg:info.message});
	    }

			req.login(user, function(err) {
				if (err) { return next(err); }
				//I prefer to explicitly build the field list being sent to the client
				//so that no critical fields get sent by mistake. For example, the
				//password field is in `user` because we needed to have it to verify login.
				return res.json({user:{
					email:  		 user.email,
					displayName: user.displayName,
					uploads:  	 user.uploads,
					metrics: 		 user.metrics
				}});
			});
	  })(req, res, next);
	};

	route.profile = function(req, res){
		if (app.get('env') == 'development'){
			res.render('profile', require('../config/assets.js'));
		}
		else{
			res.render('profile');
		}
	};

	route.upload = function(req, res){
		var newVideo = req.files.videos;
		console.log('Upload made, file: ' + (newVideo && newVideo.name));
		if (newVideo){
			//Regex to remove uploaded file extension
			var newFileBase = newVideo.name.replace(/\.[^/.]+$/, "");
			var newFileName = newFileBase + '.mp4';
			var vid = ffmpeg(newVideo.path)
				.videoCodec('libx264')
				.videoBitrate('819k')
				.audioCodec('aac')
				.duration(10)
				.format('mp4')
				.outputOptions('-pix_fmt yuv420p')
				.screenshots({
					timestamps: [1],
					filename: newFileBase + '.png',
					folder: publicVidPath,
					size: '320x240'
				})
				.output(publicVidPath + newFileName)
				.on('start', function(commandLine) {
    			console.log('Spawned Ffmpeg with command: ' + commandLine);
  			})
				.on('error', function(newFileName, err1, err2, err3) {
					console.log(err1);
					fs.unlink(publicVidPath + newFileName);
			  }.bind(null, newFileName))
			  .on('end', function(newFileName) {
			    console.log('Processing finished for ' + newFileName);

					fs.unlink(newVideo.path); //Delete original upload
					ffmpeg(publicVidPath + newFileName).ffprobe(addVidToList.bind(null, newFileName));

					/*//check passport for user
					if (true || req.user){
						User.findById('54924652e87629782709307d', function(err, user){
							console.dir(user);
							user.displayName = 'moopop';
							console.log('save new displayName');
							user.save(function(err){console.log('saved it: ' + err);});
						});
						//req.user.addVid(newFileBase);
						//req.user.uploads.videos.addToSet(newFileBase);
						//req.user.displayName = 'moomoo';
						//console.log(typeof req.user.save);
					}*/
					if (req.user) {
						req.user.addVid(newFileBase);
					}
			  }.bind(null, newFileName));
		}

		res.status(200).end();
	};

	route.users = function(req, res){
		if (app.get('env') == 'development'){
			res.render('users', require('../config/assets.js'));
		}
		else{
			res.render('users');
		}
	};

	var io = app.io;
	io.on('connection', function (socket) {
	  console.log('socket connected');
	});

	app.post('/login', route.login);
	app.post('/upload', route.upload);
	app.get('/', route.main);
	app.get('/users', route.users);
	app.get('/profile', route.profile);

	app.get('/video/*', function(req,res,next){
		//Use this to check and see if a video is missing

		//We only get here if express.static couldn't find it
		//if (req.path.match(/^\/video\//)){
		var missingVid = req.path.substr(req.path.lastIndexOf('/') + 1);
		if (missingVid){ //sanity check
			removeVidFromList(missingVid);
		}

		next();
	});

	function addVidToList(vid, err, data) {
		if (err){
			console.log('FFPROBE error: ' + vid);
		}
		else {
			var duration = data.format.duration;
			vidList.push({
				file: vid,
				duration: duration
			});
			console.log('Logging video ' + vid + ' with length ' + duration);
		}
	}

	function removeVidFromList(vid){
		var removed = _.remove(
			vidList,
			function(obj){if (obj.file === vid) return true;}
		);

		if (removed.length > 0){
			console.log('Removed from list: ' + vid);
		}
	}

	//Start looping through the videos on the server using vid length
	function playFunc(){
		if (vidList.length === 0){
			setTimeout(playFunc, 2000);
			return;
		}

		var vid = vidList[vidIndex++];

		if (!vid){
			vidIndex = 0;
			vid = vidList[vidIndex++];
		}

		console.log(((new Date()).getTime() / 1000) + ' Playing vid ' + vid.file + ' @ ' + vid.duration);
		setTimeout(playFunc, vid.duration * 1000);
	};

	//Send the playing and next video name every second
	function fileBroadcast(){
		setInterval(function(){
			if (vidList.length === 0){
				return;
			}

			//It's possible that vidIndex is 1 beyond the actual vidList length before
			//playFunc runs again to reset it
			//Let's try to keep things simple and not modify vidIndex outside of playFunc

			var playingVid = vidList[vidIndex] || vidList[0];
			if (!vidList[vidIndex]){
				var nextVid = vidList[1] || vidList[0];
			}
			else {
				nextVid = vidList[vidIndex + 1] || vidList[0];
			}

			io.emit('nextVid', [playingVid.file, nextVid.file]);
		}, 1000);
	}
};
