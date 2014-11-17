var dotenv = require('dotenv');
dotenv.load();

var Router = require('routes'),
    router = Router();

var list = require('./list.js');
router.addRoute('/list', new list());
router.addRoute('/list/:team', new list());

var http = require('http');
var port = (process.env.PORT || 80);
http.createServer(function (req, res) {
    var match = router.match(req.url);
    if(match) {
        match.fn(req, res, match);
    } else {
        res.statusCode = 404;
        res.end();
    }
}).listen(port);

console.log('HTTP server listening on port: ' + port );