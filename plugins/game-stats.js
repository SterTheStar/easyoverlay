const os = require('os');
const { exec } = require('child_process');
const path = require('path');

class GameStats {
    constructor(window) {
        this.window = window;
        this.stats = {
            fps: 0,
            cpu: 0,
            memory: 0,
            ping: 0
        };
    }

    async updateStats() {
        // Atualizar uso de CPU
        const cpus = os.cpus();
        const cpuUsage = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b);
            const idle = cpu.times.idle;
            return acc + ((total - idle) / total);
        }, 0) / cpus.length * 100;
        this.stats.cpu = Math.round(cpuUsage);

        // Atualizar uso de memória
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        this.stats.memory = Math.round((1 - freeMem / totalMem) * 100);

        // Simulaçao de ping
        this.stats.ping = Math.round(Math.random() * 30 + 20);

        // Simulaçao de FPS
        this.stats.fps = Math.round(Math.random() * 20 + 140);

        this.window.webContents.send('update-stats', this.stats);
    }

    init() {
        // Carregar HTML do overlay
        this.window.loadFile(path.join(__dirname, 'game-stats', 'overlay.html'));
        
        // Atualizar stats a cada segundo
        setInterval(() => this.updateStats(), 1000);
    }
}

module.exports = {
    init: (window, options) => {
        const stats = new GameStats(window);
        stats.init();
    }
}; 