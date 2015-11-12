/*

Example usage:

    $('a.latebox').latebox();


*/

$.fn.latebox = (function(user_options){
    var links = $(this),
        overlay = $('<div>').addClass('latebox-overlay').appendTo('body').hide(),
        box = $('<div>').addClass('box').appendTo(overlay),
        close = $('<a>').text('Close').addClass('close').appendTo(box),
        prev = $('<a>').text('Prev').addClass('prev').appendTo(box),
        image = $('<div>').addClass('image').appendTo(box),
        next = $('<a>').text('Next').addClass('next').appendTo(box),
        current = 0,
        options = $.extend({
            caption_callback: function(link) {
                return link.attr('title');
            }
        }, user_options);
    
    function hide() {
        overlay.fadeOut();
        $('body').css('overflow', 'auto');
    };
    
    function show(which) {
        if (links.is(which)) {
            current = links.index(which);
        }
        else if (which === 'prev') {
            current = Math.max(current - 1, 0);
        }
        else if (which === 'next') {
            current = (current + 1) % links.length;
        }
        
        image.html('').append($('<p>').addClass('loading').text('Loading'));
        
        var link = links.eq(current),
            new_img = $('<img>').hide().attr('height', link.data('height'))
                                .attr('width', link.data('width'))
                                .appendTo(image);
        
        overlay.fadeIn();
        $('body').css('overflow', 'hidden');
        
        new_img.load(function() {
            new_img.fadeIn().siblings().remove();
            var caption = options.caption_callback(link);
            if (caption) {
                $('<div>').addClass('caption').hide().appendTo(image).html(caption).fadeIn();
            }
        });
        new_img.attr('src', link.attr('href'));
        
        if (current === links.length - 1) {
            next.addClass('disabled');
        }
        else {
            next.removeClass('disabled');
        }
        if (current === 0) {
            prev.addClass('disabled');
        }
        else {
            prev.removeClass('disabled');
        }
    };
    
    links.click(function() {
        show($(this));
        return false;
    });
    close.click(hide);
    prev.click(function() {
        if (!$(this).hasClass('disabled')) {
            show('prev');
        }
    });
    next.click(function() {
        if (!$(this).hasClass('disabled')) {
            show('next');
        }
    });
    image.find('img').click(function() {
        next.click();
    });
    overlay.click(function(e) {
        var target = $(e.target);
        if (target[0] === overlay[0]) {
            hide();
        }
    });
    
});

