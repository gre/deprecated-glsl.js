#ifdef GL_ES
precision mediump float;
#endif

#define MAX_BALLS 10

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
  float creationTime;
};

uniform vec2 resolution;
uniform float time;
uniform float lastBallFail;

uniform Ball balls[MAX_BALLS];
uniform int ballsLength;

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
  float fail = smoothstep(400.0, 0.0, time-lastBallFail);

  p.x *= 1.0-(0.2+0.3*sin(0.01*(time-lastBallFail)+p.y*5.))*fail;
  
  vec3 c = vec3(1.0, 0.7, 0.5)*(0.5+0.5*distance(p.x, 0.5));

  float divideColor = 0.6;

  for (int i=0; i<MAX_BALLS; ++i) { if (i>=ballsLength) break;
    Ball ball = balls[i];
    float ballDistance = distance(p*ratio, ball.center*ratio);
    float grad = 1.2-smoothstep(0.0, 0.8, ballDistance);
    float t = (time-ball.creationTime)/1000.;
    vec3 ballcolor = vec3(
      0.5+0.1*sin(t*3.3), 
      0.5+0.1*cos(t*0.9), 
      0.5+0.1*sin(t*0.6)
    )*grad;
    float dist = distance(p*ratio, (ball.center+ball.shake)*ratio);
    if (dist < ball.radius) {
      float d = smoothstep(1.0, 0.6, dist/ball.radius);
      c -= d*0.5;
    }
    c += ballcolor;
    divideColor += 0.4;// * smoothstep(0.0, 500.0, ball.creationTime);
  }

  c /= divideColor;
  
  vec2 pratio = p*(resolution.xy / resolution.x);
  float pointDim = resolution.x*0.7;
  vec3 pointColor = c * smoothstep(0.4-0.4*fail, 0.6, cos(pratio.x*pointDim)*cos(pratio.y*pointDim));
  float m = 0.1*fail+0.03+0.02*smoothstep(1.0, -1.0, sin(time/1000.));
  c = c - m*pointColor;

  if (inPlayer(p, player)) {
    c *= 0.6*(1.0-smoothstep(500., 0., time-player.lastTouch));
  }

  if (inPlayer(p, computer)) {
    c *= 0.6*(1.0-smoothstep(500., 0., time-computer.lastTouch));
  }

  if (inPlayerScore(p, player) || inPlayerScore(p, computer)) {
    c *= 0.5;
  }

  gl_FragColor = vec4(c, 1.0);
}
