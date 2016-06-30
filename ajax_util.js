window.gb = window.gb || {};
(function (NS, $) {
  function after (n, t) {
    return function () {
      return --n < 1 ? t.apply(this, arguments) : void 0;
    };
  }

  // function is_sublink(link, possible_sublink) {
  //     // Determine whether possible_sublink is a child of
  //     // link in the url tree. Returns false if the links
  //     // are the same.
  //
  //     // add trailing slashes if they're missing, to ensure
  //     // that is_sublink(/test', '/test-2') returns false,
  //     // but is_sublink(/test', '/test/2') returns true.
  //     if (possible_sublink.slice(-1) !== '/') {
  //         possible_sublink += '/';
  //     }
  //     if (link.slice(-1) !== '/') {
  //         link += '/';
  //     }
  //
  //     if (link !== possible_sublink && possible_sublink.indexOf(link) === 0) {
  //         return true;
  //     }
  //     else {
  //         return false;
  //     }
  // };
  // NS.is_sublink = is_sublink;

  function getmatch (str, re, i) {
    /* Find and return the ith matched pattern in a regex, or
       return a blank string if not found */

    var match = str.match(re);
    if (match) {
      return match[i];
    } else {
      return '';
    }
  }

  function get_body (html) {
    /* Get wrapped body element from an html document */

    return $('<div' + getmatch(html, /<body([^>]*>[\S\s]*)<\/body>/, 1) +
             '</div>');
  }
  NS.get_body = get_body;

  function get_title (html) {
    /* Get title string from an html document */

    var raw = getmatch(html, /<title>([\s\S]*?)<\/title>/, 1);
    // unescape entities
    return $('<div>').html(raw).text();
  }
  NS.get_title = get_title;

  function get_current_url () {
    /* Get fully qualified current url. */

    return window.location.pathname + window.location.search +
           window.location.hash;
  }
  NS.get_current_url = get_current_url;

  function ajax_url (url) {
    return url + (url.match(/\?/) ? '&' : '?') + 'ajax=1';
  }
  NS.ajax_url = ajax_url;

  function is_local_link (link) {
    /* Return true if the link points to an html page within the site. */

    var domain = getmatch(window.location.href, /[^\/]+\/\/[^\/]+/, 0);

    return link.is('a[href]:not([href^="http://"], [href^="https://"]), ' +
                   ' a[href^="' + domain + '"]') &&
           !link.is('[href$=".xml"], [href$=".pdf"], [href$=".jpg"], ' +
                    '[href$=".gif"], [href$=".png"], [href^="#"], ' +
                    '[href^="mailto:"]');
  }
  NS.is_local_link = is_local_link;

  function is_integer (value) {
    return typeof value === 'number' && isFinite(value) &&
      Math.floor(value) === value;
  }

  function AjaxLoader (loader, options) {
    // TODO get rid of namespace, just need another solution to make sure it
    // doesn't trigger an extra load in safari

    /* Handle ajax loading and window history state within a given namespace.
       Requires jquery and Modernizr.history

    - loader: function (new_body)
      function which inserts the new body content into the page, or whatever
      subset is required

    options:
    - ajax_url: function (url)
      converts a normal url to an ajax one. Default appends ?ajax=1
    - before_load: function (url)
      called before a load is executed, return false to cancel

    methods:
    - load: function (url, scroll_target, state)
      load a given url, scroll_target is an optional pixel position to scroll,
      state is used internally by popstate

    */
    this.loader = loader;

    this.options = $.extend({
      ajax_url: ajax_url
    }, options || {});

    this.bind();
  }
  AjaxLoader.prototype = {
    load: function (url, scroll_target, state) {
      /* url: the page to load
         scroll_target: pass an integer to scroll to a specific position.
         Pass null to prevent scroll. If undefined, will scroll according to
         the url #value
         state: the history state value - used internally
       */
      var html;
      var that = this;
      var url_anchor = url.split('#')[1];

      // if state is not undefined, assume the load was triggered by popstate
      var popped = (state !== undefined);

      function push_state () {
        if (window.Modernizr.history && !popped) {
          // only push state if it's a new page load
          window.history.pushState({}, null, url);
          if (that.options.on_state_change) {
            that.options.on_state_change();
          }
        }
      }

      if (this.options.before_load) {
        if (this.options.before_load(url) === false) {
          push_state();
          return;
        }
      }

      var reveal = after(2, function () {
        var title = get_title(html);
        if (title) {
          document.title = title;
        }
        that.loader(get_body(html), state);
        if (scroll_target === undefined) {
          var anchor_target = url_anchor ? $('#' + url_anchor) : null;
          if (anchor_target && anchor_target.length) {
            scroll_target = parseInt(anchor_target.offset().top, 10);
          } else {
            scroll_target = 0;
          }
        }
        if (is_integer(scroll_target)) {
          $(window).scrollTop(scroll_target);
        }
      });

      if (is_integer(scroll_target)) {
        $(window).scrollTop(scroll_target);
        setTimeout(reveal, 100);
      } else {
        reveal();
      }

      var ajax_url = this.options.ajax_url ? this.options.ajax_url(url) : url;

      function do_load (h) {
        push_state();
        html = h;
        reveal();
      }
      $.ajax({
        type: 'get',
        url: ajax_url,
        success: function (h, textStatus, XMLHttpRequest) {
          do_load(h);
        },
        error: function (xhr, ajaxOptions, thrownError) {
          window.location = url;
        }
      });
    },
    bind: function () {
      var that = this;
      if (window.Modernizr.history) {
        $(window).bind('popstate', function (e) {
          // TODO avoid handling Crapfari's pageload popstate event
          var url = get_current_url();

          that.load(url, null, e.originalEvent.state);
          if (that.options.on_state_change) {
            that.options.on_state_change();
          }
        });

        // replace original state so original loaded page works
        window.history.replaceState({}, null, get_current_url());
      }
    }
  };
  NS.AjaxLoader = AjaxLoader;
})(window.gb, window.jQuery);
