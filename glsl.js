/*!
Copyright 2013 @greweb
http://github.com/gre/glsl.js

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function (definition) {
  if (typeof exports === "object") {
    module.exports = definition();
  }
  else if (typeof define === "function" && define.amd) {
    define(definition);
  }
  else {
    window.Glsl = definition();
  }
})(function () {

  var requiredOptions = ["fragment", "canvas", "variables"];

  var typesSuffixMap = {
    "bool": "1i",
    "int": "1i",
    "float": "1f",
    "vec2": "2f",
    "ivec2": "2i",
    "bvec2": "2b",
    "vec3": "3f",
    "ivec3": "3i",
    "bvec3": "3b",
    "vec4": "4f",
    "ivec4": "4i",
    "bvec4": "4b",
    "mat2": "Matrix2fv",
    "mat3": "Matrix3fv",
    "mat4": "Matrix4fv"
  };

  var rUniform = /uniform\s+([a-z]+\s+)?([A-Za-z0-9]+)\s+([a-zA-Z_0-9]+)\s*(\[\s*(.+)\s*\])?/;
  var rStruct = /struct\s+\w+\s*{[^}]+}\s*;/g;
  var rStructExtract = /struct\s+(\w+)\s*{([^}]+)}\s*;/;
  var rStructFields = /[^;]+;/g;
  var rStructField = /\s*([a-z]+\s+)?([A-Za-z0-9]+)\s+([a-zA-Z_0-9]+)\s*(\[\s*(.+)\s*\])?\s*;/;
  var rDefine = /#define\s+([a-zA-Z_0-9]+)\s+(.*)/;

  var Lprefix = "Glsl: ";
  function log (msg) {
    console.log && console.log(Lprefix+msg);
  }
  function warn (msg) {
    if (console.warn) console.warn(Lprefix+msg);
    else log("WARN "+msg);
  }
  function error (msg) {
    if (console.error) console.error(Lprefix+msg);
    else log("ERR "+msg);
  }

  var genid = (function (i) { return function () { return ++i; } })(0);

  function isArray (a) {
    return 'length' in a; // duck typing
  }

  /** 
   * Creates a new Glsl.
   * init(), update() and render() are called When GL is ready.
   * 
   * @param options
   * @param {HTMLCanvasElement} options.canvas The Canvas to render.
   * @param {String} options.fragment The fragment shader source code.
   * @param {Object} options.variables The variables map (initial values).
   * @param {Function} [options.update] The update function to call each frame. (the relative time from the start() and the time since the last update) in milliseconds is given to the function.
   * @param {Function} [options.init] Call once when GL is initialized.
   * @param {Function} [options.ready] Call after the first render has been achieved.
   * @param {Object} [options.contextArgs] Specify WebGLContextAttributes.  See http://www.khronos.org/registry/webgl/specs/latest/#5.2
   *
   * @namespace
   */
  var Glsl = function (options) {
    if ( !(this instanceof arguments.callee) ) return new arguments.callee(options);
    if (!options) throw new Error("Glsl: {"+requiredOptions+"} are required.");
    for (var i=0; i<requiredOptions.length; i++)  
      if (!(requiredOptions[i] in options)) 
        throw new Error("Glsl: '"+requiredOptions[i]+"' is required.");

    this.canvas = options.canvas;
    this.variables = options.variables; // Variable references
    this.init = options.init || function(t){};
    this.update = options.update || function(t){};
    this.ready = options.ready || function(t){};

    this.prog = new Glsl.Program ('attribute vec2 position; void main() { gl_Position = vec4(2.0*position-1.0, 0.0, 1.0);}', options.fragment);
    this.defines = this.prog.defines;
    
    if (!this.prog.uniformTypes.resolution) throw new Error("Glsl: You must use a 'vec2 resolution' in your shader.");

    for (var key in this.prog.uniformTypes) {
      if (!(key in this.variables) && key!="resolution") {
        warn("variable '"+key+"' not initialized");
      }
    }

    this.initGL(options.contextArgs);
    this.load();
    this.syncAll();
    this.init();
    this.update(0, 0);
    this.render();
    this.ready();
  };

  /**
   * Checks if WebGL is supported by the browser.
   * @type boolean
   * @public
   */
  Glsl.supported = function () {
    return !!getWebGLContext(document.createElement("canvas"));
  };

  /**
   * A WebGL program with shaders and variables.
   * @param {String} vertex The vertex shader source code.
   * @param {String} fragment The fragment shader source code.
   * @public
   */
  Glsl.Program = function (vertex, fragment) {
    this.gl = null;
    this.vertex = vertex;
    this.fragment = fragment;
    
    var src = vertex + '\n' + fragment;
    this.parseDefines(src);
    this.parseStructs(src);
    this.parseUniforms(src);
  };

  Glsl.Program.prototype = {
      
    /**
     * A map containing all the #define declarations of the GLSL.
     *
     * You can use it to synchronize some constants between GLSL and Javascript (like an array capacity).
     * @public
     */
    defines: null,

    /** 
     * Synchronize a variable from the Javascript into the GLSL.
     * @param {String} name variable name to synchronize.
     * @param {String} value variable value.
     * @public
     */
    syncVariable: function (name, value) {
      this.recSyncVariable(name, value, this.uniformTypes[name],  name);
    },

    // ~~~ Going Private Now

    parseDefines: function (src) {
      this.defines = {};
      var lines = src.split("\n");
      for (var l=0; l<lines.length; ++l) {
        var matches = lines[l].match(rDefine);
        if (matches && matches.length==3) {
          var dname = matches[1],
              dvalue = matches[2];
          this.defines[dname] = dvalue;
        }
      }
    },

    parseStructs: function (src) {
      this.structTypes = {};
      var structs = src.match(rStruct);
      if (!structs) return;
      for (var s=0; s<structs.length; ++s) {
        var struct = structs[s];
        var structExtract = struct.match(rStructExtract);
        var structName = structExtract[1];
        var structBody = structExtract[2];
        var fields = structBody.match(rStructFields);
        var structType = {};
        for (var f=0; f<fields.length; ++f) {
          var field = fields[f];
          var matches = field.match(rStructField);
          var nativeType = matches[2],
              vname = matches[3],
              arrayLength = matches[4];
          var type = typesSuffixMap[nativeType] || nativeType;
          if (arrayLength) {
            if (arrayLength in this.defines) arrayLength = this.defines[arrayLength];
            type = [type, parseInt(arrayLength, 10)];
          }
          structType[vname] = type;
        }
        this.structTypes[structName] = structType;
      }
    },

    parseUniforms: function (src) {
      this.uniformTypes = {};
      var lines = src.split("\n");
      for (var l=0; l<lines.length; ++l) {
        var line = lines[l];
        var matches = line.match(rUniform);
        if (matches) {
          var nativeType = matches[2],
              vname = matches[3],
              arrayLength = matches[5];
          var type = typesSuffixMap[nativeType] || nativeType;
          if (arrayLength) {
            if (arrayLength in this.defines) arrayLength = this.defines[arrayLength];
            type = [type, parseInt(arrayLength, 10)];
          }
          this.uniformTypes[vname] = type;
        }
      }
    },

    recSyncVariable: function (name, value, type, varpath) {
      var gl = this.gl;
      if (!type) {
        warn("variable '"+name+"' not found in your GLSL.");
        return;
      }
      var arrayType = type instanceof Array;
      var arrayLength;
      if (arrayType) {
        arrayLength = type[1];
        type = type[0];
      }
      var loc = this.locations[varpath];
      if (type in this.structTypes) {
        var structType = this.structTypes[type];
        if (arrayType) {
          for (var i=0; i<arrayLength && i<value.length; ++i) {
            var pref = varpath+"["+i+"].";
            var v = value[i];
            for (var field in structType) {
              if (!(field in v)) {
                warn("variable '"+varpath+"["+i+"]' ("+type+") has no field '"+field+"'");
                break;
              }
              var fieldType = structType[field];
              this.recSyncVariable(field, v[field], fieldType, pref+field);
            }
          }
        }
        else {
          var pref = varpath+".";
          for (var field in structType) {
            if (!(field in value)) {
              warn("variable '"+varpath+"' ("+type+") has no field '"+field+"'");
              break;
            }
            var fieldType = structType[field];
            this.recSyncVariable(field, value[field], fieldType, pref+field);
          }
        }
      }
      else {
        var t = type;
        if (arrayType) t += "v";
        var fn = "uniform"+t;
        switch (t) {
          case "2f":
          case "2i":
            if (isArray(value))
              gl[fn].call(gl, loc, value[0], value[1]);
            else if ('x' in value && 'y' in value)
              gl[fn].call(gl, loc, value.x, value.y);
            else if ('s' in value && 't' in value)
              gl[fn].call(gl, loc, value.s, value.t);
            else
              error("variable '"+varpath+"' is not valid for binding to vec2(). Use an Array, a {x,y} or a {s,t}.");
            break;

          case "3f":
          case "3i":
            if (isArray(value))
              gl[fn].call(gl, loc, value[0], value[1], value[2]);
            else if ('x' in value && 'y' in value && 'z' in value)
              gl[fn].call(gl, loc, value.x, value.y, value.z);
            else if ('s' in value && 't' in value && 'p' in value)
              gl[fn].call(gl, loc, value.s, value.t, value.p);
            else if ('r' in value && 'g' in value && 'b' in value)
              gl[fn].call(gl, loc, value.r, value.g, value.b);
            else
              error("variable '"+varpath+"' is not valid for binding to vec3(). Use an Array, a {x,y,z}, a {r,g,b} or a {s,t,p}.");
            break;

          case "4f":
          case "4i":
            if (isArray(value))
              gl[fn].call(gl, loc, value[0], value[1], value[2], value[3]);
            else if ('x' in value && 'y' in value && 'z' in value && 'w' in value)
              gl[fn].call(gl, loc, value.x, value.y, value.z, value.w);
            else if ('s' in value && 't' in value && 'p' in value && 'q' in value)
              gl[fn].call(gl, loc, value.s, value.t, value.p, value.q);
            else if ('r' in value && 'g' in value && 'b' in value && 'a' in value)
              gl[fn].call(gl, loc, value.r, value.g, value.b, value.a);
            else
              error("variable '"+varpath+"' is not valid for binding to vec4(). Use an Array, a {x,y,z,w}, a {r,g,b,a} or a {s,t,p,q}.");
            break;

          case "sampler2D": 
            this.syncTexture(gl, loc, value, varpath); 
            break;

          default:
            if (fn in gl)
              gl[fn].call(gl, loc, value); // works for simple types and arrays
            else
              error("type '"+type+"' not found.");
            break;
        }
      }
    },

    syncTexture: function (gl, loc, value, id) {
      var textureUnit = this.textureUnitForNames[id];
      if (!textureUnit) {
        textureUnit = this.allocTexture(id);
      }

      gl.activeTexture(gl.TEXTURE0 + textureUnit);

      var texture = this.textureForTextureUnit[textureUnit];
      if (texture) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);
      }
      else {
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(loc, textureUnit);
        this.textureForTextureUnit[textureUnit] = texture;
      }
    },

    allocTexture: function (id) {
      var textureUnit = this.textureUnitCounter;
      this.textureUnitForNames[id] = textureUnit;
      this.textureUnitCounter ++;
      return textureUnit;
    },

    initUniformLocations: function () {
      this.locations = {}; // uniforms locations
      for (var v in this.uniformTypes)
        this.recBindLocations(v, this.uniformTypes[v], v);
    },

    recBindLocations: function (name, type, varpath) {
      var arrayType = type instanceof Array;
      var arrayLength;
      if (arrayType) {
        arrayLength = type[1];
        type = type[0];
      }
      if (type in this.structTypes) {
        var structType = this.structTypes[type];
        if (arrayType) {
          for (var i=0; i<arrayLength; ++i) {
            var pref = varpath+"["+i+"].";
            for (var field in structType) {
              this.recBindLocations(field, structType[field], pref+field);
            }
          }
        }
        else {
          var pref = varpath+".";
          for (var field in structType) {
            this.recBindLocations(field, structType[field], pref+field);
          }
        }
      }
      else {
        this.locations[varpath] = this.gl.getUniformLocation(this.program, varpath);
      }
    },

    load: function () {
      var gl = this.gl;

      // Clean old program
      if (this.program) {
        gl.deleteProgram(this.program);
        this.program = null;
      }

      // Create new program
      this.program = this.loadProgram([
        this.loadShader(this.vertex, gl.VERTEX_SHADER), 
        this.loadShader(this.fragment, gl.FRAGMENT_SHADER)
      ]);
      gl.useProgram(this.program);

      /*
      var nbUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (var i=0; i<nbUniforms; ++i) {
        console.log(this.gl.getActiveUniform(this.program, i));
      }
      */

      // Bind custom variables
      this.initUniformLocations();

      // Init textures
      this.textureUnitForNames = {};
      this.textureForTextureUnit = {};
      this.textureUnitCounter = 0;
    },

    loadProgram: function (shaders) {
      var gl = this.gl;
      var program = gl.createProgram();
      shaders.forEach(function (shader) {
        gl.attachShader(program, shader);
      });
      gl.linkProgram(program);

      var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!linked) {
        gl.deleteProgram(program);
        throw new Error(program+" "+gl.getProgramInfoLog(program));
      }
      return program;
    },

    loadShader: function (shaderSource, shaderType) {
      var gl = this.gl;
      var shader = gl.createShader(shaderType);
      gl.shaderSource(shader, shaderSource);
      gl.compileShader(shader);
      var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        var lastError = gl.getShaderInfoLog(shader);
        var split = lastError.split(":");
        var col = parseInt(split[1], 10);
        var line = parseInt(split[2], 10);
        var s = "";
        if (!isNaN(col)) {
          var spaces = ""; for (var i=0; i<col; ++i) spaces+=" ";
          s = "\n"+spaces+"^";
        }
        error(lastError+"\n"+shaderSource.split("\n")[line-1]+s);
        gl.deleteShader(shader);
        throw new Error(shader+" "+lastError);
      }
      return shader;
    }
  };



  Glsl.prototype = {

    /**
     * A map containing all the #define declarations of the GLSL.
     *
     * You can use it to synchronize some constants between GLSL and Javascript (like an array capacity).
     * @public
     */
    defines: null,

    // ~~~ Public Methods

    /**
     * Starts/Continues the render and update loop.
     * The call is not mandatory if you need a one time rendering, but don't need to update things through time (rendering is performed once at Glsl instanciation).
     * @return the Glsl instance.
     * @public
     */
    start: function () {
      var self = this;
      self._stop = false;
      if (self._running) return self;
      var id = self._running = genid();
      var startTime = Date.now();
      var lastTime = self._stopTime||0;
      //log("start at "+lastTime);
      requestAnimationFrame(function loop () {
        var t = Date.now()-startTime+(self._stopTime||0);
        if (self._stop || self._running !== id) { // handle stop request and ensure the last start loop is running
          //log("stop at "+t);
          self._running = 0;
          self._stopTime = t;
        }
        else {
          requestAnimationFrame(loop, self.canvas);
          var delta = t-lastTime;
          lastTime = t;
          self.update(t, delta);
          self.render();
        }
      }, self.canvas);
      return self;
    },

    /**
     * Pauses the render and update loop.
     * @return the Glsl instance.
     * @public
     */
    stop: function () {
      this._stop = true;
      return this;
    },

    /** 
     * Synchronizes variables from the Javascript into the GLSL.
     * @param {String} variableNames* all variables to synchronize.
     * @return the Glsl instance.
     * @public
     */
    sync: function (/*var1, var2, ...*/) {
      for (var i=0; i<arguments.length; ++i) {
        var v = arguments[i];
        this.syncVariable(v);
      }
      return this;
    },

    /** 
     * Synchronizes all variables.
     * Prefer using sync for a deeper optimization.
     * @return the Glsl instance.
     * @public
     */
    syncAll: function () {
      for (var v in this.variables) this.syncVariable(v);
      return this;
    },

    /**
     * Set and synchronize a variable to a value.
     *
     * @param {String} vname the variable name to set and synchronize.
     * @param {Any} vvalue the value to set.
     * @return the Glsl instance.
     * @public
     */
    set: function (vname, vvalue) {
      this.variables[vname] = vvalue;
      this.sync(vname);
      return this;
    },

    /**
     * Resize the canvas with a new width and height.
     * @public
     */
    setSize: function (width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.syncResolution();
    },

    // ~~~ Going Private Now
    
    initGL: function (contextArgs) {
      var self = this;
      this.canvas.addEventListener("webglcontextlost", function(event) {
        event.preventDefault();
      }, false);
      this.canvas.addEventListener("webglcontextrestored", function () {
        self.running && self.syncAll();
        self.load();
      }, false);
      this.gl = this.prog.gl = this.getWebGLContext(this.canvas, contextArgs);
    },

    render: function () {
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    },

    getWebGLContext: function (canvas, contextArgs) {
      return getWebGLContext(canvas, contextArgs);
    },

    syncVariable: function (name) {
      return this.prog.syncVariable(name, this.variables[name]);
    },

    load: function() {
      var gl = this.gl;
      this.prog.load();
      
      // position
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      var positionLocation = gl.getAttribLocation(this.prog.program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      this.syncResolution();
    },
            
    syncResolution: function () {
      var gl = this.gl;
      var w = this.canvas.width, h = this.canvas.height;
      gl.viewport(0, 0, w, h);
      var resolutionLocation = this.prog.locations.resolution;
      gl.uniform2f(resolutionLocation, w, h);
      var x1 = 0, y1 = 0, x2 = w, y2 = h;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2]), gl.STATIC_DRAW);
    }

  };

  function getWebGLContext (canvas, contextArgs) {
    if (!canvas.getContext) return;
    var names = ["webgl", "experimental-webgl"];
    for (var i = 0; i < names.length; ++i) {
      try {
        var ctx = canvas.getContext(names[i], contextArgs);
        if (ctx) return ctx;
      } catch(e) {}
    }
  }

// FIXME: following polyfill should be out of the lib
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

  return Glsl;

});
