$(document).ready(function() {
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

                $('input.topSitesItemsMax').val(CONFIGURATION.data.options.topSitesItemsMax)
                    .next()
                    .text(CONFIGURATION.data.options.topSitesItemsMax);

                $('input.sessionsItemsMax').val(CONFIGURATION.data.options.sessionsItemsMax)
                    .next()
                    .text(CONFIGURATION.data.options.sessionsItemsMax);

                $('a.restoreTopSites').click(function() {
                    $(this).addClass('restored');
                    CONFIGURATION.status.optionsChanged = true;

                    chrome.storage.sync.remove('hiddenTopSites');
                });

                // bind events
                $('div#options-window input[type="checkbox"]').change(function() {
                    CONFIGURATION.status.optionsChanged = true;

                    var property = $(this).attr('class');
                    var val = $(this).is(':checked');

                    CONFIGURATION.data.options[property] = val;
                });

                $('div#options-window input[type="range"]').on('input', function() {
                    CONFIGURATION.status.optionsChanged = true;

                    var property = $(this).attr('class');
                    var val = $(this).val();

                    $(this).next('.amount').text(val);

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