module("glsl.js");

function Circle (x, y, radius) {
  this.center = { x: x, y: y };
  this.radius = radius;
}

function Player (circle, visible) {
  this.circle = circle;
  this.visible = visible;
}

function getFirstPixelColor (canvas) {
  var canvas2d = document.createElement("canvas");
  var c2d = canvas2d.getContext("2d");
  c2d.drawImage(canvas, 0, 0);
  var color = c2d.getImageData(0,0,1,1).data;
  return color;
}

test("Glsl.supported()", function () {
  ok(Glsl.supported(), "Glsl.supported() returns true");
});

test("Simple Glsl works", function () {
  Glsl({
    canvas: document.createElement("canvas"),
    fragment: ["#ifdef GL_ES",
    "precision mediump float;",
    "#endif",
    "uniform vec2 resolution;",
    "void main (void) {}",
    ""].join("\n"),
    variables: {}
  });
  ok(true);
});

asyncTest("init and update functions are called once even when not using .start()", 5, function () {
  Glsl({
    canvas: document.createElement("canvas"),
    fragment: ["#ifdef GL_ES",
    "precision mediump float;",
    "#endif",
    "uniform vec2 resolution;",
    "void main (void) {}",
    ""].join("\n"),
    variables: {},
    init: function () {
      ok(this instanceof Glsl, "this is glsl");
      ok(true, "init is called");
    },
    update: function (t, d) {
      ok(this instanceof Glsl, "this is glsl");
      equal(t, 0, "t is 0");
      equal(d, 0, "d is 0");
      start();
    }
  });
});

asyncTest("variable injection", function () {
  var yellow16x16 = new Image();
  function onload () {
    var fragment = [
"#ifdef GL_ES",
"precision mediump float;",
"#endif",
"",
"const vec4 red = vec4(1.0,0.0,0.0,1.0);",
"const vec4 green = vec4(0.0,1.0,0.0,1.0);",
"uniform vec2 resolution;",
"uniform bool b1;",
"uniform bool b2;",
"uniform int i1;",
"uniform highp int i2;",
"uniform lowp float f1;",
"uniform vec2 v2;",
"uniform vec3 v3;",
"uniform vec4 v4;",
"uniform ivec2 iv2;",
"uniform bool barray4[4];",
"uniform highp float farray5[5];",
"uniform int iarray4[4];",
"uniform vec2 v2arr5[5];",
"struct Circle { vec2 center; highp float radius; };",
"struct Player {Circle circle;bool visible;} ;",
"uniform Circle c1;",
"uniform Circle c2array[2];",
"uniform Player p1;",
"uniform sampler2D yellow16x16;",
"int test () {",
"int i = 1;",
"  if(",
"  b1==true &&(0<++i)&&",
"  b2==false &&(0<++i)&&" ,
"  i1==1 &&(0<++i)&&",
"  i2==2 &&(0<++i)&&",
"  f1==0.5 &&(0<++i)&&",
"  v2.x==0.5 && v2.y==0.3 &&(0<++i)&&",
"  v3.z==0.3 &&(0<++i)&&",
"  v4.w==0.4 &&(0<++i)&&",
"  iv2.x==5 && iv2.y==3 &&(0<++i)&&",
"  barray4[0] && barray4[1] && barray4[2] && !barray4[3] &&(0<++i)&&",
"  iarray4[0]==0 && iarray4[1]==1 && iarray4[2]==2 && iarray4[3]==3 &&(0<++i)&&",
"  farray5[0]==0.4 && farray5[4]==0.8 &&(0<++i)&&",
"  v2arr5[0]==vec2(0.5, 0.0) && v2arr5[4]==vec2(4.5, 4) &&(0<++i)&&",
"  c1.center==vec2(0.1, 0.2) && c1.radius==0.5 &&(0<++i)&&",
"  c2array[0].center==vec2(1.0, 2.0) && c2array[0].radius==3.0 &&(0<++i)&&",
"  c2array[1].center==vec2(4.0, 5.0) && c2array[1].radius==6.0 &&(0<++i)&&",
"  p1.circle.center==vec2(0.25, 0.25) && p1.circle.radius==0.4 && p1.visible==true &&(0<++i)&&",
"  texture2D(yellow16x16, vec2(0.5, 0.5)) == vec4(1.0, 1.0, 0.0, 1.0) &&(0<++i)&&",
"true) return 0; else return i; }",
"void main (void) {",
"  int i = test();",
"  gl_FragColor= i==0 ? green : red+vec4(0.,0.,float(i)/255.,0.);",
"}",
""
  ].join("\n");
    var canvas = document.createElement("canvas");
    var glsl = Glsl({
      canvas: canvas,
      fragment: fragment,
      variables: {
        b1: true,
        b2: false,
        i1: 1,
        i2: 2,
        f1: 0.5,
        v2: { x: 0.5, y: 0.3 },
        v3: { x: 0.2, y: 0.2, z: 0.3 },
        v4: { x: 0.1, y: 0.2, z: 0.3, w: 0.4 },
        iv2: { x: 5, y: 3 },
        barray4: [true,true,true,false],
        iarray4: new Int32Array([0,1,2,3]),
        farray5: new Float32Array([0.4,0.5,0.6,0.7,0.8]),
        v2arr5: new Float32Array([
          0.5, 0, 
          1.5, 1, 
          2.5, 2, 
          3.5, 3,
          4.5, 4
        ]),
        c1: new Circle(0.1, 0.2, 0.5),
        p1: new Player(new Circle(0.25, 0.25, 0.4), true),
        c2array: [new Circle(1.0, 2.0, 3.0), new Circle(4.0, 5.0, 6.0)],
        yellow16x16: yellow16x16
      },
      ready: function () {
        var color = getFirstPixelColor(canvas);
        var r = color[0], g = color[1], b = color[2];
        ok(b!=1, "b1");
        ok(b!=2, "b2");
        ok(b!=3, "i1");
        ok(b!=4, "i2");
        ok(b!=5, "f1");
        ok(b!=6, "v2");
        ok(b!=7, "v3");
        ok(b!=8, "v4");
        ok(b!=9, "iv2");
        ok(b!=10, "barray4");
        ok(b!=11, "iarray4");
        ok(b!=12, "farray5");
        ok(b!=13, "v2arr5");
        ok(b!=14, "c1");
        ok(b!=15, "c2array[0]");
        ok(b!=16, "c2array[1]");
        ok(b!=17, "p1");
        ok(b!=18, "yellow16x16");
        ok(r==0 && g==255 && b==0, "All GLSL tests passed. ("+r+","+g+","+b+")");
        start();
      }
    });
  }
  yellow16x16.onload = onload;
  yellow16x16.src = "yellow16x16.png";
});

asyncTest("variables set & sync", function () {

    var canvas = document.createElement("canvas");
    var fragment = [
"#ifdef GL_ES",
"precision mediump float;",
"#endif",
"uniform vec2 resolution;",
"uniform vec4 color;",
"void main (void) {",
"  gl_FragColor = color;",
"}"
].join("\n");
    var S = [];
    var testnum = 0;
    var D = 300;
    var startTime = Date.now();
    var startDeffered = false;
    function deferredStart (t) {
      if (startDeffered) return;
      startDeffered = true;
      setTimeout(function () {
        start();
        var elapse = Date.now()-startTime;
        var normalTime = 8*D+t;
        ok(normalTime <= elapse && elapse < normalTime + D/* some time for JS exec */, "The test has terminated in normal time (stop has worked + not lagged)");
      }, t);
    }
    var glsl = Glsl({
      canvas: canvas,
      fragment: fragment,
      variables: {
        color: { x: 1, y: 1, z: 1, w: 1 }
      },
      update: function (t, d) {
        var color;
        if (t < D) return;
        if (t < 2*D) {
          if (!S[0]) {
            S[0] = true;
            // pausing for some time
            glsl.stop();
            setTimeout(function(){ glsl.start() }, 3*D);
          }
          color = getFirstPixelColor(canvas);
          ok(color[0]==255 && color[1]==255 && color[2]==255, "variable has been initialized.");
          return;
        }
        if (t < 3*D) {
          if (!S[1]) {
            S[1] = true;
            this.set("color", { x: 1, y: 1, z: 0, w: 1 });
          }
          else {
            color = getFirstPixelColor(canvas);
            ok(color[0]==255 && color[1]==255 && color[2]==0, "variable has been changed.");
          }
          return;
        }
        if (t < 4*D) {
          if (!S[2]) {
            S[2] = true;
            this.variables.color.y = 0;
            this.sync("color");
          }
          else {
            color = getFirstPixelColor(canvas);
            ok(color[0]==255 && color[1]==0 && color[2]==0, "sync works.");
          }
          return;
        }
        if (t < 5*D) {
          if (!S[3]) {
            S[3] = true;
            this.variables.color.x = 0;
            this.syncAll();
          }
          else {
            color = getFirstPixelColor(canvas);
            ok(color[0]==0 && color[1]==0 && color[2]==0, "syncAll works.");
          }
          return;
        }
        if (t < 6*D) {
          glsl.stop();
          deferredStart(2*D);
          return;
        }
        if (t < 7*D) {
          ok(false, "glsl.stop() has not stopped the update loop.");
          start();
          return;
        }
      }
    }).start().start().start().start(); // stressing start a bit

});


asyncTest("canvas as a texture is working and can be re-sync", 2, function () {
  var c = document.createElement("canvas");
  var ctx = c.getContext("2d");

  var D = 200;
  var S = [];

  // only fill the left-right part to test if axis are not inverted (especially Y)
  function setCanvasColor (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width/2, c.height/2);
  }

  var glsl = Glsl({
    canvas: document.createElement("canvas"),
    fragment: ["#ifdef GL_ES",
    "precision mediump float;",
    "#endif",
    "uniform vec2 resolution;",
    "uniform sampler2D c;"+
    "void main (void) { gl_FragColor = texture2D(c, gl_FragCoord.xy/resolution); }",
    ""].join("\n"),
    variables: {
      c: c
    },
    update: function (t, d) {
      if (t < D) {
        setCanvasColor("rgb(0,255,0)");
        this.sync("c");
      }
      else if (t < 2*D) {
        if (!S[1]) {
          S[1] = true;
          var color = getFirstPixelColor(this.canvas);
          ok(color[0]==0 && color[1]==255 && color[2]==0, "color is green");
          setCanvasColor("rgb(0,0,255)");
          this.sync("c");
        }
      }
      else {
        var color = getFirstPixelColor(this.canvas);
        ok(color[0]==0 && color[1]==0 && color[2]==255, "color is blue");
        glsl.stop();
        start();
      }
    }
  });

  glsl.start();
});
