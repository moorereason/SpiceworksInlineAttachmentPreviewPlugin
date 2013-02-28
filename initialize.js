/*
Attachment Image Viewer
Created by Rob Bittner:
Modified by Rob Dunn:
  Added configuration option for width
  Added auto height adjustment for correct aspect ratio
  Added hidden div for preview (instead of new tab)
  Added configuration options for width of thumbnail and larger image
  Added padding to left and bottom of image thumbnail
Version History

Modified:
1.16 - Added simple document icon for any attachments that are not images (as defined by the plugin)
       Made change to remedy DOM rendering problem until page refresh.
1.15 - Tweaked the position of the pop-up image for SW 6.0
1.14 - Changed image dimensions so it looks more at what your browser window size is.  The default setting
   you specify will be the preferred width, but if your browser window is smaller, it will adjust accordingly
 Added ESC keypress function - this will close the pop-up image
 Added drop-shadow effect
 Added code so if any image falls below the width threshold, it won't allow you to do a preview 
  (good for signatures or other small images)
 Moved image pop-up to the right side of the screen
 Added context-title with original image dimensions on thumbnail pics
1.13 - Added feature so if actual image's width is less than the inline thumbnail width, then don't offer to pop-up the larger scale image.  This will help keep smaller pics like signatures, stationary tiles, and so on in check while allowing you to pop-up actual screenshots of windows, etc.
1.12 - Modified default width value for large image to 600px instead of 200px.
1.11 RD : Initial mod release (Rob Dunn), titled:
"Pop-up inline attachment viewer"

Original:
.1 & 1.0 : Initial Release
1.1 : Added preview and new window popup for full image
1.11 : Fixed the full window creation
*/



plugin.configure({
    settingDefinitions:[
     { name:'desired_tb_width', label:'Desired thumbnail width (px)', type:'enumeration', defaultValue:'200', options:['100', '200', '300','400']},
     { name:'desired_width', label:'Desired image width (px)', type:'enumeration', defaultValue:'600', options:['600','700','800','900']}
      
    ]
});
plugin.includeStyles();

SPICEWORKS.app.helpdesk.ticket.ready(function(){
 document.onkeyup = key_event;
 
  var ticketSummary = document.getElementById("item_summary_content");
  var anchors = ticketSummary.getElementsByTagName("a");
  var attachmentRegExp = /\/tickets\/attachment/i;
  var imageRegExp = /\.(png|jpg|jpeg|gif|bmp|tif|tiff)/i;

  for(i=0; i<anchors.length; i++) {
    var anchor = anchors[i];
    //console.log(anchor.href + " " + anchor.innerHTML);
    if (attachmentRegExp.test(anchor.href) &&
        imageRegExp.test(anchor.innerHTML)){
      //console.log("processing");
      //if this really is a hyperlink with a pic, continue.
      
      var li = anchor.parentNode.parentNode.parentNode;
      li.appendChild(document.createElement("br"));
      
      //Create DIV for images
      var body = document.getElementsByTagName("body")[0];
      var odiv = document.createElement("div");
      odiv.id = "imgbox1";
      body.appendChild(odiv);
      var odiv1= document.createElement("div");
      odiv1.className="imgcontainer";
      var img = document.createElement("img");

      img.src=anchor.href;
      img.className= "drop";
      img.style.height="auto";
      img.style.textalign="center";
      img.id = "image" + i;
      //get the dimensions of the loaded image.
      var imagewidth = img.width;
      var imageheight = img.height;
      //if the page doesn't render DOM quick enough, 
      //we'll default to the thumbnail size, then size it
      //back up if things work the way they should for 
      //images that are smaller than the thumbnail preference.
      img.style.width = plugin.settings.desired_tb_width + "px";
      img.style.cursor="pointer";   
      img.style.width = plugin.settings.desired_tb_width + "px";
      img.onclick=function(){ Large(this);};
      img.title="Click for full version (original size: " + imagewidth + " x " + imageheight + ")";
         
      //let's append them via DOM
      li.appendChild(odiv1);
      odiv1.appendChild(img);
          

      //alert(imagewidth);
      //Resize the images for the thumbnail if the image is 
      //smaller than the thumbnail preference
      if (imagewidth < plugin.settings.desired_tb_width){
         img.style.cursor="normal";
         img.style.width = imagewidth;
         img.style.height = "auto";
         img.onclick=null;
         img.title="image size: " + imagewidth + " x " + imageheight;
      }
      

     }
    //if this is not a supported file, let's put a generic document
    //icon in place.
    else if (attachmentRegExp.test(anchor.href) &&
      !imageRegExp.test(anchor.innerHTML)){
      var li = anchor.parentNode.parentNode.parentNode;
      li.appendChild(document.createElement("br"));
      
      //Create DIV for images
      var body = document.getElementsByTagName("body")[0];
      var odiv = document.createElement("div");
      
      odiv.id = "imgbox1";
      body.appendChild(odiv);
      
      var odiv1= document.createElement("div");
      
      odiv1.className="imgcontainer";
    
      var img = document.createElement("img");
      img.src=plugin.contentUrl('document.png');
      //img.className= "drop";
      img.style.height="auto";
      img.style.textalign="center";
      img.id = "image" + i;
      //alert(img.src);
      li.appendChild(odiv1);
      odiv1.appendChild(img); 
    }
  }

  
  function key_event(e) {
    if (e.keyCode == 27) Out();
  }
  
function getElementLeft(elm) 
{
    var x = 0;

    //set x to elms offsetLeft
    x = elm.offsetLeft;

    //set elm to its offsetParent
    elm = elm.offsetParent;

    //use while loop to check if elm is null
    // if not then add current elms offsetLeft to x
    //offsetTop to y and set elm to its offsetParent

    while(elm != null)
    {
        x = parseInt(x) + parseInt(elm.offsetLeft);
        elm = elm.offsetParent;
    }
    return x;
}
  
function loadFailure() {
    alert("'" + this.name + "' failed to load.");
    return true;
}

                                     
function getElementTop(elm) 
{
    var y = 0;

    //set x to elms offsetLeft
    y = elm.offsetTop;

    //set elm to its offsetParent
    elm = elm.offsetParent;

    //use while loop to check if elm is null
    // if not then add current elm offsetLeft to x
    //offsetTop to y and set elm to its offsetParent

    while(elm != null)
    {
        y = parseInt(y) + parseInt(elm.offsetTop);
        elm = elm.offsetParent;
    }

    return y;
}  
  
function Large(obj)
{   
    var imgbox=document.getElementById("imgbox1");
    imgbox.style.visibility='visible';
    
    var img = document.createElement("img");
    
    img.src=obj.src;
    
    // If the client computer's screen width is smaller than
    // the preferred pop-up image width setting, then reset 
    // that preference to 300px less than the screen width.
    if(window.innerWidth < plugin.settings.desired_width){
     plugin.settings.desired_width = window.innerWidth/2; 
    }

    // resize Image that it fills the the maxImage boundaries
    //var maxImageHeight = 800; 
    var h = img.height;
    var w = img.width;
    
    // get resize factory to fit boundary
    hfactor = (window.innerHeight - 60) / h;
    wfactor = plugin.settings.desired_width / w;
    
    //alert(window.innerHeight);
    
    // take smaller one
    var factor = Math.min(hfactor, wfactor);
  
    if(img.addEventListener){
        img.addEventListener('click',Out,false);
    } else {
        img.attachEvent('onclick',Out);
    }
    //alert(plugin.settings.desired_width);
    //img.style.width=plugin.settings.desired_width + "px";
    //img.style.height='auto';
    //alert(window.innerHeight - (window.innerHeight *.3)); 
    
    img.style.width = w * factor + "px";
    img.style.height = h * factor + "px";
    img.style.cursor = "pointer";
    
    imgbox.innerHTML="<span style='font-size:120%;'>Click to close</span><br>";
    imgbox.appendChild(img);
    //imgbox.style.left=plugin.settings.desired_width/3 +'px';
    //imgbox.style.top=imgwidth/3 + 'px';
}

function Out()
{
    document.getElementById("imgbox1").style.visibility='hidden';
}


  
});
