# EasyOverlay

Sistema de overlay modular e extensível para desktop com suporte a Windows (Em testes) e Linux (Alpha).

## Características

- Múltiplos overlays com controle de posição, tamanho e opacidade
- Sistema de plugins com hot reload
- Identificação e acoplamento automático de janelas
- API WebSocket para comunicação externa
- Sistema de eventos para sincronização de janelas

## Requisitos do Sistema

### Windows
- Windows 10 ou superior
- Node.js 16+
- node-window-manager (instalado automaticamente)

### Linux
- X11 Window System
- Dependências:
  - x11-utils
  - wmctrl
  - libx11-dev
  - build-essential
  - pkg-config

## Instalação

```bash
# Clone o repositório
git clone https://github.com/SterTheStar/easyoverlay.git
cd easy-overlay

# Execute o script de setup
./setup.sh

# Instale as dependências
npm install

# Inicie em modo desenvolvimento
npm run dev
```

## Plugins Disponíveis (Simulados)

### 1. Contador de FPS (fps-counter)
- Mostra FPS simulado

### 2. Hub de Jogo (hub)
- Interface central para informações do jogo

### 3. Estatísticas do Jogo (game-stats)
- Monitoramento simulado:
  - FPS
  - Ping
  - Uso de CPU
  - Uso de Memória RAM

## Estrutura do Projeto

```
easy-overlay/
├── src/
│   ├── core/           # Núcleo do sistema
│   │   ├── window-manager.js    # Gerenciamento de janelas
│   │   └── plugin-manager.js    # Sistema de plugins
│   ├── plugins/        # Plugins do sistema
│   ├── ui/            # Interface do usuário
│   │   ├── index.html    # Painel de controle
│   │   └── overlay.html  # Template de overlay
│   └── config/        # Configurações
├── examples/          # Exemplos de uso
└── docs/             # Documentação
```

## API WebSocket

O sistema expõe uma API WebSocket na porta 8081 com os seguintes endpoints:

### Eventos de Envio
- `createOverlay`: Cria um novo overlay
- `updateOverlay`: Atualiza propriedades do overlay
- `removeOverlay`: Remove um overlay
- `listWindows`: Lista janelas disponíveis

### Eventos de Recebimento
- `overlayCreated`: Confirmação de criação
- `windowsList`: Lista de janelas ativas
- `game-launched`: Status de lançamento de jogo
- `update-stats`: Atualização de estatísticas

## Configuração

O arquivo `src/config/default.json` permite configurar:
- Dimensões padrão dos overlays
- Portas do servidor
- Configurações de plugins
- Comportamento das janelas

## Desenvolvimento de Plugins

Para criar um novo plugin:

1. Crie um arquivo `.js` na pasta `plugins/`
2. Implemente a interface básica:
   ```javascript
   module.exports = {
       init: (window, options) => {
           // Inicialização do plugin
       }
   };
   ```
3. Opcional: Adicione um arquivo HTML para interface

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Crie um Pull Request

## Autores

- Esther 
