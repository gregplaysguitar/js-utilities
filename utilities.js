window.gregbrown = window.gregbrown || {};

(function($) {
    
    gregbrown.get_youtube_id = function(url) {
        var match = url.match(/(?:v=|youtu.be\/)([A-z0-9]+)/);
        return match ? match[1] : '';
    };
    
    gregbrown.youtube_embed = function(container, options) {
       var player = new YT.Player(container[0], {
            height: options.height || container.height(),
            width: options.width || container.width(),
            playerVars: {
                controls: 0,
                autoplay: options.autoplay || 0,
                autohide: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0
            },
            videoId: options.youtube_id
        });
        
        function play_pause() {
            if (player.getPlayerState() !== 1) {
                player.playVideo();
                return true;
            }
            else {
                player.pauseVideo();
                return false;
            }
        }
        
        return {
            player: player,
            play_pause: play_pause
        };
    };
    
    gregbrown.was_clicked = function(el, e) {
        alert('Deprecated: Use $.fn.closest');
        var target = $(e.target);
        if (target.is(el)) {
            return target;
        }
        else if (target.parents().is(el)) {
            return target.parents().filter(el);
        }
        else {
            return null;
        }
    };
    
    gregbrown.now_and_on = function(el, event_type, fn) {
        fn();
        (el.on ? el : $(el)).on(event_type, fn);
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
            complete: _.once(function() {
                callback && callback();
            })
        });
    };
    
    gregbrown.polite_scroll_to = function(val, duration, callback) {
        /* scrolls body to a value, without fighting the user if they
           try to scroll in the middle of the animation. */
        
        var auto_scroll = false,
            scroll_el = $("html, body"),
            events_el = $(window);
        
        var stop_scroll = _.throttle(function() {
            if (!auto_scroll) {
                scroll_el.stop(true, false);
                cancel_stop();
            }
            else {
                auto_scroll = false;
            }
        }, 100, {trailing: false});

        // workaround weird IOS7 bug
        var stop_timeout = setTimeout(function() {
            events_el.on('scroll', stop_scroll);
        }, 100);
        var cancel_stop = _.once(function() {
            clearTimeout(stop_timeout);
            events_el.off('scroll', stop_scroll);
        });

        scroll_el.stop().animate({
            scrollTop: get_scroll_pos(val)
        }, {
            duration: duration,
            step: function() {
                auto_scroll = true;
            },
            complete: _.once(function() {
                callback && callback();
            }),
            always: _.once(function() {
                cancel_stop();
            })
        });
    };
    
    gregbrown.get_link_target = function(link) {
        /* Get the target for a local link, if it exists. Link href can be either
           just a hash fragment, i.e. "#footer", or a path *and* a hash fragment
           if the path matches the current page, i.e. "/about#contact". */
        
        var bits = link.attr('href').split('#'),
            target = $('#' + bits[1]),
            valid_path = (!bits[0] || bits[0] === window.location.pathname);
        
        if (valid_path && bits[1] === '') {
            // special case for no hash fragment, i.e. top of the page
            return $('body');
        }
        else if (valid_path && target.length) {
            return target;
        }
    };
    
    gregbrown.local_scroll = function(links, duration, options) {
        /* Smooth-scroll to the link target - links should be a collection
           of #fragment or /path#fragment links. */
    
        if (!options) {
            options = {};
        }
        
        // scroll on click
        links.click(function() {
            var target = gregbrown.get_link_target($(this));
    
            if (target) {
                var scroll_target = target.offset().top + (options.offset || 0);
                gregbrown.polite_scroll_to(scroll_target, duration, 
                                           options.callback);
                return false;
            }
        });
    };
    
    gregbrown.infinite_scroll = function(container, next_selector, 
                                         content_selector, auto_offset, 
                                         callback) {
        var loading = false;
        container.on('click', next_selector, function() {
            if (!loading) {
                var link = $(this);
                container.addClass('loading');
                loading = true;
                $.get(link.attr('href'), function(html) {
                    var content = $('<div>').html(html),
                        content_len = container.find(content_selector).length,
                        next_href = content.find(next_selector).attr('href');
                    container.find(content_selector)
                             .eq(-1).after(content.find(content_selector));
                    container.removeClass('loading');
                    
                    if (next_href) {
                        link.attr('href', next_href);
                    }
                    else {
                        link.remove();
                    }
                    callback(container.find(content_selector)
                                      .slice(content_len),
                             container);
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
           slider, with elements animating in from the edge of the window,
           or crossfading.
    
           Options:
               - selector, identifies the children to be animated
               - interval (optional), triggers 'next' at a set interval
               - type, "slider" (default), "infinite-slider" or "default"
               - window, to bring items in from the edge of. Defaults to
                 the actual window
               - prev_text & next_text, text for the transport links
               - change, function called on item change. Arguments: 
                 - current index
                 - jquery collection of items
    
           - Creates next/prev links, indicator links, and a counter to be 
             styled up via css
           - For sliding animations, a css transition is required on the 
             .slider-inner element. 
           - Assumes the animated elements have no left/right margin or padding
           
           */
    
        var options = $.extend({
                interval: null,
                type: 'slider',
                window: window,
                next_text: '&rarr;',
                prev_text: '&larr;',
                change: null
            }, options),
            items = container.find(options.selector),
            is_slider = options.type === 'slider' || 
                        options.type === 'infinite-slider';
        
        
        if (items.length < 2) {
            return;
        }
    
        var inner = container.find('slider-inner'),
            transport = $('<nav>').addClass('transport').appendTo(container),
            prev = $('<a>').html(options.prev_text).addClass('prev')
                           .appendTo(transport),
            next = $('<a>').html(options.next_text).addClass('next')
                           .appendTo(transport),
            counter = $('<p>').addClass('counter').appendTo(container),
            indicators = $('<nav>').addClass('indicators').appendTo(container),
            current = 0;
        
        if (is_slider) {
            items.css({
                float: 'left'
            });
        }
        
        // create the inner element if not in the markup, and append items
        if (!inner.length) {
            inner = $('<div>').addClass('slider-inner');
            inner.insertBefore(items.eq(0));
            items.appendTo(inner);
        }
        
        items.each(function(i) {
            $('<a>').appendTo(indicators).click(function() {
                show(i);
            });
        });
        
        if (is_slider) {
            gregbrown.now_and_on($(window), 'resize', function() {
                var width = $(options.window).width();
                items.each(function(i) {
                    // $(this).css('marginLeft', i * width + 'px');
                    $(this).css({
                        width: container.width(),
                        marginRight: (width - container.width()) + 'px'
                    });
                });
                inner.css({
                    width: items.length * width + 'px'
                });
                show(current);
            });
        }
        
        items.eq(0).addClass('current');
        indicators.find('a').eq(0).addClass('current');
        
        counter.append($('<span>').text(1).addClass('number'))
               .append($('<span>').text(items.length).addClass('total'));
        
        var timeout,
            playing = !!options.interval;
        function clear_interval() {
            clearTimeout(timeout);
            timeout = null;
        };
        function set_interval() {
            clear_interval();
            timeout = setTimeout(function() {
                show('next');
            }, options.interval);
        };
        
        function show(which) {
            clear_interval();
            if (typeof which === 'number') {
                current = Math.max(0, Math.min(items.length - 1, 
                                               parseInt(which)));
            }
            else {
                var incr = (which === 'prev' ? -1 : 1);
                if (options.type === 'infinite-slider') {
                    current = current + incr;
                }
                else {
                    current = (current + incr + items.length) % items.length;
                }
            }
            if (is_slider) {
                var width = $(options.window).outerWidth(),
                    margin = -current * width;
                if (options.type === 'infinite-slider') {
                    // hack item over into place so it'll slide in as expected
                    var index = (current + Math.abs(current) * items.length) %
                                items.length;
                    items.eq(index).css({
                        position: 'relative',
                        left: -margin - index * width
                    });
                }
                inner.css({
                    marginLeft: margin + 'px'
                });
            }
            items.eq(current).addClass('current');
            items.not(items.eq(current)).removeClass('current');
            
            counter.find('.number').text(current + 1);
            indicators.find('a').removeClass('current')
                                .eq(current).addClass('current');
            
            prev[current <= 0 ? 'addClass' : 'removeClass']('end')
            next[current >= items.length - 1 ? 'addClass' : 'removeClass']('start')
            
            if (playing) {
                set_interval();
            }
            options.change && options.change(current, items);
        };
        
        prev.click(function() {
            show('prev');
        });
        next.click(function() {
            show('next');
        });
        
        if (playing) {
            set_interval();
        }
        
        return {
            pause: function() {
                playing = false;
                clear_interval();
            },
            play: function() {
                playing = true;
                set_interval();
            },
            show: show,
            is_playing: function() {
                return playing;
            }
        };
    };
    
    gregbrown.coords_from_link = function(map_href) {
        // gets coords from a link like
        // https://www.google.co.nz/maps/@-36.856258,174.746699,14z or
        // https://maps.google.co.nz/?ll=-43,172&...
        var regex = /(?:ll=|\/maps\/@)\s*([\d\.\-]+)\s*,\s*([\d\.\-]+)/,
            match = map_href.match(regex);
        return match && match.slice(1);
    };
    
    gregbrown.fixed_nav = function(nav) {
        /* Makes a nav element - typically in the site header - and 
           fixes it to the top of the page once the user has scrolled
           far enough for it to hit the top. */
        
        var parent = nav.parent();
        
        // spacer div to keep the layout consistent once we pull out the nav
        $('<div>').insertAfter(nav).css({
            height: nav.outerHeight(),
            marginTop: nav.css('marginTop'),
            marginBottom: nav.css('marginBottom')
        });
        
        function position() {
            var scroll = $(window).scrollTop(),
                breakpoint = nav.prev().offset().top
                           + nav.prev().outerHeight()
                           + parseInt(nav.prev().css('marginBottom'));
           
            if (scroll > breakpoint) {
                nav.css({
                    position: 'fixed',
                    top: 0,
                    left: -parent.offset().left - $(window).scrollLeft(),
                    right: Math.min(0, parent.offset().left + parent.width()
                                       - $(window).width())
                });
            }
            else {
                nav.css({
                    position: 'absolute',
                    top: breakpoint,
                    left: 0,
                    right: 0
                });
            }
        };
        position();        
        $(window).on('scroll resize', position);
    };
    
    gregbrown.local_link_state = function(links) {
        /* Tracks the state of local links, adding a class when the link's
           target is in view. */
        
        var classname = 'current';
        
        function set_state() {
            var scroll = $(window).scrollTop(),
                win_height = $(window).height(),
                
                // scroll amount as a proportion - i.e. 0 at the top of the
                // page and 1 at the bottom
                scroll_proportion = scroll / ($('body').height() - win_height),
                
                // threshold px must fall within the target bounds for it to be 
                // considered "current". Scaling it by the scroll proportion 
                // means that elements at the top and bottom of the page will 
                // be handled as expected, however small.
                threshold = Math.max(1, scroll + win_height * scroll_proportion),
                
                current = undefined,
                cur_top = 0;
            
            links.each(function() {
                var target = gregbrown.get_link_target($(this));
                
                if (target) {
                    var top = target.offset().top,
                        bottom = top + target.outerHeight();
                    if (threshold >= top && threshold <= bottom
                                         && top > cur_top) {
                        current = $(this);
                        cur_top = top;
                    }
                }
            });
            current && current.addClass('current');
            links.not(current).removeClass('current');
        };
        
        set_state();        
        $(window).on('scroll resize', set_state);
    };
    
})(jQuery);