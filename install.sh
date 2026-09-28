#!/usr/bin/env bash
# ==============================================================================
#  🎙️  Murmur - Instalador Oficial Universal (One-Liner)
#  Uso: curl -fsSL https://raw.githubusercontent.com/Ismael-Sallami/murmur/main/install.sh | bash
# ==============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

INSTALL_DIR="$HOME/.local/bin"
MURMUR_HOME="$HOME/.murmur"
mkdir -p "$INSTALL_DIR"
mkdir -p "$MURMUR_HOME"

echo -e "${CYAN}"
cat << "EOF"
  __  __                                 
 |  \/  | _   _  _ __  _ __ ___   _   _  _ __ 
 | |\/| || | | || '__|| '_ ` _ \ | | | || '__|
 | |  | || |_| || |   | | | | | || |_| || |   
 |_|  |_| \__,_||_|   |_| |_| |_| \__,_||_|   
EOF
echo -e "${NC}"
echo -e "${BLUE}>>> Instalando Murmur (Whisper + LLMs + MCP) en tu sistema...${NC}\n"

# 1. Detección de Sistema Operativo y Arquitectura
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)     OS_NAME="Linux" ;;
    Darwin*)    OS_NAME="macOS" ;;
    *)          echo -e "${RED}[ERROR] Sistema operativo no compatible: $OS${NC}"; exit 1 ;;
esac

echo -e "${GREEN}[✓] Sistema detectado:${NC} $OS_NAME ($ARCH)"

# 2. Comprobar dependencias de audio (ffmpeg)
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}[!] Aviso: 'ffmpeg' no está instalado.${NC}"
    echo -e "    Es recomendable para procesar y normalizar audios de clase."
    if [ "$OS_NAME" = "Linux" ]; then
        if command -v apt &> /dev/null; then
            echo -e "    Instálalo con: sudo apt install -y ffmpeg"
        elif command -v pacman &> /dev/null; then
            echo -e "    Instálalo con: sudo pacman -S ffmpeg"
        fi
    elif [ "$OS_NAME" = "macOS" ]; then
        echo -e "    Instálalo con: brew install ffmpeg"
    fi
fi

# 3. Comprobar / Instalar uv para gestión de paquetes ultrarrápida
if command -v uv &> /dev/null; then
    UV_BIN="$(command -v uv)"
else
    echo -e "${BLUE}[i] Instalando gestor ligero 'uv'...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    UV_BIN="$HOME/.local/bin/uv"
fi

# 4. Clonar o actualizar el entorno en ~/.murmur
echo -e "${BLUE}[i] Configurando el motor de Murmur en $MURMUR_HOME...${NC}"

# Si se ejecuta desde el propio repo local
if [ -f "./pyproject.toml" ]; then
    REPO_SRC="$(pwd)"
else
    # Si viene por curl | bash, clonar el repositorio en ~/.murmur/repo
    if [ ! -d "$MURMUR_HOME/repo" ]; then
        git clone https://github.com/Ismael-Sallami/murmur.git "$MURMUR_HOME/repo"
    else
        git -C "$MURMUR_HOME/repo" pull origin main
    fi
    REPO_SRC="$MURMUR_HOME/repo"
fi

# 5. Crear entorno virtual aislado
"$UV_BIN" venv --allow-existing "$MURMUR_HOME/venv"
source "$MURMUR_HOME/venv/bin/activate"
"$UV_BIN" pip install -e "$REPO_SRC[dev]"

# 6. Crear wrapper ejecutable en ~/.local/bin/murmur
cat << EOF > "$INSTALL_DIR/murmur"
#!/usr/bin/env bash
source "$MURMUR_HOME/venv/bin/activate"
python -m murmur.main "\$@"
EOF
chmod +x "$INSTALL_DIR/murmur"

# 7. Asegurar que ~/.local/bin esté en el PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    SHELL_RC="$HOME/.bashrc"
    [ -n "$ZSH_VERSION" ] && SHELL_RC="$HOME/.zshrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    echo -e "${YELLOW}[i] Se ha añadido ~/.local/bin a tu $SHELL_RC${NC}"
fi

# 8. Configurar archivo .env inicial si no existe
if [ ! -f "$REPO_SRC/.env" ]; then
    cp "$REPO_SRC/.env.example" "$REPO_SRC/.env"
fi

# 9. Crear acceso directo de escritorio (.desktop) en Linux
if [ "$OS_NAME" = "Linux" ] && [ -d "$HOME/.local/share/applications" ]; then
    cat << EOF > "$HOME/.local/share/applications/murmur.desktop"
[Desktop Entry]
Name=Murmur
Comment=Captura de clases, transcripción con Whisper y apuntes inteligentes
Exec=$INSTALL_DIR/murmur
Icon=audio-input-microphone
Terminal=false
Type=Application
Categories=Education;AudioVideo;Utility;
EOF
    echo -e "${GREEN}[✓] Acceso directo de escritorio creado en tu menú de aplicaciones.${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}    🎉 ¡Murmur se ha instalado correctamente!    ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Puedes iniciar Murmur en cualquier momento escribiendo:"
echo -e "  ${CYAN}murmur${NC}"
echo -e "\nY abrir la aplicación en tu móvil, tablet o PC en:"
echo -e "  ${GREEN}http://localhost:8000${NC}\n"
