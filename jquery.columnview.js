/**
 * jquery.columnview-1.2.js
 *
 * Created by Chris Yates on 2009-02-26.
 * http://christianyates.com
 * Copyright 2009 Christian Yates and ASU Mars Space Flight Facility. All rights reserved.
 *
 * Supported under jQuery 1.2.x or later
 * Keyboard navigation supported under 1.3.x or later
 * 
 * Dual licensed under MIT and GPL.
 */

(function($){
  $.widget("cy.columnview", {
    options: {
      multi: false,     // Allow multiple selections
      preview: true,    // Handler for preview pane
      fixedwidth: false,// Use fixed width columns
      onchange: false   // Handler for selection change
    },

    _create: function() {
      var self = this; // Stash a reference to the widget instance object
      var settings = this.options; // Convenient way to access options
      var element  = this.element; // Convenient way to access element

      // Add stylesheet, but only once
      if (!$('.containerobj').get(0)) {
        self._addStyle();
      }

      // Hide original list
      $(element).hide();

      // Reset the original list's id
      var origid = $(element).attr('id');
      if (origid) {
        $(element).attr('id', origid + "-processed");
      }

      // Create new top container from top-level LI tags
      var top = $(element).children('li');
      var container = $('<div/>')
        .addClass('containerobj')
        .attr('id', origid)
        .insertAfter(element);
      var topdiv = $('<div class="top"></div>').appendTo(container);

      // Set column width
      if (settings.fixedwidth || $.browser.msie) { // MSIE doesn't support auto-width
        var width = typeof settings.fixedwidth == "string" ? settings.fixedwidth : '200px';
        $('.top').width(width);
      }

      $.each(top, function(i, item) {
        var topitem = $(':eq(0)',item).clone(true).wrapInner("<span/>").data('sub',$(item).children('ul')).appendTo(topdiv);
        if (settings.fixedwidth || $.browser.msie) {
          $(topitem).css({'text-overflow':'ellipsis', '-o-text-overflow':'ellipsis','-ms-text-overflow':'ellipsis'});
        }
        if ($(topitem).data('sub').length) {
          $(topitem).addClass('hasChildMenu');
          self._addWidget(topitem);
        }
      });

      // Firefox doesn't repeat keydown events when the key is held, so we use
      // keypress with FF/Gecko/Mozilla to enable continuous keyboard scrolling.
      var key_event = $.browser.mozilla ? 'keypress' : 'keydown';

      // Keyboard navigation
      $(container).bind(key_event, function(event) {
        self._doKeydown(event);
      });

      // Mouse clicks
      $(container).bind("click", function(event) {
        self._doClick(event, self);
      });
    },

    // Handle keydown events and synthesize mouse clicks
    _doKeydown: function(event) {
      switch (event.which) {
        case 37: //left
          $(event.target).parent().prev().children('.inpath').focus().trigger("click");
          break;
        case 38: //up
          $(event.target).prev().focus().trigger("click");
          break;
        case 39: //right
          if($(event.target).hasClass('hasChildMenu')){
            $(event.target).parent().next().children('a:first').focus().trigger("click");
          }
          break;
        case 40: //down
          $(event.target).next().focus().trigger("click");
          break;
        case 13: //enter
          $(event.target).trigger("dblclick");
          break;
        default:
          return;
      }
      event.preventDefault();
    },

    // Handle mouse clicks (including ones synthesized from keyboard events)
    _doClick: function(event, self) {
      var settings = self.options;

      if ($(event.target).is("a,span")) {
        if ($(event.target).is("span")){
          var target = $(event.target).parent();
        }
        else {
          var target = event.target;
        }
        if (!settings.multi) {
          delete event.shiftKey;
          delete event.metaKey;
        }
        target.focus();
        var container = $(target).parents('.containerobj');

        // Handle mouse clicks
        var level = $('div',container).index($(target).parents('div'));
        var isleafnode = false;
        // Remove blocks to the right in the tree, and 'deactivate' other
        // links within the same level, if metakey is not being used
        $('div:gt('+level+')',container).remove();
        if (!event.metaKey && !event.shiftKey) {
          $('div:eq('+level+') a',container).removeClass('active').removeClass('inpath');
          $('.active',container).addClass('inpath');
          $('div:lt('+level+') a',container).removeClass('active');
        }
        // Select intermediate items when shift clicking
        // Sorry, only works with jQuery 1.4 due to changes in the .index() function
        if (event.shiftKey) {
          var first = $('a.active:first', $(target).parent()).index();
          var cur = $(target).index();
          var range = [first,cur].sort(function(a,b){return a - b;});
          $('div:eq('+level+') a', container).slice(range[0], range[1]).addClass('active');
        }
        $(target).addClass('active');
        if ($(target).data('sub').children('li').length && !event.metaKey) {
          // Menu has children, so add another submenu
          var w = false;
          if (settings.fixedwidth || $.browser.msie)
          w = typeof settings.fixedwidth == "string" ? settings.fixedwidth : '200px';
          self._submenu(self, container, target, w);
        }
        else if (!event.metaKey && !event.shiftKey) {
          // No children, show title instead (if it exists, or a link)
          isleafnode = true;
          var previewcontainer = $('<div/>').addClass('feature').appendTo(container);
          // Fire preview handler function
          if ($.isFunction(settings.preview)) {
            // We're passing the element back to the callback
            var preview = settings.preview($(target));
          }
          // If preview is specifically disabled, do nothing with the previewbox
          else if (!settings.preview) {
          }
          // If no preview function is specificied, use a default behavior
          else {
            var title = $('<a/>').attr({href:$(target).attr('href')}).text($(target).attr('title') ? $(target).attr('title') : $(target).text());
            $(previewcontainer).html(title);
          }
          // Set the width
          var remainingspace = 0; 
          $.each($(container).children('div').slice(0,-1),function(i,item){
            remainingspace += $(item).width();
          });
          var fillwidth = $(container).width() - remainingspace;
          $(previewcontainer).css({'top':0,'left':remainingspace}).width(fillwidth).show();
        }
        // Fire onchange handler function, but only if multi-select is off.
        // FIXME Need to deal multiple selections.
        if ($.isFunction(settings.onchange) && !settings.multi) {
          // We're passing the element back to the callback
          var onchange = settings.onchange($(target), isleafnode);
        }
        event.preventDefault();
      }
    },

    // Generate deeper level menus
    _submenu: function(self, container, item, width) {
      var leftPos = 0;
      $.each($(container).children('div'),function(i,mydiv){
        leftPos += $(mydiv).width();
      });
      var submenu = $('<div/>').css({'top':0,'left':leftPos}).appendTo(container);
      // Set column width
      if (width)
      $(submenu).width(width);
      var subitems = $(item).data('sub').children('li');
      $.each(subitems,function(i,subitem){
        var subsubitem = $(':eq(0)',subitem).clone(true).wrapInner("<span/>").data('sub',$(subitem).children('ul')).appendTo(submenu);
        if (width)
        $(subsubitem).css({'text-overflow':'ellipsis', '-o-text-overflow':'ellipsis','-ms-text-overflow':'ellipsis'});
        if($(subsubitem).data('sub').length) {
          $(subsubitem).addClass('hasChildMenu');
          self._addWidget(subsubitem);
        }
      });
    },

    // Use canvas, if available, to draw a triangle to denote that item is a parent
    _addWidget: function(item, color) {
      var triheight = $(item).height();
      var canvas = $("<canvas></canvas>").attr({height:triheight,width:10}).addClass('widget').appendTo(item);    if(!color){ color = $(canvas).css('color'); }
      canvas = $(canvas).get(0);
      if(canvas.getContext){
        var context = canvas.getContext('2d');
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(3,(triheight/2 - 3));
        context.lineTo(10,(triheight/2));
        context.lineTo(3,(triheight/2 + 3));
        context.fill();
      } else {
        /**
         * Canvas not supported - put something in there anyway that can be
         * suppressed later if desired. We're using a decimal character here
         * representing a "black right-pointing pointer" in Windows since IE
         * is the likely case that doesn't support canvas.
         */
        $("<span>&#9658;</span>").addClass('widget').css({'height':triheight,'width':10}).prependTo(item);
      }
      $('.widget').bind('click', function(event){
        event.preventDefault();
      });
    },

    // Insert the stylesheet to the head
    _addStyle: function() {
      $('head').prepend('\
        <style type="text/css" media="screen">\
          .containerobj {\
            border: 1px solid #ccc;\
            height:5em;\
            overflow-x:auto;\
            overflow-y:hidden;\
            white-space:nowrap;\
            position:relative;\
          }\
          .containerobj div {\
            height:100%;\
            overflow-y:scroll;\
            overflow-x:hidden;\
            position:absolute;\
          }\
          .containerobj a {\
            display:block;\
            white-space:nowrap;\
            clear:both;\
            padding-right:15px;\
            overflow:hidden;\
            text-decoration:none;\
          }\
          .containerobj a:focus {\
            outline:none;\
          }\
          .containerobj .feature {\
            min-width:200px;\
            overflow-y:auto;\
          }\
          .containerobj .feature a {\
            white-space:normal;\
          }\
          .containerobj .active {\
            background-color:#3671cf;\
            color:#fff;\
          }\
          .containerobj .inpath {\
            background-color:#d0d0d0;\
            color:#000;\
          }\
          .containerobj .hasChildMenu .widget {\
            color:black;\
            position:absolute;\
            right:0;\
            text-decoration:none;\
            font-size:0.7em;\
          }\
        </style>');
    }
  });

  // Set version information
  $.extend($.cy.columnview, {
        version: "2.0"
  });
})(jQuery);










