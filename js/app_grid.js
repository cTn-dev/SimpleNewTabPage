var appGrid = new function () {
    var self = this;
    this.grid = [];

    this.addApp = function (data) {
        // create element
        var app =
            $('<div class="app" title="' + data.name + '"> \
                <div class="wrapper">\
                    <img class="' + this.helpers.isAppEnabled(data.enabled) + '" src="' + this.helpers.getIcon(data.icons) + '" />\
                    <span>' + this.helpers.shortenName(data) + '</span>\
                </div>\
            </div>');

        // bind in data
        app.data('properties', data);

        // calculate grid position
        this.calculateInitialPosition(app);

        // bind draggable events
        this.bindDraggable(app);

        // save reference in grid array
        this.grid.push(app);

        // push to DOM
        $('div#apps .apps-wrapper').append(app);
    };

    this.calculateInitialPosition = function (app) {
        var container_width = $('div#apps').width();
        var occupied_slots = this.grid.length;
        var slot = {'width': 155, 'height': 155};
        var slots_per_line = Math.floor(container_width / slot.width);

        var position = {'vertical': slot.height * Math.floor(occupied_slots / slots_per_line), 'horizontal': slot.width * (occupied_slots % slots_per_line)};

        app.css({'margin-top': position.vertical, 'margin-left': position.horizontal});
    };

    this.bindDraggable = function (app) {
        // TODO
    };

    this.helpers = new function () {
        this.getIcon = function (iconArr) {
            var len = iconArr.length;

            if (len > 1) {
                var best_size = 0;
                var best_size_index = 0;

                for (var i = 0; i < len; i++) {
                    if (iconArr[i].size > best_size) {
                        best_size = iconArr[i].size;
                        best_size_index = i;
                    }
                }

                return iconArr[best_size_index].url;
            } else {
                return iconArr[0].url;
            }
        };

        this.shortenName = function (data) {
            function do_the_math(name) {
                if (name.length < 19) {
                    return name;
                } else {
                    var short_name = name.slice(0, 19);
                    return short_name + '...';
                }
            }

            if (data.shortName) {
                return do_the_math(data.shortName);
            } else {
                return do_the_math(data.name);
            }
        };

        this.isAppEnabled = function (data) {
            if (!data) {
                return 'disabled';
            } else {
                return '';
            }
        };
    };
};