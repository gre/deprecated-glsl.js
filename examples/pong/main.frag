#ifdef GL_ES
precision mediump float;
#endif

struct Player {
  vec2 position;
  vec2 dimension;
  vec2 shake;
  int count;
  int xDirection;
  float lastTouch;
};

struct Ball {
  vec2 center;
  float radius;
  vec2 velocity;
  vec2 shake;
};

uniform float time;
uniform vec2 resolution;

uniform Ball ball;
uniform Player player;
uniform Player computer;

bool inCircle (vec2 p, vec2 center, float radius) {
  vec2 ratio = resolution/resolution.x;
  return distance(p*ratio, center*ratio) < radius;
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

bool inPlayer (vec2 position, Player player) {
  return all(lessThan(2.*abs(position-(player.position+player.shake)), player.dimension));
}

bool inBall (vec2 position, Ball ball) {
  return inCircle(position, ball.center+ball.shake, ball.radius);
}

bool inPlayerScore (vec2 p, Player player) {
  return inScore(p, vec2(player.xDirection==1 ? 0.01: 0.59, 0.97), vec2(0.4, 0.02), player.count, 40, 0.5, player.xDirection==1);
}

void main (void) {
  vec2 p = ( gl_FragCoord.xy / resolution.xy );
  vec2 ratio = resolution/resolution.x;
  float ballDistance = distance(p*ratio,ball.center*ratio);
  vec3 c = vec3(0.9, 0.5, 0.5+sin(time/1000.)/5.)*(1.8-1.5*ballDistance);

  if (inPlayer(p, player)) {
    c *= 0.7*(1.0-smoothstep(500., 0., time-player.lastTouch));
  }

  if (inPlayer(p, computer)) {
    c *= 0.7*(1.0-smoothstep(500., 0., time-computer.lastTouch));
  }

  if (inPlayerScore(p, player) || inPlayerScore(p, computer)) {
    c *= 0.5;
  }

  if (inBall(p, ball)) {
    c *= 1.2;
  }

  gl_FragColor = vec4(c, 1.0);
}
