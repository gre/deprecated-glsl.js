
if (!Glsl.supported()) alert("WebGL is not supported.");

Loader.audios([ "audio/beep1", "audio/beep2", "audio/lose", "audio/win", "audio/bounce"], 
  function (beep1, beep2, lose, win, bounce) {

  var BUFFERS = 5;
  var sounds = [beep1, beep2, lose, win, bounce];
  var buffers = [];
  var currents = [];
  for (var i=0; i<sounds.length; ++i) {
    var buffer = buffers[i] = [];
    currents[i] = 0;
    for (var j=0; j<BUFFERS; ++j) {
      var n = sounds[i].cloneNode();
      n.innerHTML = sounds[i].innerHTML;
      n.load();
      buffer[j] = n;
    }
  }

  function play (sound) {
    var i = sounds.indexOf(sound);
    var curr = currents[i];
    buffers[i][curr].play();
    currents[i] = curr+1<BUFFERS ? curr+1 : 0;
  }

Loader.text("main.frag", 
  function (mainFrag) {
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
      this.countSucc = 0;
      this.lastTouch = -99999;
      this.xDirection = xDirection;
      this.balls = [];
    }

    Player.prototype = {
      update: function () {
        this.dimension.y = 0.2 + Math.min(0.2, this.countSucc/40);

        if (this.hasBall()) {
          for (var i=0; i<this.balls.length; ++i) {
            var ball = this.balls[i];
            ball.center.y = this.position.y;
            ball.center.x = this.position.x+this.xDirection*0.04 + 0.01*Math.sin((now-this.takeBallTime)/100);
          }
          this.shake.x = .01*Math.random();
          this.shake.y = .01*Math.random();
        }
        else {
          this.shake.x = 0;
          this.shake.y = 0;
        }
      },
      hasBall: function () {
        return this.balls.length>0;
      },
      sendBall: function () {
        var ball = this.balls.pop();
        if (ball===undefined) return;
        ball.velocity.x = this.xDirection*(0.0005+0.0001*Math.random());
        ball.velocity.y = 0.0001*(0.0005-Math.random());
      },
      obtainBall: function (ball) {
        this.balls.push(ball);
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
      this.shake = new Vec2(0, 0);
      this.creationTime = now;
    }

    Ball.prototype = {
      hitWall: function (touchTop) {
        this.velocity.y = touchTop * Math.abs(this.velocity.y);
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
        return player.position.x-player.dimension.x/2 <= this.center.x+this.radius &&
          this.center.x-this.radius <= player.position.x+player.dimension.x/2 &&
          player.position.y-player.dimension.y/2 <= this.center.y+this.radius &&
          this.center.y-this.radius <= player.position.y+player.dimension.y/2;
      }
    };

    // Game states

    var player = new Player(new Vec2(0.05, 0.5), new Vec2(0.01, 0.2), 1);
    var computer = new Player(new Vec2(0.95, 0.5), new Vec2(0.01, 0.2), -1);
    var balls = [];

    function addBall () {
      var b = new Ball(new Vec2(0.5, 0.5), 0.015);
      balls.push(b);
      return b;
    }

    function removeBall (ball) {
      var i = balls.indexOf(ball);
      i!=-1 && balls.splice(i, 1);
    }

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

    var lastSend = 0;
    var lastDirection = 0;
    var moveTargetY = 0.5;
    var moveSpeed = 0.1;
    var decisionDirectionFreq = 0;
    function computerAI (computer) {
      var now = Date.now();
      var t = now - lastSend;
      if (t > 1000) {
        lastSend = now;
        if (computer.hasBall()) {
          computer.sendBall();
        }
      }
      t = now - lastDirection;
      if (t > decisionDirectionFreq) {
        decisionDirectionFreq = 20 + (computer.count-player.count)*50;
        lastDirection = now;
        if (balls.length == 0) return;
        var ball = balls[0];
        for (var i=0; i<balls.length; i++) {
          var b = balls[i];
          if (b.center.x > ball.center.x)
            ball = b;
        }
        var prediction = decisionDirectionFreq*ball.velocity.y*(computer.position.x-ball.center.x);
        moveTargetY = ball.center.y + prediction;
      }
      var delta = computer.position.y - moveTargetY;
      computer.setY(computer.position.y - delta * moveSpeed);
    }

    var ballAddFrequency = 7000;

    var MAX_BALLS;
    var lastBallAdded = 0;

    var glsl = Glsl({
      canvas: canvas,
      fragment: mainFrag,
      variables: {
        player: player,
        computer: computer,
        balls: balls,
        ballsLength: balls.length,
        lastBallFail: -99999,
        time: 0
      },
      init: function () {
        MAX_BALLS = this.defines.MAX_BALLS;
        player.obtainBall(addBall());
      },
      update: function (t, delta) {
        this.set("time", t);
        now = t;

        if (t-lastBallAdded > ballAddFrequency && balls.length<MAX_BALLS) {
          lastBallAdded = t;
          var b = addBall();
          var a = Math.random()*Math.PI*2;
          if (Math.abs(a%Math.PI-Math.PI/2)<Math.PI/4) {
            a+= Math.PI/2;
          }
          b.velocity.x = Math.cos(a)*0.0006;
          b.velocity.y = Math.sin(a)*0.0006;
          ballAddFrequency = Math.max(1000, ballAddFrequency*0.96);
        }

        player.setY(1 - mouseP.y / canvasHeight);
        player.update(delta);

        computerAI(computer);
        computer.update(delta);

        for (var i=0; i<balls.length; ++i) {
          var ball = balls[i];
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
            removeBall(ball);
            if (balls.length == 0)
              player.obtainBall(addBall());
            player.count ++;
            player.countSucc ++;
            computer.countSucc = 0;
            play(win);
          }

          if (ball.center.x < 0.0) {
            removeBall(ball);
            if (balls.length == 0)
              computer.obtainBall(addBall());
            computer.count ++;
            computer.countSucc ++;
            player.countSucc = 0;
            play(lose);
            this.set("lastBallFail", t);
          }
        }

        this.set("ballsLength", balls.length);
        this.sync("player", "computer", "balls");
      }
    }).start();

  });
});
