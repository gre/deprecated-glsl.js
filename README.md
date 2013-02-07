glsl.js
=======

**glsl.js** is a subset\* of a WebGL library which focus on **making the GLSL (OpenGL Shading Language) easy and accessible** for vizualisation and game purposes (2D or 3D).

> \* Subset, because we only focus on using a *fragment shader* (the *vertex shader* is static and take the full canvas size), But don't worry, you have a long way to go with just one *fragment shader*.

The concept is to split the **rendering part in a GLSL fragment** from the **logic part in Javascript** of your app/game. Both part are linked by **a set of variables** (the state of your app/game).

![schema](https://f.cloud.github.com/assets/211411/133026/5ed79ff8-709b-11e2-85dd-60332f74dc31.png)

**glsl.js** aims to abstract every GL functions so you don't have to learn any OpenGL API.
What you only need to care about is the logic in Javascript and the rendering in GLSL.

By design, **you can't mix logic and render part**, this approach really helps to focus on essential things separately.

Full Example
----

Here is a Hello World example. For more examples, see the `examples/` folder of the project.

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
  var startTime = Date.now();
  var glsl = Glsl({
    canvas: document.getElementById("viewport"),
    fragment: document.getElementById("fragment").innerHTML,
    variables: {
      time: 0 // The time in seconds
    },
    update: function () {
      this.variables.time = (Date.now() - startTime)/1000;
      this.sync("time");
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
Variables must match your GLSL uniform variables. Every time you update your variables and you want to synchronise them with the GLSL you have to manually call the `sync` function by giving all variables name to synchronise.

**Exemple:**

```javascript
Glsl({
  canvas: canvas,
  fragment: fragCode,
  variables: {
    time: 0, // The time in seconds
    random1: 0
  },
  update: function () {
	this.variables.time = Date.now();
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
