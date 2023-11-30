var express = require('express');
var router = express.Router();

module.exports = function (db) {
  router.get('/', function(req, res, next) {
    res.send('respond with a resource');
  });

  return router
}

