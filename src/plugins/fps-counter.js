class FPSCounter {
    constructor() {
        this.fps = 0;
        this.frames = 0;
        this.lastTime = performance.now();
        this.content = document.getElementById('content');
    }

    start() {
        this.update();
    }

    update() {
        this.frames++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        if (elapsed >= 1000) {
            this.fps = Math.round((this.frames * 1000) / elapsed);
            this.frames = 0;
            this.lastTime = currentTime;
            this.render();
        }

        requestAnimationFrame(() => this.update());
    }

    render() {
        this.content.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.7);
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 24px;
                font-weight: bold;
            ">
                ${this.fps} FPS
            </div>
        `;
    }
}

// Inicializar o plugin
const fpsCounter = new FPSCounter();
fpsCounter.start(); 