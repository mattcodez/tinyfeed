var ffmpeg = require('fluent-ffmpeg'),
		fs = require('fs'),
		passport = require('passport'),
		LocalStrategy = require('passport-local').Strategy,
		mongoose = require('mongoose'),
		User = mongoose.models.User;

module.exports = function(app) {
	var route = {};
	var vidIndex = 0;
	var publicVidPath = 'public/video/';
	var vidList = [];

	var vidFiles = fs.readdirSync(publicVidPath);
	var filesSorted = vidFiles.sort();
	var lastFile = filesSorted[filesSorted.length - 1];


	//Build vid list
	for (var i = 0; i < vidFiles.length; i++){
		var vid = vidFiles[i];

		//Don't log thumbnails
		if ((publicVidPath + vid).match(/.png$/i)) continue;

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
			res.render('main', {locals: require('../config/assets.js')});
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

	route.upload = function(req, res){
		var newVideo = req.files.videos;
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

					//check passport for user
					if (req.user){
						req.user.addVid(newFileBase);
					}
			  }.bind(null, newFileName));
		}

		res.status(200).end();
	};

	var io = app.io;
	io.on('connection', function (socket) {
	  console.log('socket connected');
	});

	app.post('/login', route.login);
	app.post('/upload', route.upload);
	app.get('/', route.main);

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

	//Start looping through the videos on the server using vid length
	function playFunc(){
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
			//It's possible that vidIndex is 1 beyond the actual vidList length before
			//playFunc runs again to reset it
			//Let's try to keep things simple and not modify vidIndex outside of playFunc

			var playingVid = vidList[vidIndex] || vidList[0];
			if (!vidList[vidIndex]){
				var nextVid = vidList[1];
			}
			else {
				nextVid = vidList[vidIndex + 1] || vidList[0];
			}

			io.emit('nextVid', [playingVid.file, nextVid.file]);
		}, 1000);
	}
};
