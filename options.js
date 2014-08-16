'use strict';

$(document).ready(function () {
    $('a#options').click(function () {
        var el = $(this);

        if (!el.hasClass('active')) {
            el.addClass('active');
            el.after('<div id="options-window"></div>');

            $('div#options-window').load('./options.html', function () {
                // fill in data
                $('input.topSitesVisible').prop('checked', CONFIGURATION.data.options.topSitesVisible);
                $('input.appsExtensionsVisible').prop('checked', CONFIGURATION.data.options.appsExtensionsVisible);
                $('input.sessionsVisible').prop('checked', CONFIGURATION.data.options.sessionsVisible);
                $('input.closeTabOnAppClick').prop('checked', CONFIGURATION.data.options.closeTabOnAppClick);

                $('input.topSitesItemsMax').val(CONFIGURATION.data.options.topSitesItemsMax)
                    .next()
                    .text(CONFIGURATION.data.options.topSitesItemsMax);

                $('input.sessionsItemsMax').val(CONFIGURATION.data.options.sessionsItemsMax)
                    .next()
                    .text(CONFIGURATION.data.options.sessionsItemsMax);

                if (CONFIGURATION.data.hiddenTopSites.length) {
                    $('a.restoreTopSites').click(function () {
                        var self = $(this);

                        if (confirm('Do you want to restore hidden most visited pages?')) {
                            CONFIGURATION.status.optionsChanged = true;
                            STORAGE.remove('hiddenTopSites');
                        }
                    });
                } else {
                    $('a.restoreTopSites').prop('disable', true);
                }

                if (CONFIGURATION.data.appsHidden) {
                    $('a.restoreApps').click(function () {
                        var self = $(this);

                        if (confirm('Do you want to restore hidden applications?')) {
                            CONFIGURATION.status.optionsChanged = true;
                            STORAGE.remove('appsHidden');
                        }
                    });
                } else {
                    $('a.restoreApps').prop('disable', true);
                }

                // bind events
                $('div#options-window input[type="checkbox"]').change(function () {
                    var property = $(this).attr('class'),
                        val = $(this).is(':checked');

                    CONFIGURATION.data.options[property] = val;
                    CONFIGURATION.status.optionsChanged = true;
                });

                $('div#options-window input[type="range"]').on('input', function () {
                    var property = $(this).attr('class'),
                        val = $(this).val();

                    $(this).next('.amount').text(val);

                    CONFIGURATION.data.options[property] = parseInt(val, 10);
                    CONFIGURATION.status.optionsChanged = true;
                });

                $(this).slideDown();

                function close_and_cleanup(ev) {
                    if (ev.type == 'click' && !$.contains($('div#options-window')[0], ev.target) && !$(ev.target).is('div#options-window') || ev.type == 'keyup' && ev.keyCode == 27) {
                        $(document).unbind('click keyup', close_and_cleanup);

                        $('div#options-window').slideUp(function () {
                            el.removeClass('active');
                            $(this).empty().remove();

                            if (CONFIGURATION.status.optionsChanged) {
                                STORAGE.set({'options': CONFIGURATION.data.options}, function () {
                                    chrome.tabs.getCurrent(function (tab) {
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