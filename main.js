$(document).ready(function() {
    var top_pages_e = $('div#top-pages .top-pages-wrapper');
    var apps_e = $('div#apps .apps-wrapper');

    // bind live events
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
        console.log(result);
    });

    function is_enabled(enabled) {
        if (!enabled) {
            return 'disabled';
        } else {
            return '';
        }
    }

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
});