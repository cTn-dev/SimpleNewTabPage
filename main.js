'use strict';

var CONFIGURATION = {
    'data': {
        'options':          null,
        'topSites':         null,
        'hiddenTopSites':   null,
        'appsExtensions':   null,
        'appsOrder':        null,
        'appsHidden':       null,
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

    // bind live events
    $(window).resize(function() {
        center_top_pages();
        center_apps();
        center_recently_closed();
    });

    $('div#top-pages .top-pages-wrapper').on('contextmenu', 'div.site a', function (ev) {
        var element = $(this).parent(),
            url = $(this).attr('href'),
            hostname = get_hostname(url);

        var items = [
            'Open link in new tab',
            'Open link in new window',
            'Open link in incognito window',
            'Hide address from the list'
        ];

        var menu = new ContextMenu(ev, items, function (item) {
            switch (item) {
                case 0:
                    chrome.tabs.create({'url': url});
                    break;
                case 1:
                    chrome.windows.getCurrent(function (properties) {
                        if (properties.state == 'maximized') {
                            chrome.windows.create({
                                'url':          url,
                                'focused':      true
                            }, function (newWindow) {
                                chrome.windows.update(newWindow.id, {'state': 'maximized'});
                            });
                        } else {
                            chrome.windows.create({
                                'url':          url,
                                'focused':      true,
                                'width':        properties.width,
                                'height':       properties.height,
                                'left':         properties.left,
                                'top':          properties.top
                            });
                        }
                    });
                    break;
                case 2:
                    // copy properties and position from current window
                    chrome.windows.getCurrent(function (properties) {
                        if (properties.state == 'maximized') {
                            chrome.windows.create({
                                'url':          url,
                                'incognito':    true,
                                'focused':      true
                            }, function (newWindow) {
                                // there is no way of maximizing the incognito window via current windows api implementation
                                // sniff :'(
                            });
                        } else {
                            chrome.windows.create({
                                'url':          url,
                                'incognito':    true,
                                'focused':      true,
                                'width':        properties.width,
                                'height':       properties.height,
                                'left':         properties.left,
                                'top':          properties.top
                            });
                        }
                    });
                    break;
                case 3:
                    if (CONFIGURATION.data.hiddenTopSites) {
                        CONFIGURATION.data.hiddenTopSites.push(hostname);
                    } else {
                        CONFIGURATION.data.hiddenTopSites = [hostname];
                    }

                    // save changes
                    STORAGE.set({'hiddenTopSites': CONFIGURATION.data.hiddenTopSites});

                    // remove element from UI
                    element.remove();
                    break;

                default:
                    console.log('Unknown contextmenu position selected');
            }
        });
    });

    $('div#apps .apps-wrapper').on('click', 'div.app', function() {
        chrome.management.launchApp($(this).attr('id'));

        if (!$(this).hasClass('disabled')) {
            if (CONFIGURATION.data.options.closeTabOnAppClick) {
                chrome.tabs.query({}, function(result) {
                    // only auto-close when there is more then 1 tab in the browser window
                    if (result.length > 1) {
                        chrome.tabs.getCurrent(function(tab) {
                            chrome.tabs.remove(tab.id);
                        });
                    }
                });
            }
        } else {
            chrome.tabs.update({'url': 'chrome://extensions/'});
        }

        return false;
    });

    $('div#apps .apps-wrapper').on('contextmenu', 'div.app', function (ev) {
        var id = $(this).attr('id');
        var items = [
            'Hide',
            $(this).hasClass('disabled') ? 'Enable' : 'Disable',
            'Uninstall'
        ];

        var menu = new ContextMenu(ev, items, function (item) {
            switch (item) {
                case 0:
                    if (CONFIGURATION.data.appsHidden) {
                        CONFIGURATION.data.appsHidden.push(id);

                    } else {
                        CONFIGURATION.data.appsHidden = [id];
                    }

                    // remove element from UI
                    $('#' + id).remove();

                    // save changes
                    STORAGE.set({'appsHidden': CONFIGURATION.data.appsHidden});
                    break;
                case 1:
                    if (!$('#' + id).hasClass('disabled')) {
                        chrome.management.setEnabled(id, false, null);
                    } else {
                        chrome.management.setEnabled(id, true, null);
                    }
                    break;
                case 2:
                    chrome.management.uninstall(id, {'showConfirmDialog': true}, null);
                    break;

                default:
                    console.log('Unknown contextmenu position selected');
            }
        });
    });

    // get settings
    STORAGE.get('options', function(data) {
        if (data.options) {
            CONFIGURATION.data.options = data.options;
        } else {
            // not saved yet, apply defaults
            CONFIGURATION.data.options = {
                'topSitesVisible':          true,
                'topSitesItemsMax':         15,
                'appsExtensionsVisible':    true,
                'sessionsVisible':          true,
                'sessionsItemsMax':         5,
                'closeTabOnAppClick':       true
            };
        }

        if (CONFIGURATION.data.options.topSitesVisible) {
            retrieve_topSites();
        }

        if (CONFIGURATION.data.options.appsExtensionsVisible) {
            retrieve_apps();
            bind_apps_events();
        }

        if (CONFIGURATION.data.options.sessionsVisible) {
            retrieve_recentlyClosed();
            bind_sessions_events();
        }
    });

    function retrieve_topSites(callback) {
        // fetch filter
        STORAGE.get('hiddenTopSites', function(data) {
            if (data.hiddenTopSites) {
                CONFIGURATION.data.hiddenTopSites = data.hiddenTopSites;
            } else {
                CONFIGURATION.data.hiddenTopSites = false;
            }

            chrome.topSites.get(function(result) {
                CONFIGURATION.data.topSites = result;

                if (callback) callback(result);
                process_topSites(result);
            });
        });
    }

    function retrieve_apps(callback) {
        function order() {
            STORAGE.get('appsOrder', function(data) {
                if (data.appsOrder) {
                    CONFIGURATION.data.appsOrder = data.appsOrder;
                } else {
                    CONFIGURATION.data.appsOrder = false;
                }

                visibility();
            });
        };

        function visibility() {
            STORAGE.get('appsHidden', function(data) {
                if (data.appsHidden) {
                    CONFIGURATION.data.appsHidden = data.appsHidden;
                } else {
                    CONFIGURATION.data.appsHidden = false;
                }

                apps();
            });
        };

        function apps() {
            chrome.management.getAll(function(result) {
                CONFIGURATION.data.appsExtensions = result;

                // create chrome store shortcut manually
                CONFIGURATION.data.appsExtensions.push({
                    'isApp': true,
                    'enabled': true,
                    'mayDisable': false,
                    'id': 'ahfgeienlihckogmohjhadlkjgocpleb',
                    'name': 'Store',
                    'icons': [{'size': 128, 'url': './images/icon_store.png'}]
                });

                if (callback) callback();
                process_appsExtensions(result);
            });
        };

        order();
    }

    function retrieve_recentlyClosed(callback) {
        chrome.sessions.getRecentlyClosed(function(result) {
            CONFIGURATION.data.sessions = result;

            if (callback) callback();

            process_sessions(result);
        });
    }

    function process_topSites(result) {
        if (CONFIGURATION.data.options.topSitesVisible) {
            var display_n = result.length,
                container = $('div#top-pages .top-pages-wrapper');

            if (display_n > CONFIGURATION.data.options.topSitesItemsMax) {
                display_n = CONFIGURATION.data.options.topSitesItemsMax;
            }

            for (var i = 0; i < display_n; i++) {
                var display = true;
                if (CONFIGURATION.data.hiddenTopSites) {
                    if (CONFIGURATION.data.hiddenTopSites.indexOf(get_hostname(result[i].url)) != -1) {
                        display = false;

                        if (display_n < 20) display_n++;
                    }
                }

                if (display) {
                    var short_name = result[i].title;
                    if (result[i].title.length > 20) {
                        short_name = result[i].title.slice(0, 19);
                        short_name += '...';
                    }

                    var site =
                        $('<div class="site">\
                            <img src="chrome://favicon/' + result[i].url + '" />\
                            <a href="' + result[i].url + '" title="' + result[i].title + '">' + short_name + '</a>\
                        </div>');

                    container.append(site);
                }
            }

            center_top_pages();
            $('div#top-pages').fadeIn(100);
        }
    }

    function process_appsExtensions(result) {
        if (CONFIGURATION.data.options.appsExtensionsVisible) {
            // filter out extensions
            for (var i = result.length - 1; i >= 0; i--) {
                if (result[i].isApp == false) {
                    result.splice(i, 1);
                }
            }

            // filter out hidden apps
            if (CONFIGURATION.data.appsHidden) {
                for (var i = result.length - 1; i >= 0; i--) {
                    if (CONFIGURATION.data.appsHidden.indexOf(result[i].id) > -1) {
                        result.splice(i, 1);
                    }
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
            $('div#apps').fadeIn(100);
        }
    }

    function process_sessions(result) {
        function process_data(data, lastModified) {
            if (lastModified > time_limit && data.url.indexOf('chrome://') == -1) { // ignore chrome:// pages
                if (!CONFIGURATION.data.hiddenTopSites || CONFIGURATION.data.hiddenTopSites.indexOf(get_hostname(data.url)) == -1) {
                    var short_name = data.title;

                    if (data.title.length > 18) {
                        short_name = data.title.slice(0, 17);
                        short_name += '...';
                    }

                    var closed_site =
                        $('<div class="closed-site">\
                            <img src="chrome://favicon/' + data.url + '" alt="" /><a href="' + data.url + '" title="' + data.title + '">' + short_name + '</a>\
                        </div>');

                    $('div#recently-closed-pages .recently-closed-pages-wrapper').append(closed_site);
                    sites_displayed++;
                }
            }
        }

        if (CONFIGURATION.data.options.sessionsVisible) {
            // dump previous elements
            recently_closed_e.empty();

            var display_n = result.length,
                current_time = new Date().getTime(),
                time_limit = (current_time - (10 * 60000)) / 1000, // - 10 minutes in milliseconds
                sites_displayed = 0;

            if (display_n > CONFIGURATION.data.options.sessionsItemsMax) {
                display_n = CONFIGURATION.data.options.sessionsItemsMax;
            }

            for (var i = 0; i < display_n; i++) {
                if (sites_displayed < display_n) {
                    if (result[i].tab) {
                        process_data(result[i].tab, result[i].lastModified);
                    } else if (result[i].window) {
                        for (var j = 0; j < result[i].window.tabs.length; j++) {
                            if (sites_displayed < display_n) {
                                process_data(result[i].window.tabs[j], result[i].lastModified);
                            } else {
                                break;
                            }
                        }
                    }
                } else {
                    break;
                }
            }

            if (sites_displayed) {
                center_recently_closed();
                $('div#recently-closed-pages').fadeIn(100);
            }
        }
    }

    function bind_apps_events() {
        chrome.management.onInstalled.addListener(function(info) {
            if (info.isApp) {
                var apps = $('div#apps .apps-wrapper .app');

                for (var i = 0; i < apps.length; i++) {
                    if ($(apps[i]).attr('id') == info.id) return;
                }

                appGrid.addApp(info);
            }
        });

        chrome.management.onUninstalled.addListener(function(id) {
            var apps = $('div#apps .apps-wrapper .app');

            for (var i = 0; i < apps.length; i++) {
                if ($(apps[i]).attr('id') == id) {
                    $(apps[i]).remove();
                    break;
                }
            }

            // remove app from the appsHidden array so strings doesn't build up here
            if (CONFIGURATION.data.appsHidden) {
                if (CONFIGURATION.data.appsHidden.indexOf(id)) {
                    CONFIGURATION.data.appsHidden.splice(CONFIGURATION.data.appsHidden.indexOf(id), 1);
                }
            }
        });

        chrome.management.onEnabled.addListener(function(info) {
            var apps = $('div#apps .apps-wrapper .app');

            for (var i = 0; i < apps.length; i++) {
                if ($(apps[i]).attr('id') == info.id) {
                    $(apps[i]).removeClass('disabled');
                    break;
                }
            }
        });

        chrome.management.onDisabled.addListener(function(info) {
            var apps = $('div#apps .apps-wrapper .app');

            for (var i = 0; i < apps.length; i++) {
                if ($(apps[i]).attr('id') == info.id) {
                    $(apps[i]).addClass('disabled');
                    break;
                }
            }
        });
    }

    function bind_sessions_events() {
        chrome.sessions.onChanged.addListener(function() {
            // this listener doesn't provide any data which is stupid but it indicates that
            // the recently closed UI/array needs to be updated/repopulated
            chrome.sessions.getRecentlyClosed(function(result) {
                CONFIGURATION.data.sessions = result;

                process_sessions(result);
            });

        });
    }

    function get_hostname(url) {
        var m = url.match(/^http(s?):\/\/[^/]+/);
        return m ? m[0] : null;
    }


    var top_pages_c = $('div#top-pages'),
        top_pages_e = $('div#top-pages .top-pages-wrapper');

    function center_top_pages() {
        var container_w = top_pages_c.width(),
            site_w = $('div.site', top_pages_c).outerWidth(),
            row_elements_n = Math.floor(container_w / site_w),
            blank_space = container_w - (site_w * row_elements_n);

        top_pages_e.css({'margin-left': (blank_space / 2)});
    }

    var apps_c = $('div#apps'),
        apps_e = $('div#apps .apps-wrapper');

    function center_apps() {
        var container_w = apps_c.width(),
            app_w = $('div.app', apps_c).outerWidth(),
            row_elements_n = Math.floor(container_w / app_w),
            blank_space = container_w - (app_w * row_elements_n);

        apps_e.css({'margin-left': (blank_space / 2)});
    }

    var recently_closed_c = $('div#recently-closed-pages'),
        recently_closed_e = $('div#recently-closed-pages .recently-closed-pages-wrapper');

    function center_recently_closed() {
        var container_w = recently_closed_c.width(),
            site_w = $('div.closed-site', recently_closed_c).outerWidth(),
            row_elements_n = Math.floor(container_w / site_w),
            blank_space = container_w - (site_w * row_elements_n);

        recently_closed_e.css({'margin-left': (blank_space / 2)});
    }
});