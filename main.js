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
        var properties = $(this).data('properties');

        if (properties.enabled) {
            chrome.management.launchApp(properties.id);
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

            top_pages_e.append(site);
        }

        top_pages_e.append('<div class="clear-both"></div>');

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
        function is_enabled(enabled) {
            if (!enabled) {
                return 'disabled';
            } else {
                return '';
            }
        }

        for (var i = 0; i < result.length; i++) {
            var app =
                $('<div class="app" title="' + result[i].name + '"> \
                    <div class="wrapper">\
                        <img class="' + is_enabled(result[i].enabled) + '" src="' + get_icon(result[i].icons) + '" />\
                        <span>' + shorten_name(result[i]) + '</span>\
                    </div>\
                </div>');

            app.data('properties', result[i]);
            apps_e.append(app);
        }

        apps_e.append('<div class="clear-both"></div>');

        center_apps();
        apps_e.fadeIn(60);

        console.log(result);
    });

    // take care of management events
    chrome.management.onInstalled.addListener(function(info) {
        console.log(info);
    });

    chrome.management.onUninstalled.addListener(function(id) {
        console.log(id);
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


    // shared functions
    function get_icon(iconArr) {
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
    }

    function shorten_name(app) {
        function do_the_math(name) {
            if (name.length < 19) {
                return name;
            } else {
                var short_name = name.slice(0, 19);
                return short_name + '...';
            }
        }

        if (app.shortName) {
            return do_the_math(app.shortName);
        } else {
            return do_the_math(app.name);
        }
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
});