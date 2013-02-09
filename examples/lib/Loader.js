(function(){

  // Tiny Loader Lib used for Glsl.js examples

  function makeMultiLoader (loadf) {
    return function (urls, callback) {
      if (!(urls instanceof Array)) urls = [ urls ];
      var resources = [];
      var nb = 0;
      for (var r=0; r<urls.length; ++r) (function (url, r) {
        loadf(url, function (img) {
          resources[r] = img;
          if ((++nb) == urls.length)
            callback.apply(callback, resources);
        });
      }(urls[r], r));
    }
  }

  var L = this.Loader = {
    text: function (url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState==4 && xhr.status==200) {
          callback(xhr.responseText);
        }
      }
      xhr.open("GET", url, true);
      xhr.send();
    },

    image: function (url, callback) {
      var img = new Image();
      img.onload = function () {
        callback(img)
      };
      img.src = url;
    },

    audio: function (urlPrefix, callback) {
      var audio = new Audio();
      var source;
      source = document.createElement('source');
      source.type = 'audio/mpeg';
      source.src = urlPrefix+'.mp3';
      audio.appendChild(source);
      source = document.createElement('source');
      source.type = 'audio/ogg';
      source.src = urlPrefix+'.ogg';
      audio.appendChild(source);
      audio.load();
      callback(audio); // Don't wait for audio load for now
    }
  };

  L.images = makeMultiLoader(L.image);
  L.texts = makeMultiLoader(L.text);
  L.audios = makeMultiLoader(L.audio);

}).call(this);
