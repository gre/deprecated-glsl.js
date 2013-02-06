(function (root) {

  var requiredOptions = ["fragment", "canvas", "variables"];

  var typesToSuffix = {
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

  function Glsl (options) {
    if ( !(this instanceof arguments.callee) ) return new arguments.callee(options);
    for (var i=0; i<requiredOptions.length; i++)  
      if (!(requiredOptions[i] in options)) 
        throw "Glsl: option '"+requiredOptions[i]+"' is required.";

    this.canvas = options.canvas;
    this.variables = options.variables; // Variable references
    this.locations = {}; // uniforms locations
    this.update = options.update || function(){};
    this.fragment = options.fragment;

    this.inferTypes();
    if (!this.types.resolution) {
      throw "You must use a 'vec2 resolution' in your shader.";
    }
    delete this.types.resolution; // We don't bind it naturally
    
    this.initGL();
  }

  Glsl.prototype = {

    start: function () {
      var self = this;
      this.syncAll();
      // try a first step before looping (abort if error are thrown)
      self.update();
      self.render();
      this.running = true;
      requestAnimationFrame(function loop () {
        if (this.stopRequest) { // handle stop request
          this.stopRequest = false;
          this.running = false;
          return;
        }
        requestAnimationFrame(loop, self.canvas);
        self.update();
        self.render();
      }, self.canvas);
      return this;
    },

    stop: function () {
      this.stopRequest = true;
    },

    inferTypes: function () {
      var lines = this.fragment.split("\n");
      var r = /uniform\s+([A-Za-z0-9]+)\s+([a-zA-Z_0-9]+)\s*(\[([0-9]+)\])?/;
      this.types = {};
      this.typesArrayLength = {};
      for (var l=0; l<lines.length; ++l) {
        var line = lines[l];
        var matches = line.match(r);
        if (matches) {
          var type = typesToSuffix[matches[1]] || matches[1];
          var vname = matches[2];
          if (matches[4]) {
            this.typesArrayLength[name] = parseInt(matches[4], 10);
            type += "v";
          }
          this.types[vname] = type;
        }
      }
    },

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
      this.load();
    },

    render: function () {
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    },

    sync: function (/*var1, var2, ...*/) {
      for (var i=0; i<arguments.length; ++i) {
        var v = arguments[i];
        this.syncVariable(v);
      }
    },

    syncAll: function () {
      for (var v in this.variables) this.syncVariable(v);
    },

    syncVariable: function (name) {
      var gl = this.gl;
      var type = this.types[name];
      if (!type) throw "Variable '"+name+"' not found in your GLSL.";
      var loc = this.locations[name];
      var value = this.variables[name];
      var fn = "uniform"+type;
      switch (type) {
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
          gl[fn].call(gl, loc, value);
          break;
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
      var textureUnit = this.currentTextureUnit;
      this.textureUnitForNames[name] = textureUnit;
      this.currentTextureUnit ++;
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

    bindUniformLocations: function () {
      for (var v in this.types) {
        this.locations[v] = this.gl.getUniformLocation(this.program, v);
      }
    },

    // WebGL
    getWebGLContext: function () {
      if (!this.canvas.getContext) return;
      var names = ["webgl", "experimental-webgl"];
      for (var i = 0; i < names.length; ++i) {
        try {
          var ctx = this.canvas.getContext(names[i]);
          if (ctx) return ctx;
        } catch(e) {}
      }
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
        this.locations = {};
      }

      // Create new program
      this.program = this.loadProgram([
          this.loadShader('attribute vec2 position;attribute vec2 texCoord_in;uniform vec2 resolution;varying vec2 texCoord;void main() {vec2 zeroToOne = position / resolution;vec2 zeroToTwo = zeroToOne * 2.0;vec2 clipSpace = zeroToTwo - 1.0;gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);texCoord = texCoord_in;}', gl.VERTEX_SHADER), 
          this.loadShader(this.fragment, gl.FRAGMENT_SHADER)
          ]);
      gl.useProgram(this.program);

      // Bind custom variables
      this.bindUniformLocations();

      // Init textures
      this.textureUnitForNames = {};
      this.currentTextureUnit = 0;
      for (var v in this.types) {
        var t = this.types[v];
        if (t == "sampler2D") {
          this.allocTexture(v);
        }
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
        throw "Linking error:" + gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        return null;
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
        if (console.error) {
          var split = lastError.split(":");
          var line = split[2];
          line && console.error("Error for line "+line+": " + shaderSource.split("\n")[line]);
        }
        throw shader + "':" + lastError;
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
  };

  root.Glsl = Glsl;

}(window));
