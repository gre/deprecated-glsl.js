module("glsl.js");

function Circle (x, y, radius) {
  this.center = { x: x, y: y };
  this.radius = radius;
}

function Player (circle, visible) {
  this.circle = circle;
  this.visible = visible;
}

test("variable injection", function () {
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
"bool test () { return ",
"  b1==true &&",
"  b2==false &&" ,
"  i1==1 &&",
"  i2==2 &&",
"  f1==0.5 &&",
"  v2.x==0.5 && v2.y==0.3 &&",
"  v3.z==0.3 &&",
"  v4.w==0.4 &&",
"  iv2.x==5 && iv2.y==3 &&",
"  barray4[0] && barray4[1] && barray4[2] && !barray4[3] &&",
"  iarray4[0]==0 && iarray4[1]==1 && iarray4[2]==2 && iarray4[3]==3 &&",
"  farray5[0]==0.4 && farray5[4]==0.8 &&",
"  v2arr5[0]==vec2(0.5, 0.0) && v2arr5[4]==vec2(4.5, 4) &&",
"  c1.center==vec2(0.1, 0.2) && c1.radius==0.5 &&",
"  c2array[0].center==vec2(1.0, 2.0) && c2array[0].radius==3.0 &&",
"  c2array[1].center==vec2(4.0, 5.0) && c2array[1].radius==6.0 &&",
"  p1.circle.center==vec2(0.25, 0.25) && p1.circle.radius==0.4 && p1.visible==true &&",
"true;}",
"void main (void) {",
"  gl_FragColor= test() ? green : red;",
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
      c2array: [new Circle(1.0, 2.0, 3.0), new Circle(4.0, 5.0, 6.0)]
    }
  });
  glsl.start();
  glsl.stop();
  var canvas2d = document.createElement("canvas");
  var c2d = canvas2d.getContext("2d");
  c2d.drawImage(canvas, 0, 0);
  var color = c2d.getImageData(0,0,1,1).data;
  console.log(color);
  ok(color[0]==0 && color[1]==255 && color[2]==0, "GLSL has received all tested values");
});
