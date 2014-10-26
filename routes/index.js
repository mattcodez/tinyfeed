var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

module.exports = function(app) {
	var route = {};
	var filecount = 0;
	var vidIndex = filecount;
	var publicVidPath = 'public/video/';
	var vidList = [];

	var vidFiles = fs.readdirSync(publicVidPath);
	var filesSorted = vidFiles.sort();
	var lastFile = filesSorted[filesSorted.length - 1];


	//Build vid list
	for (var i = 0; i < vidFiles.length; i++){
		var vid = vidFiles[i];
		ffmpeg(publicVidPath + vid).ffprobe(addVidToList.bind(null, vid));
	}

	//Find out where we left off on the file count
	if (lastFile){
		filecount = ~~(lastFile.substring(0, lastFile.indexOf('.'))) + 1;
		vidIndex = filecount;
	}
	console.log('fileCount started at ' + filecount);

	setInterval(function(){
		/*vidIndex is sent to the client to state where we're currently playing
		we increment in intervals with the idea that the filecount will one
		day be far ahead.*/

		//Increment vidIndex every 10 seconds
		//Don't let it exceed the current filecount though
		if (vidIndex < filecount){
			vidIndex++;
		}
	}, 10 * 1000);

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		res.render('main', {vidIndex:vidIndex});
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
};
