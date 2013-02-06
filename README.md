glsl.js
=======

**glsl.js** is a subset of a WebGL library which focus on **making the GLSL easy and accessible** for vizualisation and game purposes.

The concept is to split your **rendering part in a GLSL fragment**, and your **app/game logic part in Javascript**, and by maintaining a state to link both part (**a set of variables**).

![schema](https://f.cloud.github.com/assets/211411/133026/5ed79ff8-709b-11e2-85dd-60332f74dc31.png)

The library abstracts every GL functions. So you don't need any OpenGL API knownledge.
What you only need to care about is your app/game logic and your GLSL render code.

By design, you can't mix logic and render part, it can be a bit hard if you are not used to this approach but it really helps to focus on essential things separately.


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
  var canvas = document.getElementById("viewport");
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
> 
GLSL is efficient because it is compiled to the graphic card.

GLSL gives a very different way of thinking the rendering: basically, in a main function, you have to **set the color (`gl_FragColor`) of a pixel for a given position (`gl_FragCoord`)**.

As a nice side effect, GLSL is vectorial by design: it can be stretch to any dimension.

GLSL provides an interesting collection of types (e.g. `int`, `float`, `vec2`, `vec3`, `mat3`, `sampler2D`,… and also arrays of these types)  and functions (e.g. `cos`, `smoothstep`, …).

Here is a good reference for this: [http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf]().

You can also deeply explore the awesome collection of [http://glsl.heroku.com/]().

App/Game Logic
--------------

You must give to Glsl a `canvas`, a `fragment`, the `variables` set, and the `update` function.

Then you can start/stop the rendering via method (`start` and `stop`).

The update function is called as soon as possible by the library. It is called in a `requestAnimationFrame` context.

You must define all variables in a Javascript object `{varname: value}`.
Variables must match your GLSL uniform variables. Every time you update your variables and you want to synchronize them with the GLSL you have to manually call the `sync` function by giving all variables name to synchronise.

Exemple:
```javascript
Glsl({
  canvas: canvas,
  fragment: fragCode,
  variables: {
    time: 0, // The time in seconds
    random1: 0
  },
  render: function () {
	this.variables.time = Date.now();
	this.variables.random1 = Math.random();
	this.sync("random1", "time");
  }
}).start();
```

**Note:** *under the hood, a type environnement of uniform variables is inferred by parsing your GLSL code.* 

Using arrays
------------

GLSL:
```glsl
uniform float tenfloats[10];
```

Javascript:
```javascript
var glsl = Glsl({
  ...
  variable: {
  	tenfloats: new Float32Array(10)
  }
}).start();
```

Alternatively, you can still use a classical javascript Array (but native Javascript arrays are more efficient).

Use `Int32Array` for `int[]` and `bool[]`.

Vector arrays are also possible. They can be used by a linearized array.

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

Licence
=======

Copyright 2013 Gaetan Renaudeau

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
