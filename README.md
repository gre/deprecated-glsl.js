* [Open Examples](http://greweb.fr/glsl.js/examples)
* [API Documentation](http://greweb.fr/glsl.js/docs)
* [React on the blog article](http://blog.greweb.fr/?p=2130)
* [Unit tests](http://greweb.fr/glsl.js/test)

[![Flattr this git repo](http://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=greweb&url=http://github.com/gre/glsl.js&title=glsl.js&language=&tags=github&category=software) because this is a free and open-source library (Apache 2 licence).


glsl.js
=======

**glsl.js** is a subset\* of a WebGL library which focus on **making the GLSL (OpenGL Shading Language) easy and accessible** for vizualisation and game purposes (2D or 3D).

> \* Subset, because we only focus on using a *fragment shader* (the *vertex shader* is static and take the full canvas size), But don't worry, you have a long way to go with just one *fragment shader*.

The concept is to split the **rendering part in a GLSL fragment** from the **logic part in Javascript** of your app/game. Both part are linked by **a set of variables** (the state of your app/game).

![schema](https://f.cloud.github.com/assets/211411/133026/5ed79ff8-709b-11e2-85dd-60332f74dc31.png)

**glsl.js** aims to abstract every GL functions so you don't have to learn any OpenGL API.
What you only need to care about is the logic in Javascript and the rendering in GLSL.

By design, **you can't mix logic and render part**, this approach really helps to focus on essential things separately.

Efficiency
----


Look, I'm able to run my HTML5 game at 60fps on my Nexus 7 tablet (Chrome Beta):

[VIDEO TODO]


Hello World Example
----

Here is an Hello World example. For more examples, see [/examples](http://greweb.fr/glsl.js/examples).

```html
<canvas id="viewport" width="600" height="400"></canvas>
<script id="fragment" type="x-shader/x-fragment">
#ifdef GL_ES
precision mediump float;
#endif
uniform float time;
uniform vec2 resolution;
void main (void) {
  vec2 p = ( gl_FragCoord.xy / resolution.xy );
  gl_FragColor = vec4(p.x, p.y, (1.+cos(time))/2., 1.0);
}
</script>
<script src="../../glsl.js" type="text/javascript"></script>
<script type="text/javascript">
  var glsl = Glsl({
    canvas: document.getElementById("viewport"),
    fragment: document.getElementById("fragment").innerHTML,
    variables: {
      time: 0 // The time in ms
    },
    update: function (time, delta) {
      this.set("time", time);
    }
  }).start();
</script>
```

![screenshot](https://f.cloud.github.com/assets/211411/132729/e702c2b4-7090-11e2-8904-49e904e6c5a2.png)

GLSL: OpenGL Shading Language
-----

> GLSL is a high-level shading language based on the syntax of the C programming language. (Wikipedia)

GLSL gives a very different way of thinking the rendering: basically, in a main function, you have to **set the color (`gl_FragColor`) of a pixel for a given position (`gl_FragCoord`)**.

As a nice side effect, GLSL is vectorial by design: it can be stretch to any dimension.

GLSL is efficient because it is compiled to the graphic card.

GLSL provides an interesting collection of **types** (e.g. `int`, `float`, `vec2`, `vec3`, `mat3`, `sampler2D`,… and also arrays of these types)  and **functions** (e.g. `cos`, `smoothstep`, …).

[Here is a good reference for this](http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf).

You can also deeply explore the awesome collection of [glsl.heroku.com](http://glsl.heroku.com/). Any of glsl.heroku.com examples are compatible with **glsl.js** if you add some required variables (*time*, *mouse*, …).

App/Game Logic
--------------

You must give to Glsl a `canvas` (DOM element of a canvas), a `fragment` (the GLSL fragment code), the `variables` set, and the `update` function.

Then you can start/stop the rendering via method (`.start()` and `.stop()`).

The `update` function is called as soon as possible by the library. It is called in a `requestAnimationFrame` context.

You must define all variables shared by both logic and render part in a Javascript object `{varname: value}`.
Variables must match your GLSL uniform variables. Every time you update your variables and you want to synchronize them with the GLSL you have to manually call the `sync` function by giving all variables name to synchronize.

**Exemple:**

```javascript
Glsl({
  canvas: canvas,
  fragment: fragCode,
  variables: {
    time: 0, // The time in seconds
    random1: 0
  },
  update: function (time, delta) {
	this.variables.time = time;
	this.variables.random1 = Math.random();
	this.sync("random1", "time");
  }
}).start();
```

**Note:** *under the hood, a type environment of uniform variables is inferred by parsing your GLSL code.* 

Using arrays
------------

Hopefully, GLSL also supports arrays. You can actually bind a Javascript array to a GLSL uniform variable.

**Example:**

In GLSL,
```glsl
uniform float tenfloats[10];
```

In Javascript,
```javascript
var glsl = Glsl({
  ...
  variable: {
  	tenfloats: new Float32Array(10)
  },
  update: function () {
    this.tenfloats[3] = Math.random();
    this.sync("tenfloats");
  }
}).start();
```

Alternatively, you can still use a classical javascript Array (but native Javascript arrays are prefered because more efficient).

Use `Int32Array` for `int[]` and `bool[]`.

Vector arrays are also possible. In Javascript, you will have to give a linearized array.
For instance, 
a `vec2[2]` will be `[vec2(1.0, 2.0), vec2(3.0, 4.0)]` if `Float32Array(1.0, 2.0, 3.0, 4.0)` is used.

Using objects
------------

Even more interesting now, you can synchronize a whole object into the GLSL world. This is very interesting for Object-Oriented approach.


**Example:**

In GLSL,
```glsl
struct Circle {
  vec2 center;
  float radius;
}
uniform Circle c1;
bool inCircle (vec2 p, Circle c) {
  vec2 ratio = resolution/resolution.x;
  return distance(p*ratio, c.center*ratio) < c.radius;
}
void main (void) {
  vec2 p = ( gl_FragCoord.xy / resolution.xy );
  if (inCircle(p, c1))
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  else
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
```

In Javascript,
```javascript
function Circle (x, y, radius) {
  this.center = { x: x, y: y };
  this.radius = radius;
  this.originalRadius = radius; // not visible by GLSL
}
Circle.prototype.update = function () {
  this.radius = this.originalRadius+Math.sin(Date.now()/100);
}
var c1 = new Circle(0.5, 0.5, 0.1);
Glsl({
  ...
  variable: {
  	c1: c1
  },
  update: function (time, delta) {
    c1.update();
    this.sync("c1");
  }
}).start();
```

structs inside structs are also supported:
```glsl
struct Circle {
  vec2 center;
  float radius;
}
struct Player {
  Circle circle;
  bool visible;
}
```


Using Arrays of Objects
-----
The two previous chapters can be assemble!

Yes man, Array of JS object is possible!

```glsl
uniform Circle circles[2];
// circles[0].radius
// …
```

```javascript
Glsl({
  ...
  variable: {
  	circles: [ new Circle(0.1, 0.1, 0.2), new Circle(0.2, 0.3, 0.2) ]
  },
  ...
}).start();
```

Using images
------------

GLSL:
```glsl
uniform sampler2D img;
```

Javascript:
```javascript
var image = new Image(); 
img.src = "foo.png";
var glsl = Glsl({
  ...
  variable: {
  	img: image
  }
});
img.onload = function () {
  glsl.start();
}
```

Note: Using an image loader library can be a good idea.

In GLSL, you will need to use the texture lookup functions to access the image color for a given coordinate. E.g. `texture2D(img, coord)`. (see the [specs](http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf)).

Using another canvas
--------------------
TODO


Licence
=======

Copyright 2013 Gaetan Renaudeau

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
