var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

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

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		//res.render('main', {vidIndex:vidIndex});
		res.render('main');
	};

	route.upload = function(req, res){
		var newVideo = req.files.videos;
		if (newVideo){
			var newFileName = newVideo.name.replace(/\.[^/.]+$/, "") + '.mp4';
			var vid = ffmpeg(newVideo.path)
				.videoCodec('libx264')
				.audioCodec('aac')
				.duration(10)
				.format('mp4')
				.on('start', function(commandLine) {
    			console.log('Spawned Ffmpeg with command: ' + commandLine);
  			})
				.on('error', function(newFileName, err1, err2, err3) {
					console.log(err1);
					fs.unlink(publicVidPath + newFileName);
			  }.bind(null, newFileName))
			  .on('end', function(newFileName) {
			    console.log('Processing finished !');
					fs.unlink(newVideo.path);
					ffmpeg(publicVidPath + newFileName).ffprobe(addVidToList.bind(null, vid));
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

		console.log('Playing vid ' + vid.file + ' @ ' + vid.duration);
		setTimeout(function(){
			playFunc();
		}, vid.duration * 1000)
	};

	//Send the next video name every second
	function fileBroadcast(){
		setInterval(function(){
			var nextVid = vidList[vidIndex + 1];
			if (!nextVid) nextVid = vidList[0];
			io.emit('nextVid', nextVid.file);
		}, 1000);
	}
};
