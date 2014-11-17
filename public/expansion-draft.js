var Draft = function(selector, team){
    this.$el = null;
    this.team = team;
    this.initialize = function(selector) {
        var $el = $(selector);
        if(!$el.length) { return false; }

        this.$el = $el;
        this.buildHtml();
        this.buildEvents();
    };
    this.buildHtml = function() {
        this.$el.find('.form').html('');
        var $inputs = [];
        for(var i = 0; i < 11; i++) {
            var $el = $('<div />').addClass('line-item').append($('<input />').attr('type', 'text').attr('name', 'players[]').addClass('player-item'));
            $inputs.push($el);
        }
        this.$el.find('.form').append($inputs);
    };
    this.buildEvents = function() {
        var self = this;
        this.$el.on('submit', function(ev) {
            ev.preventDefault();
            self.submit();
        });
    };
    this.buildResults = function(data) {
        $.each(data.players, function() {

        });
    };
    this.submit = function() {
        var self = this;
        // compile data
        var data = {
            team: this.team,
            list: []
        };
        this.$el.find('.player-item').each(function(idx,item) {
            data.list.push($(item).val());
        });
        if(data.list.filter(function(item) { return (item ? true : false); }).length) {
            $.when(this.sendData(data)).done(function(resp){
                self.alert('Expansion draft list successfully sent', 'success');
                self.buildResults(data);
            }).fail(function(resp) {
                self.alert(resp.message, 'error');
            });
        } else {
            this.alert('You must protect 11 players', 'error');
        }
    };
    this.alert = function(msg, type) {
        type = (type ? type : 'error');
        this.$el.find('.message').html(msg).removeClass().addClass('message ' + type);
    };
    this.sendData = function(data) {
        var dfd = $.Deferred();
        $.ajax({
            type: 'POST',
            url: 'http://localhost:1337/list',
            data: JSON.stringify(data),
            withCredentials: true,
            success: function(resp) {
                dfd.resolve(resp);
            }
        }).fail(function(resp) {
                dfd.reject(resp.responseJSON);
            });
        return dfd;
    };
    this.initialize(selector);
};