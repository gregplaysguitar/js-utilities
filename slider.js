window.gb = window.gb || {};

(function (NS, $) {

  // TODO create "simple slider" which just handles adding past/active/future
  // classes and *optionally* adds transport/counter/indicators
  // no need for initialize/deinitialize

  function SimpleSlider (container, selector, options) {
    this.container = container;
    this.selector = selector;
    this.options = $.extend({
      interval: null,
      change: null,
      transport: false,
      indicators: false
    }, options);

    this.items = this.container.find(this.selector);

    this.playing = !!this.options.interval;
    if (this.playing) {
      this.set_interval();
    }

    this.make_extras();

    this.index = 0;
    this.set_classes();

    var that = this;
    setTimeout(function () {
      that.container.addClass('slider-initialised');
    }, 0);

    this.touch_init();
  }
  SimpleSlider.prototype = {
    touch_init: function () {
      var that = this;

      // handle swipe gestures if Hammer.js present
      if (window.Hammer) {
        var Hammer = window.Hammer;
        var hammertime = new Hammer(this.container[0], {
          recognizers: [
            [Hammer.Swipe, {
              direction: Hammer.DIRECTION_HORIZONTAL,
              velocity: 0.25,
              threshold: 4
            }]
          ]
        });
        hammertime.on('swipe', function (e) {
          var which = e.direction === Hammer.DIRECTION_RIGHT ? 'prev' : 'next';
          that.show(which, false);
        });
      }
    },
    make_extras: function () {
      var that = this;
      var extras = ['indicators', 'transport'];
      $(extras).each(function (i, opt) {
        if (that.options[opt]) {
          that['make_' + opt]();
        }
      });
    },
    make_indicators: function () {
      var that = this;
      this.indicators = $('<nav>').addClass('indicators')
                                  .appendTo(this.container);
      this.items.each(function (i) {
        $('<a>').appendTo(that.indicators).on('click', function () {
          that.show(i);
        });
      });
    },
    make_transport: function () {
      var that = this;
      this.transport = $('<nav>').addClass('transport')
                                 .appendTo(this.container);

      $('<a>').addClass('prev').appendTo(this.transport);
      $('<a>').addClass('next').appendTo(this.transport);

      this.transport.on('click', 'a', function () {
        that.show($(this).is('.prev') ? 'prev' : 'next');
      });
    },
    pause: function () {
      this.playing = false;
      this.clear_interval();
    },
    play: function () {
      this.playing = true;
      this.set_interval();
    },
    clear_interval: function () {
      clearTimeout(this.timeout);
      this.timeout = null;
    },
    set_interval: function () {
      var that = this;
      var interval;
      this.clear_interval();
      if (typeof this.options.interval === 'object') {
        // assume [min, max] array
        interval = random_between.apply(null, this.options.interval);
      } else {
        interval = this.options.interval;
      }
      this.timeout = setTimeout(function () {
        that.show('next');
      }, interval);
    },
    set_classes: function () {
      this.items.eq(this.index).addClass('active').removeClass('past future');
      this.items.slice(0, this.index).addClass('past')
                                     .removeClass('active future');
      this.items.slice(this.index + 1).addClass('future')
                                      .removeClass('active past');

      // counter.find('.number').text(index + 1);

      if (this.options.indicators && this.items.length > 1) {
        this.indicators.find('a').removeClass('active')
                                 .eq(this.index).addClass('active');
      }

      if (this.options.transport && this.items.length > 1) {
        var at_start = this.index <= 0;
        var at_end = this.index >= this.items.length - 1;
        var prev = this.transport.find('.prev');
        var next = this.transport.find('.next');
        prev[at_start ? 'addClass' : 'removeClass']('end');
        next[at_end ? 'addClass' : 'removeClass']('start');
      }
    },
    show: function (which, loop) {
      loop = loop || loop === undefined;
      this.clear_interval();
      var item_len = this.items.length;
      if (typeof which === 'number') {
        this.index = Math.max(0, Math.min(item_len - 1, parseInt(which, 10)));
      } else {
        var raw = this.index + (which === 'prev' ? -1 : 1);
        if (loop) {
          this.index = (raw + item_len) % item_len;
        } else {
          this.index = Math.max(0, Math.min(item_len - 1, raw));
        }
      }
      this.set_classes();

      if (this.playing) {
        this.set_interval();
      }
      if (this.options.change) {
        this.options.change(this.index, this.items);
      }
    }
  };
  NS.SimpleSlider = SimpleSlider;

  function random_between (min, max) {
    return min + Math.random() * (max - min);
  }
})(window.gb, window.jQuery);
