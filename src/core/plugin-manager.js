const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.pluginDir = path.join(__dirname, '..', 'plugins');
        this.watcher = null;
    }

    initialize() {
        // Criar diretório de plugins
        if (!fs.existsSync(this.pluginDir)) {
            fs.mkdirSync(this.pluginDir, { recursive: true });
        }

        // Iniciar watcher para hot reload
        this.watcher = chokidar.watch(this.pluginDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        this.watcher
            .on('add', (filepath) => this.loadPlugin(filepath))
            .on('change', (filepath) => this.reloadPlugin(filepath))
            .on('unlink', (filepath) => this.unloadPlugin(filepath));

        // Carregar plugins existentes
        this.loadExistingPlugins();
    }

    loadExistingPlugins() {
        const files = fs.readdirSync(this.pluginDir);
        files.forEach(file => {
            if (file.endsWith('.js')) {
                const filepath = path.join(this.pluginDir, file);
                this.loadPlugin(filepath);
            }
        });
    }

    loadPlugin(filepath) {
        try {
            const pluginName = path.basename(filepath, '.js');
            const plugin = require(filepath);
            
            if (typeof plugin.initialize === 'function') {
                plugin.initialize();
            }

            this.plugins.set(pluginName, {
                instance: plugin,
                filepath: filepath
            });

            console.log(`Plugin carregado: ${pluginName}`);
            return true;
        } catch (error) {
            console.error(`Erro ao carregar plugin ${filepath}:`, error);
            return false;
        }
    }

    reloadPlugin(filepath) {
        const pluginName = path.basename(filepath, '.js');
        const plugin = this.plugins.get(pluginName);

        if (plugin) {
            // Limpar cache do módulo
            delete require.cache[require.resolve(filepath)];
            
            // Recarregar plugin
            this.unloadPlugin(filepath);
            this.loadPlugin(filepath);
            
            console.log(`Plugin recarregado: ${pluginName}`);
        }
    }

    unloadPlugin(filepath) {
        const pluginName = path.basename(filepath, '.js');
        const plugin = this.plugins.get(pluginName);

        if (plugin) {
            if (typeof plugin.instance.cleanup === 'function') {
                plugin.instance.cleanup();
            }

            this.plugins.delete(pluginName);
            console.log(`Plugin descarregado: ${pluginName}`);
        }
    }

    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }

    getAllPlugins() {
        return Array.from(this.plugins.keys());
    }

    cleanup() {
        if (this.watcher) {
            this.watcher.close();
        }

        // Limpar todos os plugins
        this.plugins.forEach((plugin, name) => {
            this.unloadPlugin(plugin.filepath);
        });
    }
}

module.exports = new PluginManager(); 