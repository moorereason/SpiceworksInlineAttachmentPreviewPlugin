// Name:		Inline Attachment Preview
// Author:		Cameron Moore (Based on plugin by: Rob Dunn)
// Description:	A plugin to preview image and audio attachments inline in a helpdesk ticket.
// Version:		0.7
// Website:		https://github.com/moorereason/SpiceworksInlineAttachmentPreviewPlugin

plugin.includeStyles();
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
			name: 'max_viewer_width',
			label: 'Max viewer width',
			type: 'enumeration',
			defaultValue: '600',
			options: ['600', '700', '800', '900'],
			example: 'pixels'
		},
		{
			name: 'audio_pref',
			label: 'Audio Preference',
			type: 'enumeration',
			defaultValue: 'Disabled',
			options: ['Flash', 'HTML5', 'Disabled'],
			example: 'Flash option requires additional steps.'
		}
	]
});

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

SPICEWORKS.app.helpdesk.ticket.ready(function () {
	var iapHelper = {},
		DEBUG = true;


	///
	/// Close the viewer
	///
	function iapCloseViewer(obj) {
		obj.parentNode.style.visibility = 'hidden';
	}

	///
	/// Hide all iapViewer divs
	///
	function iapHideViewers() {
		var divs, i;

		divs = document.getElementsByClassName('iapViewer');

		for (i = 0; i < divs.length; i += 1) {
			divs[i].style.visibility = 'hidden';
		}
	}

	///
	/// Show Image Viewer
	///
	function iapShowViewer(obj) {
		var num, div, img, span, br, width, factor;

		// Hide any visible viewers
		iapHideViewers();

		// Find the matching viewer div for this img
		num = obj.id.replace(/\D*(\d+)$/, '$1');

		div = document.getElementById('iapViewer' + num);

		// If the div is empty, create a span and img;
		// otherwise, just leave it alone
		if (div.innerHTML.blank()) {
			// Create a box at the top of the viewer
			div.appendChild(Builder.node('span', {}, 'Click to close'));
			div.appendChild(Builder.node('br'));

			// Since we're linking to an image that should
			// already be loaded in the DOM, we'll bypass
			// using the onLoad stuff
			img = document.createElement('img');
			img.src = obj.src;

			// If the client computer's screen width is smaller than
			// the preferred pop-up image width setting, then reset
			// that preference half the screen width.
			if (document.viewport.getWidth() < plugin.settings.max_viewer_width) {
				width = document.viewport.getWidth() / 2;
			} else {
				width = plugin.settings.max_viewer_width;
			}

			// take smaller one
			factor = Math.min((document.viewport.getHeight() - 60) / img.height, width / img.width);

			img.style.width = img.width * factor + 'px';
			img.style.height = img.height * factor + 'px';
			img.style.cursor = 'pointer';
			img.onclick = function () { iapCloseViewer(this); };

			div.appendChild(img);
		}

		div.style.visibility = 'visible';
	}

	///
	/// Set image dimensions upon load
	///
	function iapFinishThumbImg() {
		if (DEBUG) { console.log('IMAGE LOADED: ' + this.id); }

		this.className = 'iapDrop';

		// If the image is small, we don't need to setup for the viewer
		if (this.width <= plugin.settings.max_tb_width) {
			this.style.width = this.width;
		} else {
			this.style.cursor = 'pointer';
			this.title = 'Click for full version (original size: ' + this.width + ' x ' + this.height + ')';
			this.onclick = function () { iapShowViewer(this); };
			// Prototype 1.6 observe() doesn't work here in IE9
			//this.observe('click', iapShowViewer);
			this.style.width = plugin.settings.max_tb_width + 'px';
		}
		this.style.visibility = 'visible';
	}

	///
	/// Process an image attachment
	///
	function iapImageHandler(anchor, num) {
		var body, viewerDiv, comment, previewDiv, img;

		if (DEBUG) { console.log('IMAGE: ' + anchor.href + '|' + anchor.innerHTML); }

		// Get the list item of the current comment
		comment = anchor.parentNode.parentNode.parentNode;

		// Create viewer div
		body = document.getElementsByTagName('body')[0];
		viewerDiv = document.createElement('div');
		viewerDiv.id = 'iapViewer' + num;
		viewerDiv.className = 'iapViewer';
		body.appendChild(viewerDiv);

		// Create preview div
		previewDiv = document.createElement('div');
		previewDiv.className = 'iapImgContainer';

		// Build the img tag
		img = document.createElement('img');
		img.id = 'iapImg' + num;
		// Hide until it's loaded
		img.style.visibility = 'hidden';

		// We need the image to load into the DOM before
		// we can know its dimensions, so we'll use an
		// onLoad function to finish things up.
		// NOTE: IE needs onload() set before the src.
		img.onload = iapFinishThumbImg;
		img.src = anchor.href;

		// let's append them via DOM
		comment.appendChild(previewDiv);
		previewDiv.appendChild(img);
	}

	///
	/// Process an audio attachment
	///
	function iapAudioHandler(anchor, num) {
		var comment, previewDiv, audio, object, param, ext,
			height = 32;

		if (DEBUG) { console.log('AUDIO: ' + anchor.href + '|' + anchor.innerHTML); }

		// Get the list item of the current comment
		comment = anchor.parentNode.parentNode.parentNode;

		previewDiv = document.createElement('div');
		previewDiv.className = 'iapAudioPreview';
		comment.appendChild(previewDiv);

		// Find audio file extension
		ext = anchor.innerHTML.match(/(\.[\w]+)$/)[0];

		if (plugin.settings.audio_pref === 'HTML5') {
			audio = new Audio();
			audio.controls = true;
			audio.src = anchor.href;
			previewDiv.appendChild(audio);
		} else {
			// IE is a pain.	Let's jump through hoops to at least get IE9 working.
			if (Prototype.Browser.IE) {
				previewDiv.innerHTML = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ' +
					'width="' + plugin.settings.max_tb_width + '" height="' + height + '" id="iapAudio' + num + '" ' +
					'align="middle"><param name="movie" value="/test/wavplayer.swf"/><param name="flashvars" value="' +
					'gui=full&button_color=#000000&h=' + height + '&w=' + plugin.settings.max_tb_width +
					'&sound=' + anchor.href + '%3F' + ext + '"/></object>';
			} else {
				object = document.createElement('object');
				object.type = 'application/x-shockwave-flash';
				// We're not allowed to upload flash content into a plugin content store.
				// Until that's available, we have to copy the flash content onto the
				// server ($SPICEWORKS_HOME\pkg\gems\spiceworks_public-*\flash).
				//object.data = plugin.contentUrl('/flash/wavplayer.swf');
				object.data = '/flash/wavplayer.swf';
				object.width = plugin.settings.max_tb_width;
				object.height = height;
				object.align = 'middle';
				object.id = 'iapAudio' + num;
				previewDiv.appendChild(object);

				param = document.createElement('param');
				param.name = 'flashvars';
				param.value = 'gui=full&button_color=#eeeeee&h=' + object.height + '&w=' + object.width + '&sound=' + anchor.href + '%3F' + ext;
				object.appendChild(param);
			}
		}
	}

	///
	/// Process unknown attachment; just insert an generic icon
	///
	function iapOtherHandler(anchor, num) {
		var comment, previewDiv, img;

		comment = anchor.parentNode.parentNode.parentNode;

		previewDiv = document.createElement('div');
		previewDiv.className = 'iapImgContainer';

		img = document.createElement('img');
		img.src = plugin.contentUrl('document.png');

		previewDiv.appendChild(img);
		comment.appendChild(previewDiv);
	}

	///
	/// Main loop
	///
	function iapMain() {
		var attachmentRegExp, imageRegExp, audioRegExp,
			anchors, i, exts;

		attachmentRegExp = /\/tickets\/attachment/i;

		// Only IE & Safari support TIFF as of Feb 2013, but Prototype can't
		// differentiate between Webkit browsers, so I'm not about to try.
		if (Prototype.Browser.IE) {
			imageRegExp = /\.(png|jpe?g|gif|bmp|tiff?)/i;
		} else {
			imageRegExp = /\.(png|jpe?g|gif|bmp)/i;
		}

		if (plugin.settings.audio_pref === 'Flash') {
			// Load swfobject to detect flash
			iapLoadScript(plugin.contentUrl('swfobject.js'));
			iapHelper.Flash = (swfobject.getFlashPlayerVersion().major > 0);

			if (iapHelper.Flash) {
				audioRegExp = /\.(au|raw|sln(\d{1,3})?|al(aw)?|ul(aw)?|pcm|mu|la|lu|gsm|mp3|wave?)$/i;
			} else {
				audioRegExp = /\.$/;
			}
		} else if (plugin.settings.audio_pref === 'HTML5') {
			// Sigh.  Different browsers support different codecs for HTML5 Audio.
			iapHelper.Audio = (function () {
				var bool = false,
					audio = document.createElement('audio');

				try {
					bool = !!audio.canPlayType;
					if (bool) {
						bool = new Boolean(bool);

						bool.ogg = (audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '') !== '');
						bool.mp3 = (audio.canPlayType('audio/mpeg;').replace(/^no$/, '') !== '');
						bool.wav = (audio.canPlayType('audio/wav; codecs="1"').replace(/^no$/, '') !== '');
						bool.aac = ((audio.canPlayType('audio/x-m4a;') || audio.canPlayType('audio/aac;') || audio.canPlay('audio/mp4;')).replace(/^no$/, '') !== '');
						bool.webm = (audio.canPlayType('audio/webm').replace(/^no$/, '') !== '');
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
				audioRegExp = /\.$/;
			}
		}

		anchors = document.getElementById('item_summary_content').getElementsByTagName('a');

		for (i = 0; i < anchors.length; i += 1) {

			if (DEBUG) { console.log('ANCHOR: ' + anchors[i].href + '|' + anchors[i].innerHTML); }

			if (attachmentRegExp.test(anchors[i].href) && imageRegExp.test(anchors[i].innerHTML)) {
				iapImageHandler(anchors[i], i);
			} else if (attachmentRegExp.test(anchors[i].href) && audioRegExp.test(anchors[i].innerHTML)	&& plugin.settings.audio_pref !== 'Disabled') {

				// if we're using HTML, make sure
				if (plugin.settings.audio_pref === 'HTML5') {
					if (iapHelper.Audio) {
						iapAudioHandler(anchors[i], i);
					}
				} else if (plugin.settings.audio_pref === 'Flash') {
					if (iapHelper.Flash) {
						iapAudioHandler(anchors[i], i);
					}
				}

			} else if (attachmentRegExp.test(anchors[i].href) && !imageRegExp.test(anchors[i].innerHTML)) {
				iapOtherHandler(anchors[i], i);
			}
		}
	}

	iapMain();
});
