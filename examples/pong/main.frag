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

bool inScore (vec2 p, vec2 topleft, vec2 size, int score, int total, float thickness, bool leftToRight) {
  if (all(lessThan(topleft, p)) && all(lessThan(p, topleft+size))) {
    float x = p.x - topleft.x;
    float w = size.x / float(total);
    float i = x/w;
    int n = int(i);
    if (leftToRight) {
      if ((i-float(n))>thickness) return false;
      if (n+1 > score) return false;
    }
    else {
      if ((i-float(n))<1.0-thickness) return false;
      if (total-n > score) return false;
    }
    return true;
  }
  return false;
}

bool inPlayerScore (vec2 p) {
  return inScore(p, vec2(0.01, 0.94), vec2(0.2, 0.05), playerCount, 10, 0.5, true);
}

bool inComputerScore (vec2 p) {
  return inScore(p, vec2(0.79, 0.94), vec2(0.2, 0.05), computerCount, 10, 0.5, false);
}

void main (void) {
  vec2 p = ( gl_FragCoord.xy / resolution.xy );
  vec2 ratio = resolution/resolution.x;
  vec4 c = vec4(0.9, 0.5, 0.5+sin(time)/5., 1.0)*(1.5-0.9*distance(p*ratio,ball*ratio));

  if (inPlayer(p, player+playerShake)) {
    c *= 0.2;
  }

  if (inPlayer(p, computer)) {
    c *= 0.2;
  }

  if (inBall(p, ball+playerShake)) {
    c *= 0.5;
  }

  if (inPlayerScore(p)) {
    c *= 0.8;
  }

  if (inComputerScore(p)) {
    c *= 0.8;
  }

  gl_FragColor = c;
}
