var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

module.exports = function(app) {
	var route = {};
	var filecount = 0;
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

	//Find out where we left off on the file count
	if (lastFile){
		filecount = ~~(lastFile.substring(0, lastFile.indexOf('.'))) + 1;
		//vidIndex = filecount;
	}
	console.log('fileCount started at ' + filecount);

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		//res.render('main', {vidIndex:vidIndex});
		res.render('main');
	};

	route.upload = function(req, res){
		var file = req.files.videos;
		if (file){
			var newFileName = (filecount++) + '.mp4';
			var vid = ffmpeg(file.path)
				.videoCodec('libx264')
				.audioCodec('aac')
				.duration(10)
				.format('mp4')
				.on('start', function(commandLine) {
    			console.log('Spawned Ffmpeg with command: ' + commandLine);
  			})
				.on('error', function(vid, err1, err2, err3) {
					console.log(err1);
					fs.unlink(publicVidPath + vid);
			  }.bind(null, newFileName))
			  .on('end', function(vid) {
			    console.log('Processing finished !');
					fs.unlink(file.path);
					ffmpeg(publicVidPath + vid).ffprobe(addVidToList.bind(null, vid));
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
