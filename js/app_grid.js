var appGrid = new function () {
    var self = this;
    this.grid = [];
    this.slot = {'width': 155, 'height': 155};

    this.addApp = function (data) {
        // create element
        var app =
            $('<div id="' + data.id + '" class="app" title="' + data.name + '"> \
                <div class="wrapper">\
                    <img class="' + this.helpers.isAppEnabled(data.enabled) + '" src="' + this.helpers.getIcon(data.icons) + '" />\
                    <span>' + this.helpers.shortenName(data) + '</span>\
                </div>\
            </div>');

        // calculate grid position
        var position = this.calculateInitialPosition(app);

        // bind draggable events
        this.bindDraggable(app);

        // save reference in grid array
        this.grid.push({
            'initial_position': position,
            'live_position': JSON.parse(JSON.stringify(position)),
            'data':     data,
            'element':  app
        });

        // push to DOM
        $('div#apps .apps-wrapper').append(app);
    };

    this.calculateInitialPosition = function (app) {
        var container_width = $('div#apps').width();
        var occupied_slots = this.grid.length;
        var slots_per_line = Math.floor(container_width / this.slot.width);

        var position = {
            'left': this.slot.width * (occupied_slots % slots_per_line),
            'top': this.slot.height * Math.floor(occupied_slots / slots_per_line),
            'x': occupied_slots % slots_per_line,
            'y': Math.floor(occupied_slots / slots_per_line)
        };

        app.css({'margin-left': position.left, 'margin-top': position.top});

        return position;
    };

    this.bindDraggable = function (app) {
        app.mousedown(function (e) {
            var window_element = $(window);
            var mouse_initial_position = {'left': e.pageX, 'top': e.pageY};
            var grid_element;
            for (var i = 0; i < self.grid.length; i++) {
                if (self.grid[i].element == app) {
                    grid_element = self.grid[i];
                    break;
                }
            }

            /*
            var grid_pos = element.data('grid-position');
            var element_init_pos = {'left': grid_pos.left, 'top': grid_pos.top};
            var element_offset = element.offset();

            var moved = 0;
            */

            window_element.mousemove(function(e) {
                e.preventDefault();
                app.addClass('dragging noclick');

                var left = grid_element.initial_position.left - mouse_initial_position.left + e.pageX;
                var top = grid_element.initial_position.top - mouse_initial_position.top + e.pageY;
                var drag_size = {'left': mouse_initial_position.left - e.pageX, 'top': mouse_initial_position.top - e.pageY};

                app.css({'margin-left': left, 'margin-top': top});

                self.processLivePosition(grid_element, drag_size, left, top);

                /*
                var left = element_init_pos.left + e.pageX - mouse_init_pos.left;
                var top = element_init_pos.top + e.pageY - mouse_init_pos.top;
                var mouse_traveled = mouse_init_pos.left - e.pageX;
                element.css({'margin-left': left, 'margin-top': top});

                // tells how many rows to dodge
                if (mouse_traveled > (self.slot.width / 2)) {
                    var move_n = Math.floor(mouse_traveled / self.slot.width);

                    if (move_n > moved) {
                        for (var i = 0; i < self.grid.length; i++) {
                            var checking = self.grid[i].data('grid-position');
                            if (checking.row <= (grid_pos.row - move_n) && checking.row >= (grid_pos.row - move_n) && checking.col == grid_pos.col) {
                                self.grid[i].addClass('dodging');
                                self.grid[i].css({'margin-left': checking.left + self.slot.width});
                                moved++;
                            }
                        }
                    }

                    if (moved > move_n) {
                        for (var i = 0; i < self.grid.length; i++) {
                            var checking = self.grid[i].data('grid-position');
                            if (self.grid[i].hasClass('dodging') && checking.row < (grid_pos.row - move_n)) {
                                self.grid[i].css({'margin-left': checking.left});
                                self.grid[i].removeClass('dodging');
                                moved--;
                            }
                        }
                    }
                } else if (mouse_traveled < (self.slot.width / 2)) {
                    var move_n = Math.floor(mouse_traveled / self.slot.width) * - 1;

                    if (move_n > moved) {
                        for (var i = 0; i < self.grid.length; i++) {
                            var checking = self.grid[i].data('grid-position');
                            if (checking.row >= (grid_pos.row + move_n) && checking.row <= (grid_pos.row + move_n) && checking.col == grid_pos.col) {
                                self.grid[i].addClass('dodging');
                                self.grid[i].css({'margin-left': checking.left - self.slot.width});
                                moved++;
                            }
                        }
                    }

                    if (moved > move_n) {
                        for (var i = 0; i < self.grid.length; i++) {
                            var checking = self.grid[i].data('grid-position');
                            if (self.grid[i].hasClass('dodging') && checking.row > (grid_pos.row + move_n)) {
                                self.grid[i].css({'margin-left': checking.left});
                                self.grid[i].removeClass('dodging');
                                moved--;
                            }
                        }
                    }
                } else {
                    // restore dodged elements to normal
                    for (var i = 0; i < self.grid.length; i++) {
                        if (self.grid[i].hasClass('dodging')) {
                            self.grid[i].css({'margin-left': self.grid[i].data('grid-position').left, 'margin-top': self.grid[i].data('grid-position').top});
                            self.grid[i].removeClass('dodging');
                            moved--;
                        }
                    }
                }
                */
            });

            window_element.mouseup(function(e) {
                window_element.unbind('mousemove mouseup');
                app.removeClass('dragging');

                // element moved, calculate grid position and snap in
                var number_of_rows = Math.floor($('div#apps').width() / self.slot.width);
                var number_of_lines = Math.floor(self.grid.length / number_of_rows);

                if (grid_element.live_position.y < 0) grid_element.live_position.y = 0;
                else if (grid_element.live_position.y > number_of_lines) grid_element.live_position.y = number_of_lines;

                if (grid_element.live_position.x < 0) grid_element.live_position.x = 0;
                else if (grid_element.live_position.x > number_of_rows) grid_element.live_position.x = number_of_rows - 1;
                else if (grid_element.live_position.x > (self.grid.length % number_of_rows) - 1 && grid_element.live_position.y == number_of_lines) {
                    grid_element.live_position.x = (self.grid.length % number_of_rows) - 1;
                }

                var left = grid_element.live_position.x * self.slot.width;
                var top = grid_element.live_position.y * self.slot.height;

                app.css({'margin-left': left, 'margin-top': top});

                grid_element.initial_position.left = left;
                grid_element.initial_position.top = top;
                grid_element.initial_position.x = grid_element.live_position.x;
                grid_element.initial_position.y = grid_element.live_position.y;

                setTimeout(function() {
                    app.removeClass('noclick');
                }, 10);

                /*
                if (!moved) {
                    // return element to its default position
                    for (var i = 0; i < self.grid.length; i++) {
                        if (self.grid[i].hasClass('dragging')) {
                            self.grid[i].css({'margin-left': self.grid[i].data('grid-position').left, 'margin-top': self.grid[i].data('grid-position').top});

                            setTimeout(function() {
                                element.removeClass('dragging');
                            }, 10);

                            break;
                        }
                    }
                } else {
                    // save new position
                    for (var i = 0; i < self.grid.length; i++) {
                        if (self.grid[i].hasClass('dragging')) {
                            var data = self.grid[i].data('grid-position');
                            var mouse_traveled = mouse_init_pos.left - e.pageX;
                            var move_n = Math.floor(mouse_traveled / self.slot.width) * -1;

                            data.row = data.row + move_n;
                            data.left = data.row * self.slot.width;

                            self.grid[i].data('grid-position', data);

                            self.grid[i].css({'margin-left': self.grid[i].data('grid-position').left, 'margin-top': self.grid[i].data('grid-position').top});

                            moved = 0;
                            break;
                        }
                    }

                    // re-calculate rows and cols according to index
                    self.grid = [];
                    var row = 0;
                    var col = 0;
                    $('div#apps .apps-wrapper .app').each(function() {
                        var container_width = $('div#apps').width();
                        var slots_per_line = Math.floor(container_width / self.slot.width);
                        var element = $(this);
                        var index = element.index();
                        var data = element.data('grid-position');

                        data.row = row++;
                        data.col = col;
                        data.left = data.row * self.slot.width;

                        element.data('grid-position', data);

                        if (row > slots_per_line - 1) {
                            row = 0;
                            col++;
                        }

                        self.grid.push(element);
                    });
                }
                */
            });
        });
    };

    this.processLivePosition = function (grid_element, drag_size, left, top) {
        grid_element.live_position.left = left;
        grid_element.live_position.top = top;

        if (drag_size.left > (self.slot.width / 2) || drag_size.left < (-self.slot.width / 2)) {
            var slots_moved = Math.round(drag_size.left / (self.slot.width));
            grid_element.live_position.x = grid_element.initial_position.x - slots_moved;
        } else {
            grid_element.live_position.x = grid_element.initial_position.x;
        }

        if (drag_size.top > (self.slot.height / 2) || drag_size.top < (-self.slot.height / 2)) {
            var vertical_slots_moved = Math.round(drag_size.top / (self.slot.height));
            grid_element.live_position.y = grid_element.initial_position.y - vertical_slots_moved;
        } else {
            grid_element.live_position.y = grid_element.initial_position.y;
        }
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