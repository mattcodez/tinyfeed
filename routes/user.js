module.exports = function(app) {
  // Module dependencies.
  var mongoose = require('mongoose'),
      User = mongoose.models.User;

  // GET
  app.get('/api/user/:id', function (req, res) {
    User.findById(
      req.params.id,
      'email displayName active created uploads metrics',
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
    console.log(user);

    user.save(function (err) {
      if (!err) {
        console.log("created User");
        delete user.password;

        return res.status(201).json({user:user});
      } else {
        console.log(err);
        if (err.code == 11000){
          var errMsg = 'That e-mail is already in use';
        }
        else {
          errMsg = 'There was an error creating your account';
        }
        return res.status(500).json({errMsg:errMsg});
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
