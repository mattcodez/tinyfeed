module.exports = function(app) {
  // Module dependencies.
  var mongoose = require('mongoose'),
      User = mongoose.models.User;

  // GET
  app.get('/api/user/:id', function (req, res) {
    Post.findById(
      req.params.id,
      'email displayName created',
      function(err, user) {
        if (err) {
          res.json(404, err);
        } else {
          res.json(200, {user:user});
        }
      }
    );
  });

  // POST
  app.post('/api/user', function (req, res) {

    var user;

    if(typeof req.body.user == 'undefined'){
      return res.status(500).json({errMsg: 'user is undefined'});
    }

    user = new User(req.body.user);

    user.save(function (err) {
      if (!err) {
        console.log("created User");
        return res.status(201).json(user.toObject());
      } else {
        console.log(err);
        return res.status(500).json({errMsg:'There was an error creating your account'});
      }
    });

  });

  // PUT
  app.put('/api/user/:id', function (req, res) {
    var id = req.params.id;

    User.findById(id, function (err, post) {

      if(typeof req.body.post["title"] != 'undefined'){
        post["title"] = req.body.post["title"];
      }

      if(typeof req.body.post["excerpt"] != 'undefined'){
        post["excerpt"] = req.body.post["excerpt"];
      }

      if(typeof req.body.post["content"] != 'undefined'){
        post["content"] = req.body.post["content"];
      }

      if(typeof req.body.post["active"] != 'undefined'){
        post["active"] = req.body.post["active"];
      }

      if(typeof req.body.post["created"] != 'undefined'){
        post["created"] = req.body.post["created"];
      }


      return post.save(function (err) {
        if (!err) {
          console.log("updated post");
          return res.json(200, post.toObject());
        } else {
         return res.json(500, err);
        }
        return res.json(post);
      });
    });

  });
};
