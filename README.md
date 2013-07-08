* [Read the blog article](http://greweb.me/2013/02/glsl-js-a-javascript-glsl-library-dry-efficient/)
* [Open Examples](http://greweb.fr/glsl.js/examples)
* [API Documentation](http://greweb.fr/glsl.js/docs)
* [Unit tests](http://greweb.fr/glsl.js/test)

* [Watch the beginner video tutorial](http://www.youtube.com/watch?v=kxBkfy_8JEs)
[![](https://f.cloud.github.com/assets/211411/167278/cb4897c4-79cd-11e2-878a-b58f349ffc1a.jpg)](http://www.youtube.com/watch?v=kxBkfy_8JEs)

[![Flattr this git repo](http://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=greweb&url=http://github.com/gre/glsl.js&title=glsl.js&language=&tags=github&category=software) because this is a free and open-source library (Apache 2 licence).


glsl.js
=======

![schema](https://f.cloud.github.com/assets/211411/133026/5ed79ff8-709b-11e2-85dd-60332f74dc31.png)

**glsl.js** is a subset\* of a WebGL library which focus on **making the GLSL (OpenGL Shading Language) easy and accessible** for vizualisation and game purposes (2D or 3D).

> \* Subset, because we only focus on using a *fragment shader* (the *vertex shader* is static and take the full canvas size), But don't worry, you have a long way to go with just one *fragment shader*.

The concept is to split the **rendering part in a GLSL fragment** from the **logic part in Javascript** of your app/game. Both part are linked by **a set of variables** (the state of your app/game).

**glsl.js** aims to abstract every GL functions so you don't have to learn any OpenGL API.
What you only need to care about is the logic in Javascript and the rendering in GLSL.

For more infos, [read the blog article](http://greweb.me/2013/02/glsl-js-a-javascript-glsl-library-dry-efficient/).

Licence
=======

Copyright 2013 Gaetan Renaudeau

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
