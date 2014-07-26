$(document).ready(function() {
    // add the dataTransfer property for use with the native `drop` event
    // to capture information about files dropped into the browser window
    jQuery.event.props.push("dataTransfer");

    var top_pages_c = $('div#top-pages');
    var top_pages_e = $('div#top-pages .top-pages-wrapper');
    var apps_c = $('div#apps');
    var apps_e = $('div#apps .apps-wrapper');

    // bind live events
    $(window).resize(function() {
        center_top_pages();
        center_apps();
    });

    apps_e.on('click', 'div.app', function() {
        chrome.management.launchApp($(this).attr('id'));

        chrome.tabs.getCurrent(function(tab) {
            chrome.tabs.remove(tab.id);
        });

        return false;
    });

    // fetch most used sites
    chrome.topSites.get(function(result) {
        for (var i = 0; i < 15; i++) {
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
        top_pages_e.fadeIn(50);
    });

    // fetch apps and extensions
    chrome.management.getAll(function(result) {

        // filter out extensions
        for (var i = result.length - 1; i >= 0; i--) {
            if (result[i].isApp == false) {
                result.splice(i, 1);
            }
        }

        chrome.storage.sync.get('gridOrder', function (data) {
            if (data.gridOrder) {
                for (var i = 0; i < data.gridOrder.length; i++) {
                    for (var j = 0; j < result.length; j++) {
                        if (result[j].id == data.gridOrder[i]) {
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
            apps_e.fadeIn(50);
        });
    });

    // take care of management events
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

    $('a#options').click(function() {
        var el = $(this);

        if (!el.hasClass('active')) {
            el.addClass('active');
            el.after('<div id="options-window"></div>');

            $('div#options-window').load('./options.html', function() {

                $(this).slideDown();

                function close_and_cleanup(ev) {
                    if (ev.type == 'click' && !$.contains($('div#options-window')[0], ev.target) && !$(ev.target).is('div#options-window') || ev.type == 'keyup' && ev.keyCode == 27) {
                        $(document).unbind('click keyup', close_and_cleanup);

                        $('div#options-window').slideUp(function() {
                            el.removeClass('active');
                            $(this).empty().remove();
                        });
                    }
                }

                $(document).bind('click keyup', close_and_cleanup);
            });
        }
    });
});