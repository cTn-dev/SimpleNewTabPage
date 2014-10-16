var ContextMenu = function (ev, items, clientHandler) {
    var self = this;

    // stop default event from firing
    ev.stopImmediatePropagation();
    ev.preventDefault();

    // if another context menu already exists, remove it (we might wanna check for memory leaks in the future)
    var target = $('ul.contextMenu');

    if (target.length) {
        target.remove();
    }

    // set pixel offset to move contextMenu from initial event creation
    this.pixelOffset = 2;

    // create contextMenu element and apply position from event
    this.menu = $('<ul class="contextMenu">').css({'top': ev.pageY + this.pixelOffset, 'left': ev.pageX + this.pixelOffset});

    // add items
    for (var i = 0; i < items.length; i++) {
        this.menu.append('<li>' + items[i] + '</li>');
    }

    // attach element to the body (context menu is visible at this stage)
    $('body').append(this.menu);

    // setup and bind interaction handlers
    function eventHandler(ev) {
        if (ev.type != 'keydown') { // handle mouse related events
            if ($.contains(self.menu[0], ev.target)) {
                switch (ev.type) {
                    case 'click':
                        clientHandler($(ev.target).index());
                        self.detachAndCleanup();
                        break;
                    case 'contextmenu':
                        ev.preventDefault();
                        break;

                    default:
                        self.detachAndCleanup();
                }
            } else {
                self.detachAndCleanup();
            }
        } else { // handle keyboard related events
            // TODO implement this
            switch (ev.keyCode) {
                case 13: // enter
                    // trigger selected option or ignore what happened when nothing is selected
                    break;
                case 38: // up arrow
                    break;
                case 40: // down arrow
                    break;

                default:
                    ev.preventDefault();
            }
        }
    }

    $(document).bind('click contextmenu keydown', eventHandler);

    this.detachAndCleanup = function () {
        $(document).unbind('click contextmenu keydown', eventHandler);
        self.menu.remove();
    };
};