var dotenv = require('dotenv');
dotenv.load();

var Router = require('routes'),
    router = Router();

var static = require('node-static');

var file = new static.Server('./public', { cache: 3600 });

var list = require('./list.js');
router.addRoute('/list', new list());
router.addRoute('/list/:team', new list());

var http = require('http');
var port = (process.env.PORT || 80),
    portStatic = (process.env.PORT_STATIC || 8080);

http.createServer(function (req, res) {
    var match = router.match(req.url);
    if(match) {
        match.fn(req, res, match);
    } else {
        res.statusCode = 404;
        res.end();
    }
}).listen(port);

http.createServer(function (req, res) {
    req.addListener('end', function () {
        file.serve(req, res);
    }).resume();
}).listen(portStatic);

console.log('HTTP server listening on port: ' + port );
console.log('Static HTTP server listening on port: ' + portStatic );