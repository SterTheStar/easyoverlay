#!/bin/bash

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Por favor, instale o Node.js 16 ou superior."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm não encontrado. Por favor, instale o npm."
    exit 1
fi

# Função para detectar a distribuição Linux
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    else
        echo "unknown"
    fi
}

# Instalar dependências do sistema (Linux)
if [ "$(uname)" == "Linux" ]; then
    echo "Instalando dependências do sistema para Linux..."
    DISTRO=$(detect_distro)
    
    case $DISTRO in
        "arch"|"manjaro"|"endeavouros")
            echo "Detectado Arch Linux ou derivado"
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm \
                libx11 \
                xorg-xwininfo \
                wmctrl \
                base-devel \
                python3 \
                make \
                gcc \
                pkg-config
            ;;
        "ubuntu"|"debian"|"linuxmint")
            echo "Detectado Debian ou derivado"
            sudo apt-get update
            sudo apt-get install -y \
                libx11-dev \
                x11-utils \
                wmctrl \
                build-essential \
                python3 \
                make \
                gcc \
                pkg-config
            ;;
        "fedora")
            echo "Detectado Fedora"
            sudo dnf update -y
            sudo dnf install -y \
                libX11-devel \
                xorg-x11-utils \
                wmctrl \
                gcc-c++ \
                python3 \
                make \
                gcc \
                pkgconfig
            ;;
        "opensuse"|"opensuse-tumbleweed")
            echo "Detectado openSUSE"
            sudo zypper update -y
            sudo zypper install -y \
                libX11-devel \
                xorg-x11-utils \
                wmctrl \
                gcc-c++ \
                python3 \
                make \
                gcc \
                pkg-config
            ;;
        *)
            echo "Distribuição não suportada: $DISTRO"
            echo "Por favor, instale manualmente as seguintes dependências:"
            echo "- libX11 (ou libx11-dev)"
            echo "- xorg-xwininfo (ou x11-utils)"
            echo "- wmctrl"
            echo "- gcc/g++ (ou build-essential)"
            echo "- python3"
            echo "- make"
            echo "- pkg-config"
            ;;
    esac
fi

# Instalar dependências do Node.js
echo "Instalando dependências do Node.js..."
npm install

# Criar diretórios necessários
echo "Criando estrutura de diretórios..."
mkdir -p src/plugins
mkdir -p examples
mkdir -p docs

# Copiar exemplo de plugin
echo "Configurando exemplo de plugin..."
cp examples/fps-counter.js src/plugins/

echo "Setup concluído! Para iniciar o projeto:"
echo "1. Modo desenvolvimento: npm run dev"
echo "2. Modo produção: npm start" 