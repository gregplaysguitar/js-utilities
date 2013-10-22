window.gregbrown = window.gregbrown || {};

(function($) {

    gregbrown.get_youtube_id = function(url) {
        var match = url.match(/v=([A-z0-9]+)/);
        return match ? match[1] : '';
    };

    gregbrown.now_and_on = function(el, event_type, fn) {
        fn();
        el.on(event_type, fn);
    };

    function once(func) {
        /* Returns a function that will be executed at most one time, no matter how
           often you call it. Useful for lazy initialization.
           Stolen from underscore.js */

        var ran = false, memo;
        return function() {
            if (ran) return memo;
            ran = true;
            memo = func.apply(this, arguments);
            func = null;
            return memo;
        };
    };

    function get_scroll_pos(val) {
        if (typeof val === 'number') {
            return val;
        }
        else {
            // assume a jquery el
            return val.offset().top;
        }
    };

    gregbrown.impolite_scroll_to = function(val, duration, callback) {
        var scroll_el = $("html, body");
    
        scroll_el.animate({
            scrollTop: get_scroll_pos(val)
        }, {
            duration: duration,
            complete: once(function() {
                callback && callback();
            })
        });
    };

    gregbrown.polite_scroll_to = function(val, duration, callback) {
        /* scrolls body to a value, without fighting the user if they
           try to scroll in the middle of the animation.
           Note, if you call this multiple times simulatenously, the calls
           will cancel each other, with unpredictable results. */

        var auto_scroll = false,
            scroll_el = $("html, body"),
            events_el = $(window);

        function stop_scroll() {
            if (!auto_scroll) {
                scroll_el.stop(true, false);
            }
            else {
                auto_scroll = false;
            }
        };

        // workaround weird IOS7 bug
        var stop_timeout = setTimeout(function() {
            events_el.on('scroll', stop_scroll);
        }, 100);

        scroll_el.animate({
            scrollTop: get_scroll_pos(val)
        }, {
            duration: duration,
            step: function() {
                auto_scroll = true;
            },
            complete: once(function() {
                callback && callback();
            }),
            always: once(function() {
                events_el.off('scroll', stop_scroll);
                clearTimeout(stop_timeout);
            })
        });
    };

    gregbrown.local_scroll = function(links, duration, callback) {
        /* Smooth-scroll to the link target - links should be a collection
           of #fragment links */

        links.click(function() {
            var link = $(this),
                bits = link.attr('href').split('#'),
                target = $('#' + bits[1]);

            if ((!bits[0] || bits[0] === window.location.pathname) && target.length) {
                gregbrown.polite_scroll_to(target.offset().top, duration, callback);
                return false;
            }
        });
    };

    gregbrown.infinite_scroll = function(container, next_selector, content_selector, auto_offset, callback) {
        var loading = false;
        container.on('click', next_selector, function() {
            if (!loading) {
                var link = $(this);
                container.addClass('loading');
                loading = true;
                $.get(link.attr('href'), function(html) {
                    var content = $('<div>').html(html),
                        content_length = container.find(content_selector).length,
                        next_href = content.find(next_selector).attr('href');
                    container.find(content_selector).eq(-1).after(content.find(content_selector));
                    container.removeClass('loading');
                    
                    if (next_href) {
                        link.attr('href', next_href);
                    }
                    else {
                        link.remove();
                    }
                    callback(container.find(content_selector).slice(content_length), container);
                    loading = false;
                });
            }
            return false;
        });
        
        if (auto_offset) {
            container.find(next_selector).hide();
            $(window).on('scroll', function() {
                if ($(window).scrollTop() > container.offset().top
                                            + container.outerHeight()
                                            - $(window).height()
                                            - auto_offset) {
                    container.find(next_selector).click();
                }
            });
        } 
    };

    gregbrown.slider = function(container, options) {
        /* Turns a group of block level stacked elements into an animated
           slider, with elements animating in from the edge of the window.
           Options:
               - selector, identifies the children to be animated
               - interval (optional), triggers 'next' at a set interval

           - Creates next/prev links and a counter to be styled up via css
           - For animations, a css transition is required.

           */

        var items = container.find(options.selector),
            options = $.extend({
                interval: null
            }, options);

        if (items.length < 2) {
            return;
        }

        var transport = $('<nav>').addClass('transport').appendTo(container),
            prev = $('<a>').html('&larr;').addClass('prev').appendTo(transport),
            next = $('<a>').html('&rarr;').addClass('next').appendTo(transport),
            counter = $('<p>').addClass('counter').appendTo(container),
            current = 0,
            timeout;


        container.height(items.aggregate('height', 'max'));
        items.css({
            position: 'absolute',
            top: 0,
            left: 0
        });

        gregbrown.now_and_on($(window), 'resize', function() {
            var width = $(window).width();
            items.each(function(i) {
                $(this).css('marginLeft', i * width + 'px');
            });
        });

        counter.append($('<span>').text(1).addClass('number'))
               .append($('<span>').text(items.length).addClass('total'));

        function set_interval() {
            if (options.interval) {
                timeout = setTimeout(function() {
                    show('next');
                }, options.interval);
            }
        };

        function show(which) {
            clearTimeout(timeout);
            current = (current + (which === 'prev' ? -1 : 1) + items.length) % items.length;
            items.css({
                left: -current * $(window).width() + 'px'
            });
            counter.find('.number').text(current + 1);

            set_interval();
        };

        prev.click(function() {
            show('prev');
        });
        next.click(function() {
            show('next');
        });

        set_interval();
    };

    gregbrown.coords_from_link = function(map_href) {
        // gets coords from a link like https://maps.google.co.nz/?ll=-43,172&...
        return map_href.match(/ll=([\d\.\-]+),([\d\.\-]+)/).slice(1);
    };


})(jQuery);