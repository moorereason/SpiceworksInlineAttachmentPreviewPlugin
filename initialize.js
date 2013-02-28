/*
Inline Attachment Preview
Created by Cameron Moore.
Based on the "Pop-up inline attachment viewer" by Rob Dunn.

https://github.com/moorereason/SpiceworksInlineAttachmentPreviewPlugin
*/

plugin.includeStyles();
plugin.configure({
  settingDefinitions:[
    { name:'desired_tb_width', label:'Desired thumbnail width (px)', type:'enumeration', defaultValue:'200', options:['100', '200', '300','400']},
    { name:'desired_width', label:'Desired image width (px)', type:'enumeration', defaultValue:'600', options:['600','700','800','900']},
    { name:'disable_audio', label:'Disable Audio Player', type:'checkbox', defaultValue: false }
  ]
});


SPICEWORKS.app.helpdesk.ticket.ready(function(){
  var DEBUG = true;

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
  function iapShowViewer(obj){
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
      span = document.createElement('span');
      span.style.fontSize = '120%';
      span.innerHTML = 'Click to close';
      div.appendChild(span);

      br = document.createElement('br');
      div.appendChild(br);

      // Since we're linking to an image that should
      // already be loaded in the DOM, we'll bypass
      // using the onLoad stuff
      img = document.createElement('img');
      img.src = obj.src;

      // If the client computer's screen width is smaller than
      // the preferred pop-up image width setting, then reset
      // that preference half the screen width.
      if (document.viewport.getWidth() < plugin.settings.desired_width){
        width = document.viewport.getWidth() / 2;
      } else {
        width = plugin.settings.desired_width;
      }

      // take smaller one
      factor = Math.min((document.viewport.getHeight() - 60) / img.height,
                        width / img.width);

      img.style.width = img.width * factor + 'px';
      img.style.height = img.height * factor + 'px';
      img.style.cursor = 'pointer';
      img.onclick = function(){ iapCloseViewer(this); };

      div.appendChild(img);
    }

    div.style.visibility = 'visible';
  }

  ///
  /// Set image dimensions upon load
  ///
  function iapFinishThumbImg(){
    if (DEBUG) { console.log('IMAGE LOADED: ' + this.id); }

    this.className = 'iapDrop';
    this.style.textalign = 'center';

    // If the image is small, we don't need to setup for the viewer
    if (this.width <= plugin.settings.desired_tb_width){
      this.style.width = this.width;
    } else {
      this.style.cursor = 'pointer';
      this.title = 'Click for full version (original size: ' + this.width + ' x ' + this.height + ')';
      this.onclick = function(){ iapShowViewer(this); };
      // Prototype 1.6 observe() doesn't work here in IE9
      //this.observe('click', iapShowViewer);
      this.style.width = plugin.settings.desired_tb_width + 'px';
    }
    this.style.visibility = 'visible';
  }

  ///
  /// Process an image attachment
  ///
  function iapImageHandler(anchor, num){
    var body, viewerDiv, comment, previewDiv, img;

    if (DEBUG){ console.log('IMAGE: ' + anchor.href + '|' + anchor.innerHTML); }

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
  function iapAudioHandler(anchor, num){
    var comment, previewDiv, object, param, ext, isMSIE;

    if (DEBUG){ console.log('AUDIO: ' + anchor.href + '|' + anchor.innerHTML); }

    // Get the list item of the current comment
    comment = anchor.parentNode.parentNode.parentNode;

    previewDiv = document.createElement('div');
    previewDiv.className = 'iapAudioPreview';
    comment.appendChild(previewDiv);

    // Find audio file extension
    ext = anchor.innerHTML.replace(/.*(\.[\w]+)$/, "$1");

    // IE is a pain.  Let's jump through hoops to at least get IE9 working.
    if (Prototype.Browser.IE) {
      previewDiv.innerHTML = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" '+
        'width="' + plugin.settings.desired_tb_width + '" height="30" id="iapAudio' + num +'" ' +
        'align="middle"><param name="movie" value="/test/wavplayer.swf"/><param name="flashvars" value="' +
        'gui=full&button_color=#000000&h=30&w=' + plugin.settings.desired_tb_width +
        '&sound=' + anchor.href + '%3F' + ext + '"/></object>';
    } else {
      object = document.createElement('object');
      object.type = 'application/x-shockwave-flash';
      // We're not allowed to upload flash content into a plugin content store.
      // Until that's available, we have to copy the flash content onto the
      // server ($SPICEWORKS_HOME\pkg\gems\spiceworks_public-*\flash).
      //object.data = plugin.contentUrl('/flash/wavplayer.swf');
      object.data = '/flash/wavplayer.swf';
      object.width = plugin.settings.desired_tb_width;
      object.height = '30';
      object.align = 'middle';
      object.id = 'iapAudio' + num;
      previewDiv.appendChild(object);

      param = document.createElement('param');
      param.name = 'flashvars';
      param.value = 'gui=full&button_color=#000000&h=' + object.height + '&w=' + object.width + '&sound=' + anchor.href + '%3F' + ext;
      object.appendChild(param);
    }
  }

  ///
  /// Process unknown attachment; just insert an generic icon
  ///
  function iapOtherHandler(anchor, num){
    var comment, previewDiv, img;

    comment = anchor.parentNode.parentNode.parentNode;

    previewDiv = document.createElement('div');
    previewDiv.className = 'iapImgContainer';

    img = document.createElement('img');
    img.src = plugin.contentUrl('document.png');
    img.style.height = 'auto';
    img.style.textalign = 'center';
    img.id = 'iapDoc' + num;

    previewDiv.appendChild(img);
    comment.appendChild(previewDiv);
  }

  ///
  /// Main loop
  ///
  function iapMain(){
    var attachmentRegExp, imageRegExp, audioRegExp,
      anchors, i, DEBUG;

    attachmentRegExp = /\/tickets\/attachment/i;
    audioRegExp = /\.(au|raw|sln(\d{1,3})?|al(aw)?|ul(aw)?|pcm|mu|la|lu|gsm|mp3|wave?)/i;

    // Only IE & Safari support TIFF
    if (Prototype.Browser.IE || Prototype.Browser.WebKit) {
      imageRegExp = /\.(png|jpe?g|gif|bmp|tiff?)/i;
    } else {
      imageRegExp = /\.(png|jpe?g|gif|bmp)/i;
    }

    anchors = document.getElementById('item_summary_content').getElementsByTagName('a');

    for (i = 0; i < anchors.length; i += 1) {

      if (DEBUG){ console.log('ANCHOR: ' + anchors[i].href + '|' + anchors[i].innerHTML); }

      if (attachmentRegExp.test(anchors[i].href) && imageRegExp.test(anchors[i].innerHTML)){
        iapImageHandler(anchors[i], i);
      } else if (attachmentRegExp.test(anchors[i].href) && audioRegExp.test(anchors[i].innerHTML) && !plugin.settings.disable_audio) {
        iapAudioHandler(anchors[i], i);
      } else if (attachmentRegExp.test(anchors[i].href) && !imageRegExp.test(anchors[i].innerHTML)){
        iapOtherHandler(anchors[i], i);
      }
    }
  }

  iapMain();
});