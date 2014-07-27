var CONFIGURATION = {
    'data': {
        'options':          null,
        'topSites':         null,
        'appsExtensions':   null,
        'appsOrder':        null,
        'sessions':         null
    },
    'status': {
        'optionsChanged': false
    }
};

$(document).ready(function() {
    // add the dataTransfer property for use with the native `drop` event
    // to capture information about files dropped into the browser window
    jQuery.event.props.push("dataTransfer");

    var top_pages_c = $('div#top-pages');
    var top_pages_e = $('div#top-pages .top-pages-wrapper');
    var apps_c = $('div#apps');
    var apps_e = $('div#apps .apps-wrapper');
    var recently_closed_c = $('div#recently-closed-pages');
    var recently_closed_e = $('div#recently-closed-pages .recently-closed-pages-wrapper');

    // bind live events
    $(window).resize(function() {
        center_top_pages();
        center_apps();
        center_recently_closed();
    });

    apps_e.on('click', 'div.app', function() {
        chrome.management.launchApp($(this).attr('id'));

        chrome.tabs.getCurrent(function(tab) {
            chrome.tabs.remove(tab.id);
        });

        return false;
    });

    // get settings
    var options_ready = [];
    chrome.storage.sync.get('options', function(data) {
        if (data.options) {
            CONFIGURATION.data.options = data.options;
        } else {
            // not saved yet, apply defaults
            CONFIGURATION.data.options = {
                'version':                  1,
                'topSitesVisible':          true,
                'topSitesItemsMax':         15,
                'appsExtensionsVisible':    true,
                'sessionsVisible':          true,
                'sessionsItemsMax':         5
            };
        }

        // callbacks
        for (var i = 0; i < options_ready.length; i++) {
            options_ready[i]();
        }
        options_ready = [];
    });

    // fetch most used sites
    chrome.topSites.get(function(result) {
        CONFIGURATION.data.topSites = result;

        if (CONFIGURATION.data.options) {
            process_topSites(result);
        } else {
            options_ready.push(function() {
                process_topSites(result);
            });
        }
    });

    // fetch apps and extensions
    chrome.management.getAll(function(result) {
        CONFIGURATION.data.appsExtensions = result;

        if (CONFIGURATION.data.options) {
            if (CONFIGURATION.data.appsOrder) {
                process_appsExtensions(result);
            } else {
                appsOrder_ready.push(function() {
                    process_appsExtensions(result);
                });
            }
        } else {
            options_ready.push(function() {
                process_appsExtensions(result);
            });
        }
    });

    var appsOrder_ready = [];
    chrome.storage.sync.get('appsOrder', function (data) {
        if (data.appsOrder) {
            CONFIGURATION.data.appsOrder = data.appsOrder;
        } else {
            CONFIGURATION.data.appsOrder = false;
        }

        // callbacks
        for (var i = 0; i < appsOrder_ready.length; i++) {
            appsOrder_ready[i]();
        }
        appsOrder_ready = [];
    });

    // fetch recently closed tabs
    if (window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1").split('.')[0] > 36) { // sessions api is active only from 37+
        chrome.sessions.getRecentlyClosed(function(result) {
            CONFIGURATION.data.sessions = result;

            if (CONFIGURATION.data.options) {
                process_sessions(result);
            } else {
                options_ready.push(function() {
                    process_sessions(result);
                });
            }
        });
    }

    function process_topSites(result) {
        if (CONFIGURATION.data.options.topSitesVisible) {
            var display_n = result.length;

            if (display_n > CONFIGURATION.data.options.topSitesItemsMax) {
                display_n = CONFIGURATION.data.options.topSitesItemsMax;
            }

            for (var i = 0; i < display_n; i++) {
                var short_name = result[i].title;
                if (result[i].title.length > 20) {
                    short_name = result[i].title.slice(0, 20);
                    short_name += '...';
                }

                var site =
                    $('<div class="site">\
                        <img src="chrome://favicon/' + result[i].url + '" alt=""/><a href="' + result[i].url + '" title="' + result[i].title + '">' + short_name + '</a>\
                    </div>');

                $('.clear-both', top_pages_e).before(site);
            }

            center_top_pages();
            top_pages_c.fadeIn(100);
        }
    };

    function process_appsExtensions(result) {
        if (CONFIGURATION.data.options.appsExtensionsVisible) {
            // filter out extensions
            for (var i = result.length - 1; i >= 0; i--) {
                if (result[i].isApp == false) {
                    result.splice(i, 1);
                }
            }

            if (CONFIGURATION.data.appsOrder) {
                for (var i = 0; i < CONFIGURATION.data.appsOrder.length; i++) {
                    for (var j = 0; j < result.length; j++) {
                        if (result[j].id == CONFIGURATION.data.appsOrder[i]) {
                            appGrid.addApp(result[j]);
                            result.splice(j, 1);
                            break;
                        }
                    }
                }

                // handle any outstanding shortcuts (if there are any)
                for (var i = 0; i < result.length; i++) {
                    appGrid.addApp(result[i]);
                }
            } else {
                // sort alphabetically, since user didn't save a custom grid
                result.sort(function (a, b) {
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                });

                // generate app shortcuts
                for (var i = 0; i < result.length; i++) {
                    appGrid.addApp(result[i]);
                }
            }

            center_apps();
            apps_c.fadeIn(100);
        }
    };

    function process_sessions(result) {
        if (CONFIGURATION.data.options.sessionsVisible) {
            // dump previous elements
            recently_closed_e.empty();
            recently_closed_e.append('<div class="clear-both"></div>');

            var display_n = result.length;
            var current_time = new Date().getTime();
            var time_limit = (current_time - (10 * 60000)) / 1000; // - 10 minutes in milliseconds
            var sites_displayed = 0;

            if (display_n > CONFIGURATION.data.options.sessionsItemsMax) {
                display_n = CONFIGURATION.data.options.sessionsItemsMax;
            }

            for (var i = 0; i < display_n; i++) {
                if (result[i].tab) {
                    var short_name = result[i].tab.title;
                    if (result[i].tab.title.length > 20) {
                        short_name = result[i].tab.title.slice(0, 20);
                        short_name += '...';
                    }

                    // result[i].lastModified cannot be used because the returned value is wrong (investigate?)
                    // it seems that the returned value is in seconds, not milliseconds
                    if (result[i].lastModified > time_limit && result[i].tab.url.indexOf('http://') > -1) { // ignore chrome:// pages
                        var closed_site =
                            $('<div class="closed-site">\
                                <img src="chrome://favicon/' + result[i].tab.url + '" alt="" /><a href="' + result[i].tab.url + '" title="' + result[i].tab.title + '">' + short_name + '</a>\
                            </div>');

                        $('.clear-both', recently_closed_e).before(closed_site);
                        sites_displayed++;
                    }
                } else if (result[i].window) {
                    console.log('Missing window property implementation !!!');
                }
            }

            if (sites_displayed) {
                center_recently_closed();
                recently_closed_c.fadeIn(100);
            }
        }
    };

    // take care of events
    chrome.management.onInstalled.addListener(function(info) {
        if (info.isApp) {
            // check if app was really installed and we are not just receiving restart event
            for (var i = 0; i < appGrid.grid.length; i++) {
                if (appGrid.grid[i].data.id == info.id) return;
            }

            appGrid.addApp(info);
        }
    });

    chrome.management.onUninstalled.addListener(function(id) {
        for (var i = 0; i < appGrid.grid.length; i++) {
            if (appGrid.grid[i].data.id == id) {
                appGrid.grid[i].element.remove();
                appGrid.grid.splice(i, 1);
                break;
            }
        }
    });

    chrome.management.onEnabled.addListener(function(info) {
        for (var i = 0; i < appGrid.grid.length; i++) {
            if (appGrid.grid[i].data.id == info.id) {
                appGrid.grid[i].element.removeClass('disabled');
                appGrid.grid[i].data = info;
                break;
            }
        }
    });

    chrome.management.onDisabled.addListener(function(info) {
        for (var i = 0; i < appGrid.grid.length; i++) {
            if (appGrid.grid[i].data.id == info.id) {
                appGrid.grid[i].element.addClass('disabled');
                appGrid.grid[i].data = info;
                break;
            }
        }
    });

    if (window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1").split('.')[0] > 36) {
        chrome.sessions.onChanged.addListener(function() {
            // this listener doesn't provide any data which is stupid but it indicates that
            // the recently closed UI/array needs to be updated/repopulated
            chrome.sessions.getRecentlyClosed(function(result) {
                CONFIGURATION.data.sessions = result;

                process_sessions(result);
            });

        });
    }


    function center_top_pages() {
        var container_w = top_pages_c.width();
        var site_w = $('div.site', top_pages_c).outerWidth();
        var row_elements_n = Math.floor(container_w / site_w);
        var blank_space = container_w - (site_w * row_elements_n);

        top_pages_e.css({'margin-left': (blank_space / 2)});
    }

    function center_apps() {
        var container_w = apps_c.width();
        var app_w = $('div.app', apps_c).outerWidth();
        var row_elements_n = Math.floor(container_w / app_w);
        var blank_space = container_w - (app_w * row_elements_n);

        apps_e.css({'margin-left': (blank_space / 2)});
    }

    function center_recently_closed() {
        var container_w = recently_closed_c.width();
        var site_w = $('div.closed-site', recently_closed_c).outerWidth();
        var row_elements_n = Math.floor(container_w / site_w);
        var blank_space = container_w - (site_w * row_elements_n);

        recently_closed_e.css({'margin-left': (blank_space / 2)});
    }

    $('a#options').click(function() {
        var el = $(this);

        if (!el.hasClass('active')) {
            el.addClass('active');
            el.after('<div id="options-window"></div>');

            $('div#options-window').load('./options.html', function() {
                // fill in data
                $('input.topSitesVisible').prop('checked', CONFIGURATION.data.options.topSitesVisible);
                $('input.appsExtensionsVisible').prop('checked', CONFIGURATION.data.options.appsExtensionsVisible);
                $('input.sessionsVisible').prop('checked', CONFIGURATION.data.options.sessionsVisible);

                // bind events
                $('div#options-window input').change(function() {
                    CONFIGURATION.status.optionsChanged = true;

                    var property = $(this).attr('class');
                    var val = $(this).is(':checked');

                    CONFIGURATION.data.options[property] = val;
                });

                $(this).slideDown();

                function close_and_cleanup(ev) {
                    if (ev.type == 'click' && !$.contains($('div#options-window')[0], ev.target) && !$(ev.target).is('div#options-window') || ev.type == 'keyup' && ev.keyCode == 27) {
                        $(document).unbind('click keyup', close_and_cleanup);

                        $('div#options-window').slideUp(function() {
                            el.removeClass('active');
                            $(this).empty().remove();

                            if (CONFIGURATION.status.optionsChanged) {
                                chrome.storage.sync.set({'options': CONFIGURATION.data.options}, function() {
                                    chrome.tabs.getCurrent(function(tab) {
                                        chrome.tabs.reload(tab.id);
                                    });
                                });
                            }
                        });
                    }
                }

                $(document).bind('click keyup', close_and_cleanup);
            });
        }
    });
});