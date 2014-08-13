'use strict';

var CONFIGURATION = {
    'data': {
        'options':          null,
        'topSites':         null,
        'hiddenTopSites':   null,
        'appsExtensions':   null,
        'appsOrder':        null,
        'appsHidden':       null,
        'sessions':         null,
        'bookmarks':        null,
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

    $('div#apps .apps-wrapper').on('click', 'div.app', function() {
        chrome.management.launchApp($(this).attr('id'));

        if (!$(this).hasClass('disabled')) {
            chrome.tabs.query({}, function(result) {
                // only auto-close when there is more then 1 tab in the browser window
                if (result.length > 1) {
                    chrome.tabs.getCurrent(function(tab) {
                        chrome.tabs.remove(tab.id);
                    });
                }
            });
        } else {
            chrome.tabs.update({'url': 'chrome://extensions/'});
        }

        return false;
    });

    $('div#apps .apps-wrapper').on('contextmenu', 'div.app', function(ev) {
        // if one context menu already exists, remove it
        if ($('div#contextMenu').length) {
            $('div#contextMenu').remove();
        }

        var disable = $(this).hasClass('disabled') ? 'Enable' : 'Disable';

        var contextMenu = $('\
            <div id="contextMenu">\
                <ul>\
                    <li class="hide">Hide</li>\
                    <li class="disable">' + disable + '</li>\
                    <li class="uninstall">Uninstall</li>\
                </ul>\
            </div>\
        ').css({'top': ev.clientY + 2, 'left': ev.clientX + 2}).data('id', $(this).attr('id'));

        $('body').append(contextMenu);

        function clickHandler(ev) {
            if ($.contains($('div#contextMenu')[0], ev.target)) {
                var action = $(ev.target).attr('class'),
                    id = $('div#contextMenu').data('id');

                switch (action) {
                    case 'hide':
                        if (CONFIGURATION.data.appsHidden) {
                            CONFIGURATION.data.appsHidden.push(id);

                        } else {
                            CONFIGURATION.data.appsHidden = [id];
                        }

                        // remove element from UI
                        $('#' + id).remove();

                        // save changes
                        chrome.storage.sync.set({'appsHidden': CONFIGURATION.data.appsHidden});
                        break;
                    case 'disable':
                        if (!$('#' + id).hasClass('disabled')) {
                            chrome.management.setEnabled(id, false, null);
                        } else {
                            chrome.management.setEnabled(id, true, null);
                        }
                        break;
                    case 'uninstall':
                        chrome.management.uninstall(id, {'showConfirmDialog': true}, null);
                        break;

                    default:
                        console.log('Unknown contextmenu function selected');
                }

                $('div#contextMenu').remove();
                $('body').unbind('click mousewheel', clickHandler);
                return false;
            } else if (!$(ev.target).is('div#contextMenu')) {
                $('div#contextMenu').remove();
                $('body').unbind('click mousewheel', clickHandler);
                return false;
            }
        };

        $('body').bind('click mousewheel', clickHandler);
        return false;
    });

    $('div#top-pages .top-pages-wrapper').on('mouseenter', 'div.site a:not(.disable)', function() {
        var element = $(this).parent();
        element.addClass('hovering');

        setTimeout(function() {
            if (element.hasClass('hovering')) {
                element.addClass('editing');
            }
        }, 1500);
    });

    $('div#top-pages .top-pages-wrapper').on('mouseleave', 'div.site', function() {
        var element = $(this);
        element.removeClass('hovering editing')
    });

    $('div#top-pages .top-pages-wrapper').on('click', 'div.site a.disable', function() {
        var element = $(this).parent();
        var url = element.find('a:first').attr('href');

        if (CONFIGURATION.data.hiddenTopSites) {
            CONFIGURATION.data.hiddenTopSites.push(url);
        } else {
            CONFIGURATION.data.hiddenTopSites = [url];
        }

        // remove element from UI
        element.remove();

        // save changes
        chrome.storage.sync.set({'hiddenTopSites': CONFIGURATION.data.hiddenTopSites});
    });

    // get settings
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
                'sessionsItemsMax':         5,
                'bookmarksVisible':         true,
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
            if (window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1").split('.')[0] > 36) { // sessions api is active only from 37+
                retrieve_recentlyClosed();
                bind_sessions_events();
            }
        }

        if (CONFIGURATION.data.options.bookmarksVisible) {
            retrieve_bookmarks();
            bind_bookmarks_events();
        }
    });

    function retrieve_topSites(callback) {
        // fetch filter
        chrome.storage.sync.get('hiddenTopSites', function(data) {
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
    };

    function retrieve_apps(callback) {
        function order() {
            chrome.storage.sync.get('appsOrder', function(data) {
                if (data.appsOrder) {
                    CONFIGURATION.data.appsOrder = data.appsOrder;
                } else {
                    CONFIGURATION.data.appsOrder = false;
                }

                visibility();
            });
        };

        function visibility() {
            chrome.storage.sync.get('appsHidden', function(data) {
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
    };

    function retrieve_recentlyClosed(callback) {
        chrome.sessions.getRecentlyClosed(function(result) {
            CONFIGURATION.data.sessions = result;

            if (callback) callback();

            process_sessions(result);
        });
    };

    function retrieve_bookmarks(callback) {
        chrome.bookmarks.getTree(function(result) {
            CONFIGURATION.data.bookmarks = result;

            if (callback) callback();
            process_bookmarks(result);
        });
    };


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
                    if (CONFIGURATION.data.hiddenTopSites.indexOf(result[i].url) != -1) {
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
                            <a href="#" class="disable" title="Hide from the list"></a>\
                        </div>');

                    container.append(site);
                }
            }

            center_top_pages();
            $('div#top-pages').fadeIn(100);
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
    };

    function process_sessions(result) {
        function process_data(data, lastModified) {
            var short_name = data.title;
            if (data.title.length > 20) {
                short_name = data.title.slice(0, 19);
                short_name += '...';
            }

            // result[i].lastModified cannot be used because the returned value is wrong (investigate?)
            // it seems that the returned value is in seconds, not milliseconds
            if (lastModified > time_limit && data.url.indexOf('http://') > -1) { // ignore chrome:// pages
                var closed_site =
                    $('<div class="closed-site">\
                        <img src="chrome://favicon/' + data.url + '" alt="" /><a href="' + data.url + '" title="' + data.title + '">' + short_name + '</a>\
                    </div>');

                $('div#recently-closed-pages .recently-closed-pages-wrapper').append(closed_site);
                sites_displayed++;
            }
        }

        if (CONFIGURATION.data.options.sessionsVisible) {
            // dump previous elements
            recently_closed_e.empty();

            var display_n = result.length;
            var current_time = new Date().getTime();
            var time_limit = (current_time - (10 * 60000)) / 1000; // - 10 minutes in milliseconds
            var sites_displayed = 0;

            if (display_n > CONFIGURATION.data.options.sessionsItemsMax) {
                display_n = CONFIGURATION.data.options.sessionsItemsMax;
            }

            for (var i = 0; i < display_n; i++) {
                if (result[i].tab) {
                    process_data(result[i].tab, result[i].lastModified);
                } else if (result[i].window) {
                    for (var j = 0; j < result[i].window.tabs.length; j++) {
                        process_data(result[i].window.tabs[j], result[i].lastModified);
                    }
                }
            }

            if (sites_displayed) {
                center_recently_closed();
                $('div#recently-closed-pages').fadeIn(100);
            }
        }
    };

    function process_bookmarks(data) {
        //console.log(data);
    };

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
    };

    function bind_sessions_events() {
        chrome.sessions.onChanged.addListener(function() {
            // this listener doesn't provide any data which is stupid but it indicates that
            // the recently closed UI/array needs to be updated/repopulated
            chrome.sessions.getRecentlyClosed(function(result) {
                CONFIGURATION.data.sessions = result;

                process_sessions(result);
            });

        });
    };

    function bind_bookmarks_events() {
    };


    var top_pages_c = $('div#top-pages'),
        top_pages_e = $('div#top-pages .top-pages-wrapper');

    function center_top_pages() {
        var container_w = top_pages_c.width();
        var site_w = $('div.site', top_pages_c).outerWidth();
        var row_elements_n = Math.floor(container_w / site_w);
        var blank_space = container_w - (site_w * row_elements_n);

        top_pages_e.css({'margin-left': (blank_space / 2)});
    }

    var apps_c = $('div#apps'),
        apps_e = $('div#apps .apps-wrapper');

    function center_apps() {
        var container_w = apps_c.width();
        var app_w = $('div.app', apps_c).outerWidth();
        var row_elements_n = Math.floor(container_w / app_w);
        var blank_space = container_w - (app_w * row_elements_n);

        apps_e.css({'margin-left': (blank_space / 2)});
    }

    var recently_closed_c = $('div#recently-closed-pages'),
        recently_closed_e = $('div#recently-closed-pages .recently-closed-pages-wrapper');

    function center_recently_closed() {
        var container_w = recently_closed_c.width();
        var site_w = $('div.closed-site', recently_closed_c).outerWidth();
        var row_elements_n = Math.floor(container_w / site_w);
        var blank_space = container_w - (site_w * row_elements_n);

        recently_closed_e.css({'margin-left': (blank_space / 2)});
    }
});