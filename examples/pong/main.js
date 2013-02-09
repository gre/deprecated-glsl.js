
if (!Glsl.supported()) alert("WebGL is not supported.");

Loader.audios([ "audio/beep1", "audio/beep2", "audio/lose", "audio/win", "audio/bounce"], 
  function (beep1, beep2, lose, win, bounce) {

Loader.text("main.frag", 
  function (mainFrag) {
    var PLAYER_DIMENSION = { x: 0.02, y: 0.2 };

    var hasTouch = ('ontouchstart' in window);
    var now = 0;

    var canvas = document.getElementById("viewport");
    var canvasHeight = canvas.getBoundingClientRect().height;

    var positionWithE = !hasTouch ? function (e) {
        return new Vec2(e.clientX, e.clientY);
      } : function (e) {
        var touch = e.touches[0];
        return new Vec2(touch.pageX, touch.pageY);
      };

    function Vec2(x, y) {
      this.x = x;
      this.y = y;
    }

    Vec2.prototype = {
      clone: function () {
        return new Vec2(this.x, this.y);
      },
      add: function (v) {
        this.x += v.x;
        this.y += v.y;
      },
      multiply: function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
      }
    };

    function Player (position, dimension, xDirection) {
      this.position = position;
      this.dimension = dimension;
      this.shake = new Vec2(0, 0);
      this.count = 0;
      this.lastTouch = -99999;
      this.xDirection = xDirection;
    }

    Player.prototype = {
      update: function () {
        if (this.hasBall()) {
          this.ball.center.y = this.position.y;
          this.ball.center.x = this.position.x+this.xDirection*0.04 + 0.01*Math.sin((now-this.takeBallTime)/100);
          this.shake.x = .01*Math.random();
          this.shake.y = .01*Math.random();
        }
        else {
          this.shake.x = 0;
          this.shake.y = 0;
        }
      },
      hasBall: function () {
        return !!this.ball;
      },
      sendBall: function () {
        this.ball.velocity.x = this.xDirection*(0.0005+0.0001*Math.random());
        this.ball.velocity.y = 0.0001*(0.0005-Math.random());
        this.ball = null;
      },
      obtainBall: function (ball) {
        this.ball = ball;
        ball.shake = this.shake;
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        ball.center.x = this.position.x+0.03*this.xDirection;
        ball.center.y = this.position.y;
        this.takeBallTime = now;
      },
      pushBall: function (ball) {
        this.lastTouch = now;
        ball.velocity.x = this.xDirection*Math.abs(ball.velocity.x);
        var dy = ball.center.y - this.position.y;
        ball.velocity.y += 0.01*dy;
      },
      setY: function (y) {
        this.position.y = Math.max(this.dimension.y/2, Math.min(y, 1-this.dimension.y/2));
      }
    };

    function Ball (center, radius) {
      this.center = center;
      this.radius = radius;
      this.velocity = new Vec2(0, 0);
    }

    Ball.prototype = {
      hitWall: function (touchTop) {
        ball.velocity.y = touchTop * Math.abs(ball.velocity.y);
        play(bounce);
      },
      update: function (delta) {
        if (this.center.y < this.radius)
          this.hitWall(1);
        else if (this.center.y > 1-this.radius)
          this.hitWall(-1);
        var v = this.velocity.clone();
        v.multiply(delta);
        this.center.add(v);
      },
      collidePlayer: function (player) {
        return player.position.x-player.dimension.x/2 <= this.center.x+ball.radius &&
          this.center.x-ball.radius <= player.position.x+player.dimension.x/2 &&
          player.position.y-player.dimension.y/2 <= this.center.y+ball.radius &&
          this.center.y-ball.radius <= player.position.y+player.dimension.y/2;
      }
    };

    // Game states

    var player = new Player(new Vec2(0.02, 0.5), new Vec2(0.02, 0.2), 1);
    var computer = new Player(new Vec2(0.98, 0.5), new Vec2(0.02, 0.2), -1);
    var ball = new Ball(new Vec2(0.05, 0.5), 0.015);

    player.obtainBall(ball);

    var mouseP = new Vec2(0, 0.5);

    if (!hasTouch) {
      canvas.addEventListener("mousemove", function (e) {
        mouseP = positionWithE(e);
      }, false);
      canvas.addEventListener("click", function (e) {
        player.sendBall();
      });
    }
    else {
      canvas.addEventListener("touchmove", function (e) {
        e.preventDefault();
        mouseP = positionWithE(e);
      }, false);
      canvas.addEventListener("touchstart", function (e) {
        e.preventDefault();
        mouseP = positionWithE(e);
        player.sendBall();
      });
    }

    function constraintPlayerY (y) {
      return Math.max(PLAYER_DIMENSION.y/2, Math.min(y, 1-PLAYER_DIMENSION.y/2));
    }

    var lastDecision = 0;
    var moveTargetY = 0.5;
    var moveSpeed = 0.1;
    function computerAI (computer, ball) {
      var now = Date.now();
      var t = now - lastDecision;
      if (t > 500) {
        lastDecision = now;
        if (computer.hasBall()) {
          computer.sendBall();
        }
      }
      moveTargetY = ball.y;
      if (!computer.hasBall() && !player.hasBall()) {
        var delta = computer.position.y - moveTargetY;
        computer.setY(computer.position.y - delta * moveSpeed);
      }
    }

    function play (sound) {
      sound.play();
    }

    var glsl = Glsl({
      canvas: canvas,
      fragment: mainFrag,
      variables: {
        player: player,
        computer: computer,
        ball: ball,
        time: 0
      },
      update: function (t, delta) {
        this.set("time", t);
        now = t;

        player.setY(1 - mouseP.y / canvasHeight);
        player.update(delta);

        computerAI(computer, ball.center);
        computer.update(delta);

        if (ball.collidePlayer(player)) {
          if (player.lastTouch+100<t)
            play(beep1);
          player.pushBall(ball);
        }

        if (ball.collidePlayer(computer)) {
          if (player.lastTouch+100<t)
            play(beep2);
          computer.pushBall(ball);
        }

        ball.update(delta);

        if (ball.center.x > 1.0) {
          player.obtainBall(ball);
          player.count ++;
          play(win);
        }

        if (ball.center.x < 0.0) {
          computer.obtainBall(ball);
          computer.count ++;
          play(lose);
        }

        this.sync("player", "computer", "ball");
      }
    }).start();

  });
});
