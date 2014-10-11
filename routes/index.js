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
				.duration(10)
				.format('mp4')
				.on('error', function(err) {
			    console.log('An error occurred: ' + err.message);
			  })
			  .on('end', function() {
			    console.log('Processing finished !');
					fs.unlink(file.path);
			  })
				.save('public/video/' + (filecount++) + '.mp4');
		}

		res.send(200);
	};

	app.post('/upload', route.upload);
	app.get('/routemap', route.index);
	app.get('/', route.main);
};
