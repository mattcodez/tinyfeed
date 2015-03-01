var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
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

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		if (app.get('env') == 'development'){
			//vidList[vidIndex].file
			res.render('main', require('../config/assets.js'));
		}
		else{
			res.render('main');
		}
	};

	route.upload = function(req, res){
		var newVideo = req.files.videos;
		console.log('Upload made, file: ' + (newVideo && newVideo.path));
		//FIXME: remove later
		console.dir(fs.readdirSync('uploads'));
		if (newVideo){
			//Regex to remove uploaded file extension
			var newFileName = newVideo.name.replace(/\.[^/.]+$/, "") + '.mp4';
			var vid = ffmpeg(newVideo.path)
				.videoCodec('libx264')
				.videoBitrate('819k')
				.audioCodec('aac')
				.duration(10)
				.format('mp4')
				.outputOptions('-pix_fmt yuv420p')
				.on('start', function(commandLine) {
    			console.log('Spawned Ffmpeg with command: ' + commandLine);
  			})
				.on('error', function(newFileName, err1, err2, err3) {
					console.log(arguments);
					fs.unlink(newVideo.path);
			  }.bind(null, newFileName))
			  .on('end', function(newFileName) {
			    console.log('Processing finished !');
					fs.unlink(newVideo.path);
					ffmpeg(publicVidPath + newFileName).ffprobe(addVidToList.bind(null, newFileName));
			  }.bind(null, newFileName))
				.save(publicVidPath + newFileName);
		}

		res.status(200).end();
	};

	var io = app.io;
	io.on('connection', function (socket) {
	  console.log('socket connected');
	});

	app.post('/upload', route.upload);
	app.get('/routemap', route.index);
	app.get('/', route.main);

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
