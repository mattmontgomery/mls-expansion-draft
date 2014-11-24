module.exports = function() {
    var hogan = require('hogan.js');
    var tpl = "Hello {{world}}";
    var _ = require('lodash');
    var template = hogan.compile(tpl);
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    var Cookies = require("cookies");
    var Promise = require("bluebird"),
        join = Promise.join;

    if(rtg.auth) {
        redis.auth(rtg.auth.split(":")[1]);
    }

    var List = function(){};
    List.prototype.canUpdate = function(ip, team) {
        return new Promise(function(resolve, reject) {
            redis.sismember('ips:' + team, ip, function(err, obj) {
                if(err) {
                    reject(err);
                }
                resolve(obj);
            });
        });
    };
    List.prototype.getPlayers = function (data) {
        var players = [];
        if(!_.isObject(data) || !_.isArray(data.list)) {
            return false;
        }
        _.each(data.list,function(val){
            if(val) {
                players[val.toLowerCase()] = 1;
            }
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
    List.prototype.updateTeam = function(team) {
        redis.hincrby('protected', team, 1);
    };
    List.prototype.updateUser = function(ip, team) {
        redis.sadd('ips:' + team, ip);
    };
    List.prototype.fetchPlayers = function(team) {
        return new Promise(function(resolve, reject){
            if(!redis.HGETALL('protected:' + team, function(err,obj){
                if(obj) {
                    resolve(obj);
                } else {
                    reject(err);
                }
            })) {
                reject();
            }
        });
    };
    List.prototype.fetchTeam = function(team) {
        return new Promise(function(resolve, reject) {
            if(!redis.HGET('protected', team, function(err, obj) {
                if(obj) {
                    resolve(obj);
                } else {
                    reject(err);
                }
            })) {
                reject();
            }
        });
    };
    List.prototype.fetchData = function(team) {
        var self = this;
        return new Promise(function(resolve, reject) {
            Promise.all([self.fetchTeam(team), self.fetchPlayers(team)]).done(function(resp){
                var data = {
                    votes: resp[0],
                    players: resp[1]
                }
                resolve(data);
            });
        });
    };

    return function(req, response, match){
        var list = new List(),
            cookies = new Cookies(req, response),
            self = this;
        this.respObj = {};
        this.send = function() {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
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
            var ip = req.connection.remoteAddress;
            var players = _.keys(list.getPlayers(data));
            this.respObj = { status: "failure" };
            if(!data) {
                response.statusCode = 400;
                this.respObj.message = "Could not read data";
            }
            list.canUpdate(ip, team).done(function(hasVoted) {
                if(players && data && !hasVoted) {
                    var team = (_.isString(data.team) ? data.team : 'RSL').toLowerCase();
                    if(players.length > 11) {
                        players = false;
                        self.respObj = {
                            "status": "failure",
                            "message": "Too many players submitted",
                        };
                        self.send();
                    } else if(cookies.get('completed') == 'true') {
                        list.fetchData(team).done(function(allPlayers) {
                            response.statusCode = 400;
                            self.respObj = {
                                "status": "failure",
                                "message": "Already submitted",
                                "players": data.players,
                                "votes": data.votes
                            };
                            self.send();
                        });
                    } else if(players.length === 11) {
                        cookies.set('players', JSON.stringify(players))
                            .set('submitted', true )
                            .set('completed', true );
                        list.updatePlayers(team, players, self.getPlayersFromCookie());
                        list.updateTeam(team);
                        list.updateUser(ip,team);
                        list.fetchData(team).done(function(data) {
                            response.statusCode = 200;
                            self.respObj = {
                                "completed": (players.length === 11),
                                "status": "success",
                                "players": data.players,
                                "votes": data.votes
                            };
//                        req.session.completed = true;
//                        req.session.save();
                            self.send();
                        });
                    } else {
                        list.fetchData(team).done(function(allPlayers) {
                            response.statusCode = 400;
                            self.respObj = {
                                "status": "incomplete",
                                "message": "You must protect 11 players",
                                "players": data.players,
                                "votes": data.votes
                            };
                            self.send();
                        });
                    }
                } else if(hasVoted) {
                    response.statusCode = 400;
                    self.respObj.message = 'You can only vote once. Sorry.';
                    self.respObj.players = data.players;
                    self.respObj.votes = data.votes;
                    self.send();

                } else {
                    response.statusCode = 400;
                    self.send();
                }
            });
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
