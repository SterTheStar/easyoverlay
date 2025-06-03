const path = require('path');

function init(overlay, options) {
    // Carregar o conteúdo HTML do hub
    overlay.loadFile(path.join(__dirname, 'hub', 'index.html'));

    // Configurar comunicação com o processo principal
    const { ipcRenderer } = require('electron');
    
    // Exemplo de dados
    const mockData = {
        progress: {
            level: 42,
            xp: 7500,
            nextLevel: 10000,
            achievements: [
                { name: 'Primeira Vitória', progress: 100 },
                { name: 'Mestre do Combate', progress: 75 },
                { name: 'Colecionador', progress: 30 }
            ]
        },
        friends: [
            { name: 'João', status: 'online', game: 'Counter-Strike 2' },
            { name: 'Maria', status: 'away', game: 'Valorant' },
            { name: 'Pedro', status: 'offline', lastSeen: '2h atrás' }
        ],
        stats: {
            wins: 156,
            losses: 89,
            kd: 1.75,
            playTime: '127h'
        }
    };

    // Enviar dados para o frontend
    overlay.webContents.on('did-finish-load', () => {
        overlay.webContents.send('hub-data', mockData);
    });

    // Configurar atualizações em tempo real
    setInterval(() => {
        overlay.webContents.send('hub-update', mockData);
    }, 5000);
}

module.exports = {
    init
}; 