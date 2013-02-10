(function () {

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

  var rUniform = /uniform\s+([a-z]+\s+)?([A-Za-z0-9]+)\s+([a-zA-Z_0-9]+)\s*(\[([0-9]+)\])?/;
  var rStruct = /struct\s+\w+\s*{[^}]+}\s*;/g;
  var rStructExtract = /struct\s+(\w+)\s*{([^}]+)}\s*;/;
  var rStructFields = /[^;]+;/g;
  var rStructField = /\s*([a-z]+\s+)?([A-Za-z0-9]+)\s+([a-zA-Z_0-9]+)\s*(\[([0-9]+)\])?\s*;/;

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

  /** 
   * Creates a new Glsl.
   * @param options
   * @param {HTMLCanvasElement} options.canvas The Canvas to render.
   * @param {String} options.fragment The fragment shader source code.
   * @param {Object} options.variables The variables map (initial values).
   * @param {Function} [options.update] The update function to call each frame. The relative time in milliseconds is given to the function (time from the start()).
   *
   * @namespace
   */
  this.Glsl = function (options) {
    if ( !(this instanceof arguments.callee) ) return new arguments.callee(options);
    if (!options) throw new Error("Glsl: {"+requiredOptions+"} are required.");
    for (var i=0; i<requiredOptions.length; i++)  
      if (!(requiredOptions[i] in options)) 
        throw new Error("Glsl: '"+requiredOptions[i]+"' is required.");

    this.canvas = options.canvas;
    this.fragment = options.fragment;
    this.variables = options.variables; // Variable references
    this.update = options.update || function(t){};

    this.parseStructs();
    this.parseUniforms();

    if (!this.uniformTypes.resolution) throw new Error("Glsl: You must use a 'vec2 resolution' in your shader.");
    delete this.uniformTypes.resolution; // We don't bind it naturally

    for (var v in this.uniformTypes) {
      if (!(v in this.variables)) {
        warn("variable '"+v+"' not initialized");
      }
    }
    
    this.initGL();
    this.load();
    this.syncAll();
    this.update(0);
    this.render();
  };

  /**
   * Checks if WebGL is supported by the browser.
   * @type boolean
   * @public
   */
  Glsl.supported = function () {
    return !!getWebGLContext(document.createElement("canvas"));
  };

  Glsl.prototype = {

    // ~~~ Public Methods

    /**
     * Starts the render and update loop.
     * @public
     */
    start: function () {
      var startTime = Date.now();
      var lastTime = startTime;
      var self = this;
      this.running = true;
      requestAnimationFrame(function loop () {
        if (this.stopRequest) { // handle stop request
          this.stopRequest = false;
          this.running = false;
          return;
        }
        requestAnimationFrame(loop, self.canvas);
        var t = Date.now()-startTime;
        var delta = t-lastTime;
        lastTime = t;
        self.update(t, delta);
        self.render();
      }, self.canvas);
      return this;
    },

    /**
     * Stops the render and update loop.
     * @public
     */
    stop: function () {
      this.stopRequest = true;
    },

    /** 
     * Synchronizes variables from the Javascript into the GLSL.
     * @param {String} variableNames* all variables to synchronize.
     * @public
     */
    sync: function (/*var1, var2, ...*/) {
      for (var i=0; i<arguments.length; ++i) {
        var v = arguments[i];
        this.syncVariable(v);
      }
    },

    /** 
     * Synchronizes all variables.
     * Prefer using sync for a deeper optimization.
     * @public
     */
    syncAll: function () {
      for (var v in this.variables) this.syncVariable(v);
    },

    /**
     * Set and synchronize a variable to a value.
     *
     * @param {String} vname the variable name to set and synchronize.
     * @param {Any} vvalue the value to set.
     * @public
     */
    set: function (vname, vvalue) {
      this.variables[vname] = vvalue;
      this.sync(vname);
    },

    // ~~~ Going Private Now

    initGL: function () {
      var self = this;
      this.canvas.addEventListener("webglcontextlost", function(event) {
        event.preventDefault();
      }, false);
      this.canvas.addEventListener("webglcontextrestored", function () {
        self.running && self.syncAll();
        self.load();
      }, false);
      this.gl = this.getWebGLContext(this.canvas);
    },

    render: function () {
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    },

    parseStructs: function () {
      this.structTypes = {};
      var structs = this.fragment.match(rStruct);
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
            type = [type, parseInt(arrayLength, 10)];
          }
          structType[vname] = type;
        }
        this.structTypes[structName] = structType;
      }
    },

    parseUniforms: function () {
      this.uniformTypes = {};
      var lines = this.fragment.split("\n");
      for (var l=0; l<lines.length; ++l) {
        var line = lines[l];
        var matches = line.match(rUniform);
        if (matches) {
          var nativeType = matches[2],
              vname = matches[3],
              arrayLength = matches[5];
          var type = typesSuffixMap[nativeType] || nativeType;
          if (arrayLength) {
            type = [type, parseInt(arrayLength, 10)];
          }
          this.uniformTypes[vname] = type;
        }
      }
    },

    syncVariable: function (name) {
      return this.recSyncVariable(name, this.variables[name], this.uniformTypes[name],  name);
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
          for (var i=0; i<arrayLength; ++i) {
            var pref = varpath+"["+i+"].";
            var v = value[i];
            for (var field in structType) {
              if (!(field in v)) {
                warn("variable '"+varpath+"' ("+type+") has no field '"+field+"'");
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
            gl[fn].call(gl, loc, value.x, value.y);
            break;

          case "3f":
          case "3i":
            gl[fn].call(gl, loc, value.x, value.y, value.z);
            break;

          case "4f":
          case "4i":
            gl[fn].call(gl, loc, value.x, value.y, value.z, value.w);
            break;

          case "sampler2D": 
            this.syncTexture(gl, loc, value, name); 
            break;

          default:
            if (gl[fn])
              gl[fn].call(gl, loc, value);
            else
              error("type '"+type+"' not found.");
            break;
        }
      }
    },

    syncTexture: function (gl, loc, value, name) {
      var textureUnit = this.textureUnitForNames[name];
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      var texture = this.createTexture(value);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(loc, textureUnit);
    },

    allocTexture: function (name) {
      var textureUnit = this.textureUnitCounter;
      this.textureUnitForNames[name] = textureUnit;
      this.textureUnitCounter ++;
    },

    createTexture: function (image) {
      var gl = this.gl;
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return texture;
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

    getWebGLContext: function () {
      return getWebGLContext(this.canvas);
    },

    syncResolution: function () {
      var gl = this.gl;
      var w = this.canvas.width, h = this.canvas.height;
      gl.viewport(0, 0, w, h);
      var resolutionLocation = gl.getUniformLocation(this.program, "resolution");
      gl.uniform2f(resolutionLocation, w, h);
      var x1 = 0, y1 = 0, x2 = w, y2 = h;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2]), gl.STATIC_DRAW);
    },

    load: function () {
      var w = this.canvas.width, h = this.canvas.height;
      var gl = this.gl;

      // Clean old program
      if (this.program) {
        gl.deleteProgram(this.program);
        this.program = null;
      }

      // Create new program
      this.program = this.loadProgram([
          this.loadShader('attribute vec2 position;attribute vec2 texCoord_in;uniform vec2 resolution;varying vec2 texCoord;void main() {vec2 zeroToOne = position / resolution;vec2 zeroToTwo = zeroToOne * 2.0;vec2 clipSpace = zeroToTwo - 1.0;gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);texCoord = texCoord_in;}', gl.VERTEX_SHADER), 
          this.loadShader(this.fragment, gl.FRAGMENT_SHADER)
          ]);
      gl.useProgram(this.program);

      // Bind custom variables
      this.initUniformLocations();

      // Init textures
      this.textureUnitForNames = {};
      this.textureUnitCounter = 0;
      for (var v in this.uniformTypes) {
        var t = this.uniformTypes[v];
        if (t == "sampler2D")
          this.allocTexture(v);
      }

      // buffer
      var texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);

      // texCoord
      var texCoordLocation = gl.getAttribLocation(this.program, "texCoord_in");
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // position
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      var positionLocation = gl.getAttribLocation(this.program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      this.syncResolution();
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
        lastError = gl.getShaderInfoLog(shader);
        var split = lastError.split(":");
        var col = parseInt(split[1], 10);
        var line = split[2];
        var s = "";
        if (!isNaN(col)) {
          var spaces = ""; for (var i=0; i<col; ++i) spaces+=" ";
          s = "\n"+spaces+"^";
        }
        error(lastError+"\n"+shaderSource.split("\n")[line]+s);
        gl.deleteShader(shader);
        throw new Error(shader+" "+lastError);
      }
      return shader;
    }
  };

  function getWebGLContext (canvas) {
    if (!canvas.getContext) return;
    var names = ["webgl", "experimental-webgl"];
    for (var i = 0; i < names.length; ++i) {
      try {
        var ctx = canvas.getContext(names[i]);
        if (ctx) return ctx;
      } catch(e) {}
    }
  }

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

}());
