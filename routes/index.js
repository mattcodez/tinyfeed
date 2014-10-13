var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

module.exports = function(app) {
	var route = {};
	var filecount = 0;
	var vidIndex = filecount;

	setInterval(function(){
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
			var vid = ffmpeg(file.path)
				.videoCodec('libx264')
				.audioCodec('aac')
				.duration(10)
				.format('mp4')
				.on('start', function(commandLine) {
    			console.log('Spawned Ffmpeg with command: ' + commandLine);
  			})
				.on('error', function(err) {
					console.log(arguments);
			  })
			  .on('end', function() {
			    console.log('Processing finished !');
					fs.unlink(file.path);
			  })
				.save('public/video/' + (filecount++) + '.mp4');
		}

		res.status(200).end();
	};

	app.post('/upload', route.upload);
	app.get('/routemap', route.index);
	app.get('/', route.main);
};
