#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform float BALL_RADIUS;
uniform vec2 PLAYER_DIMENSION;
uniform vec2 player;
uniform vec2 computer;
uniform vec2 ball;
uniform vec2 playerShake;

uniform int playerCount;
uniform int computerCount;

bool inCircle (vec2 p, vec2 center, float radius) {
  vec2 ratio = resolution/resolution.x;
  return distance(p*ratio, center*ratio) < radius;
}

bool inPlayer (vec2 position, vec2 player) {
  return all(lessThan(2.*abs(position-player), PLAYER_DIMENSION));
}

bool inBall (vec2 position, vec2 ball) {
  return inCircle(position, ball, BALL_RADIUS);
}

void main( void ) {
  vec2 p = ( gl_FragCoord.xy / resolution.xy );
  vec4 c = vec4(0.,0.,0.,0.);
  if (inPlayer(p, player+playerShake)) {
    c += vec4(.0, .0, .0, 1.0);
  }
  else if (inPlayer(p, computer)) {
    c += vec4(.0, .0, .0, 1.0);
  }
  else if (inBall(p, ball+playerShake)) {
    c += vec4(.4, .0, .0, 1.0);
  }
  else {
    c += vec4(1.0, 0.5, 0.5+sin(time)/5., 1.0)*(1.-.5*distance(p,vec2(.5,.5)));
  }

  gl_FragColor = c;
}
