module.exports = function(app) {
	var route = {};

	// index.html
	route.index = function (req, res) {
	  res.render('index', {locals: { routes: app._router.stack }});
	};

	route.main = function(req, res){
		res.render('main');
	}

	app.get('/routemap', route.index);
	app.get('/', route.main)
};
