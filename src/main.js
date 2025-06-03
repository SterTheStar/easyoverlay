const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const windowManager = require('./core/window-manager');

// Configuração do servidor Express
const expressApp = express();
const port = 8080;

// Configuração do WebSocket
const wss = new WebSocket.Server({ port: 8081 });

// Armazenamento de overlays
const overlays = new Map();
const overlayTargets = new Map(); // Mapeia overlays para suas janelas alvo

// Função para sincronizar overlay com a janela alvo
function syncOverlayWithWindow(overlayId, targetWindowId) {
  const overlay = overlays.get(overlayId);
  if (!overlay) return;

  windowManager.getWindowInfo(targetWindowId).then(windowInfo => {
    if (!windowInfo) return;

    // Sincronizar posição e tamanho
    if (windowInfo.bounds) {
      overlay.setBounds(windowInfo.bounds);
    }

    // Sincronizar visibilidade e estado de minimização
    windowManager.isWindowVisible(targetWindowId).then(isVisible => {
      if (isVisible) {
        overlay.show();
        // Verificar se a janela está minimizada
        if (windowInfo.isMinimized) {
          overlay.minimize();
        } else {
          overlay.restore();
        }
      } else {
        overlay.hide();
      }
    });
  });
}

// Configuração da janela principal
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Criar overlay
function createOverlay(options) {
  const overlay = new BrowserWindow({
    width: options.width || 300,
    height: options.height || 200,
    x: options.x || 0,
    y: options.y || 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlay.setIgnoreMouseEvents(options.clickThrough || false);
  overlay.loadFile(path.join(__dirname, 'ui', 'overlay.html'));

  const id = Date.now().toString();
  overlays.set(id, overlay);

  // Carregar plugin se especificado
  if (options.plugin) {
    try {
      const plugin = require(`../plugins/${options.plugin}`);
      if (plugin.init) {
        plugin.init(overlay, options);
      }
    } catch (error) {
      console.error(`Erro ao carregar plugin ${options.plugin}:`, error);
    }
  }

  // Anexar à janela se especificado
  if (options.attachTo) {
    windowManager.attachToWindow(options.attachTo, id).then(success => {
      if (success) {
        console.log(`Overlay ${id} anexado à janela ${options.attachTo}`);
        overlayTargets.set(id, options.attachTo);
        
        // Configurar sincronização inicial
        syncOverlayWithWindow(id, options.attachTo);
        
        // Configurar listener para mudanças na janela alvo
        windowManager.onWindowChange(options.attachTo, () => {
          syncOverlayWithWindow(id, options.attachTo);
          overlay.moveTop();
        });

        // Configurar listener para mudanças de foco
        windowManager.onWindowFocusChange(options.attachTo, (hasFocus) => {
          if (hasFocus) {
            overlay.setAlwaysOnTop(true);
            overlay.moveTop();
          } else {
            overlay.setAlwaysOnTop(false);
            overlay.moveBottom();
          }
        });

        // Configurar listener para minimização
        windowManager.onWindowMinimize(options.attachTo, (isMinimized) => {
          if (isMinimized) {
            overlay.minimize();
          } else {
            overlay.restore();
            overlay.moveTop();
          }
        });
      } else {
        console.error(`Falha ao anexar overlay ${id} à janela ${options.attachTo}`);
      }
    });
  }

  return id;
}

// Eventos do Electron
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// API WebSocket
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'createOverlay':
          const id = createOverlay(data.options);
          ws.send(JSON.stringify({ type: 'overlayCreated', id }));
          break;
          
        case 'updateOverlay':
          const overlay = overlays.get(data.id);
          if (overlay) {
            if (data.options.position) {
              overlay.setPosition(data.options.position.x, data.options.position.y);
            }
            if (data.options.size) {
              overlay.setSize(data.options.size.width, data.options.size.height);
            }
            if (data.options.opacity !== undefined) {
              overlay.setOpacity(data.options.opacity);
            }
            if (data.options.clickThrough !== undefined) {
              overlay.setIgnoreMouseEvents(data.options.clickThrough);
            }
          }
          break;
          
        case 'removeOverlay':
          const overlayToRemove = overlays.get(data.id);
          if (overlayToRemove) {
            // Remover listeners antes de fechar
            const targetWindowId = overlayTargets.get(data.id);
            if (targetWindowId) {
              // Remover listener de mudanças
              windowManager.offWindowChange(targetWindowId, () => {
                syncOverlayWithWindow(data.id, targetWindowId);
              });
              // Remover listener de foco
              windowManager.offWindowFocusChange(targetWindowId, (hasFocus) => {
                if (hasFocus) {
                  overlayToRemove.moveTop();
                } else {
                  overlayToRemove.moveBottom();
                }
              });
              overlayTargets.delete(data.id);
            }
            overlayToRemove.close();
            overlays.delete(data.id);
          }
          break;
        case 'listWindows':
          windowManager.getWindows().then(windows => {
            ws.send(JSON.stringify({ type: 'windowsList', windows }));
          });
          break;
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });
});

// Iniciar servidor Express
expressApp.listen(port, () => {
  console.log(`Servidor Express rodando na porta ${port}`);
}); 