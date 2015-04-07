// Name:        Inline Audio Preview
// Author:      Cameron Moore (Based on plugin by: Rob Dunn)
// Description: A plugin to preview audio attachments inline in a helpdesk ticket.
// Version:     1.0
// Website:     https://github.com/moorereason/SpiceworksInlineAttachmentPreviewPlugin

plugin.configure({
  settingDefinitions: [
    {
      name: 'max_tb_width',
      label: 'Max thumbnail width',
      type: 'enumeration',
      defaultValue: '200',
      options: ['100', '200', '300', '400'],
      example: 'pixels'
    },
	{
      name: 'audio_pref',
      label: 'Audio Preference',
      type: 'enumeration',
      defaultValue: 'HTML5',
      options: ['Flash', 'HTML5'],
      example: 'Flash option requires additional steps.'
    }
  ]
});
plugin.includeStyles();

(function ($) {
  // Original source: https://gist.github.com/buu700/4200601
  //
  // @function
  // @property {object} jQuery plugin which runs handler function once specified element is inserted into the DOM
  // @param {function} handler A function to execute at the time when the element is inserted
  // @param {bool} shouldRunHandlerOnce Optional: if true, handler is unbound after its first invocation
  // @example $(selector).waitUntilExists(function);
  $.fn.iapWaitUntilExists  = function (handler, shouldRunHandlerOnce, isChild) {
    var found  = 'found';
    var $this  = $(this.selector);
    var $elements  = $this.not(function () { return $(this).data(found); }).each(handler).data(found, true);

    if (!isChild) {
      (window.iapWaitUntilExists_Intervals = window.iapWaitUntilExists_Intervals || {})[this.selector] =
        window.setInterval(function () { $this.iapWaitUntilExists(handler, shouldRunHandlerOnce, true); }, 500);
    } else if (shouldRunHandlerOnce && $elements.length) {
      window.clearInterval(window.iapWaitUntilExists_Intervals[this.selector]);
    }
    return $this;
  }
}(jQuery));


(function(){

  var iapHelper = {},
    DEBUG = true;

  // iapLoadScript attempts to load a javascript file from a URL.
  function iapLoadScript(url) {
    var script;
    if ($$('head')[0] !== null) {
      script = new Element('script', { type: 'text/javascript', src: url });
      $$('head')[0].appendChild(script);

      new PeriodicalExecuter(function (pe) {
        if (typeof swfobject === 'undefined') {
          pe.stop();
        }
      }, 0.25);
    }
  }

  // iapGetTarget finds a node to append the preview div to.
  function iapGetPreviewTargetFromAnchor(a) {
    var target;

    target = a.parentNode.parentNode.parentNode.select('div.body-wrapper');

    return (target.length > 0) ? target[0] : null;
  }
  
  // iapAudioHandler processes an audio attachment
  function iapAudioHandler(anchor, num) {
    var comment, previewDiv, audio, object, ext,
      height = 32;

    if (DEBUG) { console.log('AUDIO: ' + anchor.href + '|' + anchor.innerHTML); }

    comment = iapGetPreviewTargetFromAnchor(anchor);
    if (comment == null) {
      console.log('comment == null');
      return;
    }

    // See if we've already created a preview div
    if (comment.select('div.iapAudioPreview').length > 0) {
      console.log('iapAudioPreview already exists.');
      return;
    }

    // create new preview div
    previewDiv = Builder.node('div', {className: 'iapAudioPreview', style: 'padding:10px 0 10px 0;'});
    comment.appendChild(previewDiv);

    // Find audio file extension
    ext = anchor.innerHTML.match(/(\.[\w]+)$/)[0];

	console.log('ext = ' + ext)
    if (plugin.settings.audio_pref === 'HTML5') {
      audio = new Audio();
      audio.controls = true;
      audio.src = anchor.href;
      previewDiv.appendChild(audio);
    } else {
      // IE is a pain.  Let's jump through hoops to at least get IE9 working.
      if (Prototype.Browser.IE) {
        previewDiv.innerHTML = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ' +
          'width="' + plugin.settings.max_tb_width + '" height="' + height + '" id="iapAudio' + num + '" ' +
          'align="middle"><param name="movie" value="/flash/wavplayer.swf"/><param name="flashvars" value="' +
          'gui=full&button_color=#eeeeee&h=' + height + '&w=' + plugin.settings.max_tb_width +
          '&sound=' + anchor.href + '%3F' + ext + '"/></object>';
      } else {
        object = Builder.node('object', {type: 'application/x-shockwave-flash',
          data:  '/flash/wavplayer.swf',
          width:  plugin.settings.max_tb_width,
          height:  height,
          align:  'middle',
          id:    'iapAudio' + num}, [
            Builder.node('param', {
              name: 'flashvars',
              value: 'gui=full&button_color=#eeeeee&h=' + height + '&w=' + plugin.settings.max_tb_width + '&sound=' + anchor.href + '%3F' + ext
            })
          ]);
        previewDiv.appendChild(object);
      }
    }
  }

  // iapMain is the main loop.
  function iapMain() {
    var attachmentSubstring, audioRegExp,
      anchors, i, exts;

    attachmentSubstring = '/tickets/attachment/';

    if (DEBUG) { console.log('---- IAP: iapMain()'); }

    if (plugin.settings.audio_pref === 'Flash') {
      // Load swfobject to detect flash
      iapLoadScript(plugin.contentUrl('swfobject.js'));
      iapHelper.Flash = (swfobject.getFlashPlayerVersion().major > 0);

      if (iapHelper.Flash) {
        audioRegExp = /\.(au|raw|sln(\d{1,3})?|al(aw)?|ul(aw)?|pcm|mu|la|lu|gsm|mp3|wave?)$/i;
      } else {
        if (DEBUG) { console.log('---- iapHelper.Flash was FALSE'); }
        audioRegExp = /\.$/;
      }
    } else if (plugin.settings.audio_pref === 'HTML5') {
      // Sigh.  Different browsers support different codecs for HTML5 Audio.
      iapHelper.Audio = (function () {
        var bool = false,
          audio = Builder.node('audio');

        try {
          bool = !!audio.canPlayType;
          if (bool) {
            bool = new Boolean(bool);

            bool.ogg = (audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '') !== '');
            bool.mp3 = (audio.canPlayType('audio/mpeg;').replace(/^no$/, '') !== '');
            bool.wav = (audio.canPlayType('audio/wav; codecs="1"').replace(/^no$/, '') !== '');
            bool.aac = ((audio.canPlayType('audio/x-m4a;') || audio.canPlayType('audio/aac;') || audio.canPlayType('audio/mp4;')).replace(/^no$/, '') !== '');
            bool.webm = (audio.canPlayType('audio/webm').replace(/^no$/, '') !== '');
          } else {
            if (DEBUG) { console.log('---- Audio support not detected'); }
          }
        } catch (e) { }

        return bool;
      }());

      // If we don't support HTML5 Audio, bail out
      if (iapHelper.Audio) {
        // Build our regex pattern based on browser capabilities
        exts = [];
        if (iapHelper.Audio.ogg) { exts.push('ogg', 'oga'); }
        if (iapHelper.Audio.mp3) { exts.push('mp3'); }
        if (iapHelper.Audio.wav) { exts.push('wav'); }
        if (iapHelper.Audio.aac) { exts.push('m4a', 'aac'); }
        if (iapHelper.Audio.aac) { exts.push('webma'); }

        audioRegExp = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
        if (DEBUG) { console.log('AUDIO REGEX: ' + '\\.(' + exts.join('|') + ')$'); }
      } else {
        if (DEBUG) { console.log('---- iapHelper.Audio was FALSE'); }
        audioRegExp = /\.$/;
      }
    } else {
      if (DEBUG) { console.log('---- Audio support broken'); }
      return;
    }

    anchors = $$('a.dl-link');

    for (i = 0; i < anchors.length; i += 1) {
      if (DEBUG) { console.log('ANCHOR: ' + anchors[i].href + '|' + anchors[i].innerHTML); }

      if (anchors[i].href.indexOf(attachmentSubstring) === -1) {
        continue;
      }

      if (!audioRegExp.test(anchors[i].innerHTML)) {
		continue;
	  }
	  
      if (plugin.settings.audio_pref === 'HTML5' && iapHelper.Audio) {
        iapAudioHandler(anchors[i], i);
      } else if (plugin.settings.audio_pref === 'Flash' && iapHelper.Flash) {
        iapAudioHandler(anchors[i], i);
      }
	}
  }

  $UI.app.pluginEventBus.on('app:helpdesk:ticket:show', function(){
    jQuery('div.activity-item').iapWaitUntilExists(iapMain);
  });
  $UI.app.pluginEventBus.on('app:helpdesk:ticket:comment:show', function(ticket) {
    jQuery('div.activity-item').iapWaitUntilExists(iapMain);
  });
})()
