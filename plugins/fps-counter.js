// Plugin FPS Counter para EasyOverlay

module.exports = {
  name: 'FPS Counter',
  description: 'Exibe o FPS estimado na overlay da janela selecionada.',
  init(overlayWindow, options = {}) {
    // Cria um elemento para exibir o FPS
    overlayWindow.webContents.executeJavaScript(`
      if (!document.getElementById('fps-counter')) {
        const fpsDiv = document.createElement('div');
        fpsDiv.id = 'fps-counter';
        fpsDiv.style.position = 'fixed';
        fpsDiv.style.top = '10px';
        fpsDiv.style.right = '10px';
        fpsDiv.style.background = 'rgba(0,0,0,0.6)';
        fpsDiv.style.color = '#0f0';
        fpsDiv.style.fontFamily = 'monospace';
        fpsDiv.style.fontSize = '22px';
        fpsDiv.style.padding = '6px 14px';
        fpsDiv.style.borderRadius = '8px';
        fpsDiv.style.zIndex = 9999;
        fpsDiv.innerText = 'FPS: 0';
        document.body.appendChild(fpsDiv);
      }
      let lastFrame = performance.now();
      let frames = 0;
      let fps = 0;
      function loop() {
        frames++;
        const now = performance.now();
        if (now - lastFrame >= 1000) {
          fps = frames;
          frames = 0;
          lastFrame = now;
          document.getElementById('fps-counter').innerText = 'FPS: ' + fps;
        }
        requestAnimationFrame(loop);
      }
      loop();
    `);
  },
  destroy(overlayWindow) {
    overlayWindow.webContents.executeJavaScript(`
      const fpsDiv = document.getElementById('fps-counter');
      if (fpsDiv) fpsDiv.remove();
    `);
  }
}; 