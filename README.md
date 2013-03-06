Inline Attachment Preview Plugin for Spiceworks
===============================================

Overview
--------
A plugin to preview image and audio attachments inline in a helpdesk ticket.
To play audio files, the plugin gives you the option of using a Flash player
or the built-in HTML5 player in your browser.

The Flash player is ideal for telephony voicemail systems because of the
numerous audio codecs it supports (for example: wav, au, gsm, alaw, ulaw, la,
lu, sln). However, the Flash player requires additional steps to install since
Spiceworks doesn't allow plugins to contain flash content inside the plugin
packaging.  See *Installing Flash WavPlayer* below for details.

The HTML5 player uses the built-in audio player in the browser, but different
browsers support different audio codecs.

Requirements
------------
* [Spiceworks](http://www.spiceworks.com)
* [WavPlayer](https://github.com/francois2metz/WavPlayer) (for Flash option)

Installing Flash WavPlayer
--------------------------
The WavPlayer SWF file must be placed in the following Spiceworks installation
folder:  $SPICEWORKS/pkg/gems/spiceworks_public-*/flash.

Credits
-------
Rob Dunn's great "Pop-up inline attachment viewer" plugin was used as a
starting point for this project.