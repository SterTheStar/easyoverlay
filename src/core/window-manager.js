let NodeWindowManager;
if (process.platform === 'win32') {
  NodeWindowManager = require('node-window-manager').WindowManager;
}
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { execSync } = require('child_process');

class EasyOverlayWindowManager {
    constructor() {
        if (process.platform === 'win32') {
            this.windowManager = new NodeWindowManager();
        }
        this.windows = new Map();
        this.windowChangeListeners = new Map();
        this.windowFocusListeners = new Map();
        this.windowMinimizeListeners = new Map();
        this.initialize();
    }

    async initialize() {
        if (process.platform === 'linux') {
            this.initializeLinux();
        }
    }

    async initializeLinux() {
        try {
            // Verifica se xwininfo está instalado
            await execPromise('which xwininfo');
        } catch (error) {
            console.error('Erro ao inicializar gerenciador de janelas Linux:', error);
        }
    }

    async getWindows() {
        if (process.platform === 'win32') {
            return this.getWindowsWindows();
        } else if (process.platform === 'linux') {
            return await this.getWindowsLinux();
        }
        return [];
    }

    getWindowsWindows() {
        const windows = this.windowManager.getWindows();
        return windows.map(window => ({
            id: window.id,
            title: window.getTitle(),
            bounds: window.getBounds(),
            processId: window.processId
        }));
    }

    async getWindowsLinux() {
        try {
            const { stdout } = await execPromise('wmctrl -l');
            const windows = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [id, desktop, host, ...titleArr] = line.split(/\s+/);
                    const title = titleArr.join(' ');
                    return {
                        id,
                        title,
                        desktop: parseInt(desktop),
                        host
                    };
                });

            // Obter informações adicionais para cada janela
            const windowsWithInfo = await Promise.all(windows.map(async window => {
                try {
                    const { stdout: geometry } = await execPromise(`xwininfo -id ${window.id} -stats`);
                    const bounds = this.parseXwininfoGeometry(geometry);
                    return {
                        ...window,
                        bounds
                    };
                } catch (error) {
                    return window;
                }
            }));

            return windowsWithInfo;
        } catch (error) {
            console.error('Erro ao obter janelas no Linux:', error);
            return [];
        }
    }

    parseXwininfoGeometry(geometry) {
        const x = parseInt(geometry.match(/Absolute upper-left X:\s*(\d+)/)?.[1] || '0');
        const y = parseInt(geometry.match(/Absolute upper-left Y:\s*(\d+)/)?.[1] || '0');
        const width = parseInt(geometry.match(/Width:\s*(\d+)/)?.[1] || '0');
        const height = parseInt(geometry.match(/Height:\s*(\d+)/)?.[1] || '0');

        return { x, y, width, height };
    }

    async findWindowByTitle(title) {
        const windows = await this.getWindows();
        return windows.find(window => 
            window.title.toLowerCase().includes(title.toLowerCase())
        );
    }

    async findWindowByPid(pid) {
        const windows = await this.getWindows();
        return windows.find(window => window.processId === pid);
    }

    async attachToWindow(windowId, overlayId) {
        try {
            const window = await this.getWindowInfo(windowId);
            if (window) {
                this.windows.set(overlayId, {
                    windowId,
                    bounds: window.bounds
                });
                return true;
            }
        } catch (error) {
            console.error('Erro ao anexar janela:', error);
        }
        return false;
    }

    async getWindowInfo(windowId) {
        try {
            if (process.platform === 'linux') {
                const { stdout } = await execPromise(`xwininfo -id ${windowId} -stats`);
                const bounds = this.parseXwininfoGeometry(stdout);
                const isMinimized = stdout.includes('IsUnMapped') || stdout.includes('Minimized');
                return { id: windowId, bounds, isMinimized };
            } else if (process.platform === 'win32') {
                const window = this.windowManager.getWindow(windowId);
                if (window) {
                    return {
                        id: windowId,
                        bounds: window.getBounds(),
                        isMinimized: window.isMinimized()
                    };
                }
            }
        } catch (error) {
            console.error('Erro ao obter informações da janela:', error);
        }
        return null;
    }

    detachFromWindow(overlayId) {
        return this.windows.delete(overlayId);
    }

    async updateOverlayPosition(overlayId, x, y) {
        const windowInfo = this.windows.get(overlayId);
        if (windowInfo) {
            const window = await this.getWindowInfo(windowInfo.windowId);
            if (window) {
                return {
                    x: window.bounds.x + x,
                    y: window.bounds.y + y
                };
            }
        }
        return { x, y };
    }

    cleanup() {
        this.windows.clear();
    }

    async getWindowBounds(windowId) {
        const windowInfo = await this.getWindowInfo(windowId);
        return windowInfo?.bounds;
    }

    async isWindowVisible(windowId) {
        try {
            if (process.platform === 'linux') {
                const { stdout } = await execPromise(`xwininfo -id ${windowId} -stats`);
                return !stdout.includes('Hidden');
            } else if (process.platform === 'win32') {
                const window = this.windowManager.getWindow(windowId);
                return window ? window.isVisible() : false;
            }
        } catch (error) {
            console.error('Erro ao verificar visibilidade da janela:', error);
        }
        return false;
    }

    onWindowChange(windowId, callback) {
        if (!this.windowChangeListeners.has(windowId)) {
            this.windowChangeListeners.set(windowId, new Set());
        }
        this.windowChangeListeners.get(windowId).add(callback);

        // Iniciar monitoramento da janela
        this.startWindowMonitoring(windowId);
    }

    offWindowChange(windowId, callback) {
        const listeners = this.windowChangeListeners.get(windowId);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.windowChangeListeners.delete(windowId);
            }
        }
    }

    async startWindowMonitoring(windowId) {
        if (process.platform === 'linux') {
            // No Linux, usamos xwininfo para monitorar mudanças
            const checkWindow = async () => {
                try {
                    const { stdout } = await execPromise(`xwininfo -id ${windowId} -stats`);
                    const bounds = this.parseXwininfoGeometry(stdout);
                    const isVisible = !stdout.includes('Hidden');

                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                } catch (error) {
                    // Janela não encontrada ou erro de acesso
                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                }
            };

            // Verificar a cada 100ms
            setInterval(checkWindow, 100);
        } else if (process.platform === 'win32') {
            // No Windows, usamos o evento nativo do node-window-manager
            const window = this.windowManager.getWindow(windowId);
            if (window) {
                window.on('move', () => {
                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                });
                window.on('resize', () => {
                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                });
                window.on('hide', () => {
                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                });
                window.on('show', () => {
                    const listeners = this.windowChangeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback());
                    }
                });
            }
        }
    }

    onWindowFocusChange(windowId, callback) {
        if (!this.windowFocusListeners.has(windowId)) {
            this.windowFocusListeners.set(windowId, new Set());
        }
        this.windowFocusListeners.get(windowId).add(callback);

        // Iniciar monitoramento de foco
        this.startFocusMonitoring(windowId);
    }

    offWindowFocusChange(windowId, callback) {
        const listeners = this.windowFocusListeners.get(windowId);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.windowFocusListeners.delete(windowId);
            }
        }
    }

    async startFocusMonitoring(windowId) {
        if (process.platform === 'linux') {
            // No Linux
            const checkFocus = async () => {
                try {
                    const { stdout } = await execPromise(`xwininfo -id ${windowId} -stats`);
                    const hasFocus = stdout.includes('Input focus');
                    
                    const listeners = this.windowFocusListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(hasFocus));
                    }
                } catch (error) {
                    // Janela não encontrada ou erro de acesso
                    const listeners = this.windowFocusListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(false));
                    }
                }
            };

            // Verificar a cada 100ms
            setInterval(checkFocus, 100);
        } else if (process.platform === 'win32') {
            // No Windows
            const window = this.windowManager.getWindow(windowId);
            if (window) {
                window.on('focus', () => {
                    const listeners = this.windowFocusListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(true));
                    }
                });
                window.on('blur', () => {
                    const listeners = this.windowFocusListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(false));
                    }
                });
            }
        }
    }

    onWindowMinimize(windowId, callback) {
        if (!this.windowMinimizeListeners.has(windowId)) {
            this.windowMinimizeListeners.set(windowId, new Set());
        }
        this.windowMinimizeListeners.get(windowId).add(callback);
        this.startMinimizeMonitoring(windowId);
    }

    offWindowMinimize(windowId, callback) {
        const listeners = this.windowMinimizeListeners.get(windowId);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.windowMinimizeListeners.delete(windowId);
            }
        }
    }

    async startMinimizeMonitoring(windowId) {
        if (process.platform === 'linux') {
            let lastMinimizedState = false;

            const checkMinimized = async () => {
                try {
                    const windowInfo = await this.getWindowInfo(windowId);
                    if (windowInfo && windowInfo.isMinimized !== lastMinimizedState) {
                        lastMinimizedState = windowInfo.isMinimized;
                        const listeners = this.windowMinimizeListeners.get(windowId);
                        if (listeners) {
                            listeners.forEach(callback => callback(lastMinimizedState));
                        }
                    }
                } catch (error) {
                    console.error('Erro ao monitorar estado de minimização:', error);
                }
            };

            // Verificar a cada 100ms
            setInterval(checkMinimized, 100);
        } else if (process.platform === 'win32') {
            const window = this.windowManager.getWindow(windowId);
            if (window) {
                window.on('minimize', () => {
                    const listeners = this.windowMinimizeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(true));
                    }
                });

                window.on('restore', () => {
                    const listeners = this.windowMinimizeListeners.get(windowId);
                    if (listeners) {
                        listeners.forEach(callback => callback(false));
                    }
                });
            }
        }
    }
}

module.exports = new EasyOverlayWindowManager(); 