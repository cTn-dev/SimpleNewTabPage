var appGrid = new function () {
    var self = this;
    this.grid = [];

    this.addApp = function (data) {
        // create element
        var app =
            $('<div id="' + data.id + '" class="app ' + this.helpers.isAppEnabled(data.enabled) + '" title="' + data.name + '" draggable="true"> \
                <div class="wrapper">\
                    <img src="' + this.helpers.getIcon(data.icons) + '" />\
                    <span>' + this.helpers.shortenName(data) + '</span>\
                </div>\
            </div>');

        // bind draggable events
        this.bindDraggable(app);

        // save reference in grid array
        this.grid.push({
            'data':     data,
            'element':  app
        });

        // push to DOM
        $('div#apps .apps-wrapper .clear-both').before(app);
    };

    this.bindDraggable = function (app) {
        app.bind('dragstart', function(ev) {
            ev.dataTransfer.effectAllowed = 'move';
            ev.dataTransfer.setData('id', ev.currentTarget.id);
        });

        app.bind('dragend', function(ev) {
        });

        app.bind('dragover', function(ev) {
            ev.preventDefault(); // Necessary. Allows us to drop.
            return false;
        });

        app.bind('drop', function(ev) {
            ev.stopPropagation();

            var landing_on = $(ev.currentTarget);
            var content = $('#' + ev.dataTransfer.getData('id'));

            // could use a little fix for dropping on a different line
            // we might be able to use .position or .offset here, to determinate the line
            if (content.next()[0] != landing_on[0] && landing_on.position().top <= content.position().top) {
                content.insertBefore(landing_on);
            } else {
                content.insertAfter(landing_on);
            }

            self.saveGrid();

            return false;
        });
    };

    this.saveGrid = function () {
        var arr = [];
        $('div#apps .apps-wrapper .app').each(function() {
            arr.push($(this).attr('id'));
        });

        chrome.storage.sync.set({'gridOrder': arr});
    };

    this.getGridReference = function (id) {
        for (var i = 0; i < this.grid.length; i++) {
            if (this.grid[i].data.id == id) {
                return this.grid[i];
            }
        }

        return false;
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