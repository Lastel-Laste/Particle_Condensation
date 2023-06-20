// FPSCounter.js

var fpsCounter = document.getElementById('fps-counter');
var frameCount = 0;
var startTime = performance.now();

function updateFPSCounter() {
  frameCount++;
  var currentTime = performance.now();
  var deltaTime = currentTime - startTime;

  if (deltaTime >= 1000) {
    var fps = Math.round((frameCount * 1000) / deltaTime);
    fpsCounter.textContent = 'FPS: ' + fps;

    frameCount = 0;
    startTime = currentTime;
  }

  requestAnimationFrame(updateFPSCounter);
}

updateFPSCounter();
