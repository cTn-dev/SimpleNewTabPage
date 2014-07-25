$(document).ready(function() {
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
        if (!$(this).hasClass('noclick')) {
            chrome.management.launchApp($(this).attr('id'));
        }
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
        top_pages_e.fadeIn(60);
    });

    // fetch apps and extensions
    chrome.management.getAll(function(result) {

        // filter out extensions
        for (var i = result.length - 1; i >= 0; i--) {
            if (result[i].isApp == false) {
                result.splice(i, 1);
            }
        }

        // sort alphabetically (if custom order was saved, use that instead)
        result.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
        });

        // generate app shortcuts
        for (var i = 0; i < result.length; i++) {
            appGrid.addApp(result[i]);
        }

        center_apps();
        apps_e.fadeIn(60);
    });

    // take care of management events
    chrome.management.onInstalled.addListener(function(info) {
        if (info.isApp) {
            appGrid.addApp(info);
        }
    });

    chrome.management.onUninstalled.addListener(function(id) {
        var apps = $('.app', apps_e);

        for (var i = 0; i < apps.length; i++) {
            if (id == $(apps[i]).data('properties').id) {
                $(apps[i]).remove();
            }
        }
    });

    chrome.management.onEnabled.addListener(function(info) {
        var apps = $('.app', apps_e);

        for (var i = 0; i < apps.length; i++) {
            if (info.id == $(apps[i]).data('properties').id) {
                $('img', apps[i]).removeClass('disabled');
                $(apps[i]).data('properties', info);
                break;
            }
        }
    });

    chrome.management.onDisabled.addListener(function(info) {
        var apps = $('.app', apps_e);

        for (var i = 0; i < apps.length; i++) {
            if (info.id == $(apps[i]).data('properties').id) {
                $('img', apps[i]).addClass('disabled');
                $(apps[i]).data('properties', info);
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
        /*
        var container_w = apps_c.width();
        var app_w = $('div.app', apps_c).outerWidth();
        var row_elements_n = Math.floor(container_w / app_w);
        var blank_space = container_w - (app_w * row_elements_n);

        apps_e.css({'margin-left': (blank_space / 2)});
        */
    }
});