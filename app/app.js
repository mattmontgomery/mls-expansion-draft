var dotenv = require('dotenv');
dotenv.load();

var Router = require('routes'),
    router = Router();

var list = require('./list.js');
router.addRoute('/list', new list());
router.addRoute('/list/:team', new list());

var http = require('http');
http.createServer(function (req, res) {
//    var path = url.parse(req.url).pathname;
    var match = router.match(req.url);
    if(match) {
        match.fn(req, res, match);
    } else {
        res.statusCode = 404;
        res.end();
    }
}).listen(1337);

