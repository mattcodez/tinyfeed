var ffmpeg = require('fluent-ffmpeg');

module.exports = function(app) {
	var route = {};

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		res.render('main');
	};

	var filecount = 0;
	route.upload = function(req, res){
		var file = req.files.videos;
		if (file){
			var vid = ffmpeg(file.path)
				.videoCodec('libx264')
				.duration(10)
				.format('mp4')
				.on('error', function(err) {
			    console.log('An error occurred: ' + err.message);
			  })
			  .on('end', function() {
			    console.log('Processing finished !');
			  })
				.save('uploads/' + (filecount++) + '.mp4');
		}

		res.send(200);
	};

	app.post('/upload', route.upload);
	app.get('/routemap', route.index);
	app.get('/', route.main);
};
