window.gregbrown = window.gregbrown || {};

(function($) {
    
    gregbrown.get_youtube_id = function(url) {
        var match = url.match(/(?:v=|youtu.be\/)([A-z0-9\-]+)/);
        return match ? match[1] : '';
    };
    
    gregbrown.youtube_embed = function(container, options) {
        var player = new YT.Player(container[0], {
            height: options.height || container.height(),
            width: options.width || container.width(),
            playerVars: {
                controls: 0,
                autoplay: options.autoplay || 0,
                loop: options.loop || 0,
                autohide: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                playlist: options.loop ? options.youtube_id : null
            },
            events: {
                onReady: options.ready
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
    
    var youtube_loading = false;
    gregbrown.load_youtube_api = function(callback) {
      /* Load the youtube api, if necessary, then calls the provided ]
         callback. */
      
      if ('YT' in window && 'Player' in window.YT) {
        callback();
      }
      else {
        // use interval instead of onYouTubeIframeAPIReady because we might have
        // more than one video loading
        var interval = setInterval(function() {
          if ('YT' in window && 'Player' in window.YT) {
            clearInterval(interval);
            callback();
          }
        }, 100);
        
        if (!youtube_loading) {
          $.getScript('//www.youtube.com/iframe_api');
          youtube_loading = true;
        }
      }
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
        
        var href = (typeof link === 'string') ? link : link.attr('href'),
            bits = href.split('#'),
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
        function handler() {
            var target = gregbrown.get_link_target($(this));
        
            if (target) {
                var scroll_target = target.offset().top + (options.offset || 0);
                gregbrown.polite_scroll_to(scroll_target, duration, 
                                           options.callback);
                return false;
            }
        };
        if (typeof links === 'string') {
            // assume a selector
            (options.container || $('body')).on('click', links, handler);
        }
        else {
            links.on('click', handler);
        }
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
               - type, "slider" (default), "infinite-slider" or "basic"
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
        
        
        function handle_resize() {
            var width = $(options.window).width();
            items.each(function(i) {
                $(this).css({
                    width: container.width(),
                    marginRight: (width - container.width()) + 'px'
                });
            });
            inner.css({
                width: items.length * width + 'px'
            });
            show(current);
        };
        
        var initialized = false;
        function initialize() {
            if (initialized) return;
            
            if (is_slider) {
                items.css({
                    float: 'left'
                });
                $(window).on('resize', handle_resize);
                handle_resize();
            }
            if (playing) {
                set_interval();
            }
            initialized = true;
        };
        initialize();
        
        function deinitialize() {
            if (!initialized) return;
        
            if (options.type === 'slider') {
                items.css({
                    float: '',
                    width: '',
                    marginRight: ''
                });
                inner.css({
                    width: '',
                    marginLeft: ''
                });
                $(window).off('resize', handle_resize);
            }
            if (playing) {
                clear_interval();
            }
            initialized = false;
        };
        
        items.eq(0).addClass('current');
        indicators.find('a').eq(0).addClass('current');
        
        counter.append($('<span>').text(1).addClass('number'))
               .append($('<span>').text(items.length).addClass('total'));
        
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
            var index = current % items.length;
            items.eq(index).addClass('current');
            items.not(items.eq(index)).removeClass('current');
            
            counter.find('.number').text(index + 1);
            indicators.find('a').removeClass('current')
                                .eq(index).addClass('current');
    
            prev[index <= 0 ? 'addClass' : 'removeClass']('end')
            next[index >= items.length - 1 ? 'addClass' : 'removeClass']('start')
    
            if (playing) {
                set_interval();
            }
            options.change && options.change(index, items);
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
            },
            disable: deinitialize,
            enable: initialize
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
            var scroll = $(window).scrollTop();
            
            if (nav.prev().length) {
                var breakpoint = nav.prev().offset().top
                               + nav.prev().outerHeight()
                               + parseInt(nav.prev().css('marginBottom'));
            }
            else {
                var breakpoint = nav.parent().offset().top
                               + parseInt(nav.parent().css('paddingTop'));
            }
           
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
    
    function bind_handlers(resize, scroll) {
      resize();
      scroll($(window).scrollTop(), $(window).scrollLeft());
      $(window).on('resize', function() {
        resize($(window).width(), $(window).height());
      });
      $(window).on('scroll resize', function() {
        scroll($(window).scrollTop(), $(window).scrollLeft());
      });
    };
    
    
    function in_viewport(scroll_top, body_height, win_height, bounds) {
      /* Returns the index of the "current" bounds pair in the viewport, if any.
         bounds should be an array of [top, bottom] pairs, ordered from top to 
         bottom. Returns -1 if none match. */
      
      // normalize to within the actual page, with 5px buffer
      scroll_top = Math.max(5, Math.min(scroll_top, 
                                        body_height - win_height - 5));
      
          // scroll amount as a proportion - i.e. 0 at the top of the
          // page and 1 at the bottom
      var scroll_proportion = scroll_top / (body_height - win_height),
          
          // pos px must fall within the target bounds for it to be 
          // considered "current". Scaling it by the scroll proportion 
          // means that elements at the top and bottom of the page will 
          // be handled as expected, however small.
          pos = Math.max(0, scroll_top + win_height * scroll_proportion);
      
      // iterate bottom to top to give precedence to items newly scrolled  
      // into view
      for (var i = bounds.length - 1; i >= 0; i--) {
        if (bounds[i] && pos >= bounds[i][0] && pos <= bounds[i][1]) {
          return i;
        }
      }
      return -1;
    };
    
    
    gregbrown.local_link_state = function(links, settings) {
        /* Tracks the state of local links, adding a class when the link's
           target is in view. */
        
        var options = $.extend({
              bind: true,
              callback: null
            }, settings),
            classname = 'current',
            win_height,
            body_height,
            bounds;
        
        function resize(ww, wh) {
          win_height = wh;
          body_height = $('body').height();
          
          bounds = [];
          links.each(function() {
            var target = gregbrown.get_link_target($(this));
            if (target) {
              var top = target.offset().top;
              bounds.push([top, top + target.outerHeight()]);
            }
            else {
              bounds.push(null);
            }
          });
          
          // messes with the index for retrieving element
          // bounds.sort(function(a, b){
          //   return a[0] - b[0];
          // });
        };
        function scroll(scroll_top, scroll_left) {
            var idx = in_viewport(scroll_top, body_height, win_height, bounds),
                current = (idx > -1) ? links.eq(idx) : undefined;
            
            if (options.callback) {
              if (current && !current.hasClass('current') ||
                  !current && links.hasClass('current')) {
                // callback only when the current link changes
                options.callback(current);
              }
            }
            current && current.addClass('current');
            links.not(current).removeClass('current');
        };
        
        if (options.bind) {
          bind_handlers(resize, scroll);
        }
        return {
          'resize': resize,
          'scroll': scroll
        }
    };
    
    
    gregbrown.element_state = function(elements, callback, settings) {
        /* Tracks the viewport state of a set of elements, calling a callback
           function when each element moves into the viewport. */
        
        var options = $.extend({
              bind: true
            }, settings),
            win_height,
            body_height,
            bounds;
        
        function resize(ww, wh) {
          win_height = wh;
          body_height = $('body').height();
          
          bounds = [];
          elements.each(function(i) {
            if ($(this).is(':visible')) {
              var top = $(this).offset().top;
              bounds.push([top, top + $(this).outerHeight(), i]);
            }
            else {
              bounds.push(null)
            }
          });
          bounds.sort(function(a, b){
            return a && b ? a[0] - b[0] : 0;
          });
        };
        
        var prev_idx = -1;
        function scroll(scroll_top, scroll_left) {
            var idx = in_viewport(scroll_top, body_height, win_height, bounds);
            if (idx !== prev_idx) {
              if (idx > -1) {
                callback(elements.eq(bounds[idx][2]));
              }
              else {
                callback(undefined);
              }
              prev_idx = idx;
            }
        };
        
        if (options.bind) {
          bind_handlers(resize, scroll);
        }
        return {
          'resize': resize,
          'scroll': scroll
        }
    };

    
})(jQuery);