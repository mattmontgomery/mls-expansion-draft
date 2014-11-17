module.exports = function() {
    var hogan = require('hogan.js');
    var tpl = "Hello {{world}}";
    var _ = require('lodash');
    var template = hogan.compile(tpl);
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    var Cookies = require("cookies");
    var Promise = require("bluebird");

    if(rtg.auth) {
        redis.auth(rtg.auth.split(":")[1]);
    }

    var List = function(){};
    List.prototype.getPlayers = function (data) {
        var players = [];
        if(!_.isObject(data) || !_.isArray(data.list)) {
            return false;
        }
        _.each(data.list,function(val){
            players[val.toLowerCase()] = 1;
        });
        return players;
    };
    List.prototype.updatePlayers = function(team, players, extPlayers) {
        extPlayers = (_.isArray(extPlayers) ? extPlayers : []);
        players = _.difference(players, extPlayers);
        _.each(players, function(player) {
            redis.hincrby('protected:' + team,player,1);
        });
    };
    List.prototype.fetchPlayers = function(team) {
        return new Promise(function(resolve, reject){
            if(!redis.HGETALL('protected:' + team, function(err,obj){
                if(obj) {
                    resolve(obj);
                } else {
                    reject();
                }
            })) {
                reject();
            }
        });
    };

    return function(req, response, match){
        var list = new List(),
            cookies = new Cookies(req, response),
            self = this;
        this.respObj = {};
        this.send = function() {
            response.setHeader("Content-Type", "application/json");
            response.write(JSON.stringify(this.respObj));
            response.end();
        };
        this.getPlayersFromCookie = function() {
            var playersCookie;
            try {
                playersCookie = JSON.parse(cookies.get('players'));
                if(!_.isArray(playersCookie)) {
                    throw 'Players not an array';
                }
            } catch (e) {
                playersCookie = [];
            }
            return playersCookie;
        };
        this.respond_post = function(data) {
            var playersCookie = [],
                team = 'rsl';
            var players = _.keys(list.getPlayers(data));
            this.respObj = { status: "failure" };
            if(!data) {
                response.statusCode = 400;
                this.respObj.message = "Could not read data";
            }
            if(players && data) {
                var failed = false;
                var reset = data._reset !== undefined ? data._reset : false,
                    team = (_.isString(data.team) ? data.team : 'RSL').toLowerCase();
                if(players.length > 11) {
                    players = false;
                    list.fetchPlayers(team).done(function(allPlayers) {
                        response.statusCode = 400;
                        self.respObj = {
                            "status": "failure",
                            "message": "Too many players submitted",
                            "players": allPlayers
                        };
                        self.send();
                    });
                } else if(cookies.get('completed') == 'true' && !reset) {
                    list.fetchPlayers(team).done(function(allPlayers) {
                        response.statusCode = 400;
                        self.respObj = {
                            "status": "failure",
                            "message": "Already submitted",
                            "players": allPlayers
                        };
                        self.send();
                    });
                } else {
                    cookies.set('players', JSON.stringify(players))
                        .set('submitted', true)
                        .set('completed', (players.length === 11));
                    list.updatePlayers(team, players, this.getPlayersFromCookie());
                    list.fetchPlayers(team).done(function(allPlayers) {
                        response.statusCode = 200;
                        self.respObj = {
                            "completed": (players.length === 11),
                            "status": "success",
                            "player_count": players.length,
                            "players": allPlayers
                        };
                        self.send();
                    });
                }
            } else {
                response.statusCode = 400;
                this.send();
            }
        };
        this.respond_get = function() {
            var team = match.params.team;
            list.fetchPlayers(team).catch(function(err) {
                self.respObj = {
                    "message": "No players found"
                };
            }).done(function(players) {
                players = (_.isObject(players) ? players : {});
                self.respObj = {
                    "players": players
                };
                self.send();
            });

        };
        this.initialize = function(req, response, match) {

            var self = this;

            var data;

            var playersCookie = [];


            req.on('data', function(chunk) {
                try {
                    data = JSON.parse(chunk.toString());
                } catch(e) {
                    data = null;
                }
            });

            req.on('end', function() {
                console.log(req.method);
                if(req.method === 'POST' || req.method === 'PUT') {
                    self.respond_post(data);
                } else {
                    self.respond_get(data);
                }
            });
        };
        this.initialize(req, response);

    };
};