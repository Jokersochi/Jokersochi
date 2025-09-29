#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'USAGE'
Usage: setup-wan22-comfyui.sh [options]

Automate a local ComfyUI installation configured for WAN 2.2 text-to-video and image-to-video workflows.

Options:
  -d, --dir <path>           Target directory for the ComfyUI checkout (default: ./ComfyUI)
  -v, --venv <path>          Path to create/use a Python virtual environment (default: <dir>/.venv)
      --token <token>        Hugging Face access token (optional; required for automated downloads)
      --text-model <repo>    Hugging Face repo ID for the text-to-video weights (default: Wan-Community/WAN2.2-Text2Video)
      --text-file <name>     Model filename to download from the text-to-video repo (default: wan2.2_text2video_fp16.safetensors)
      --image-model <repo>   Hugging Face repo ID for the image-to-video weights (default: Wan-Community/WAN2.2-Image2Video)
      --image-file <name>    Model filename to download from the image-to-video repo (default: wan2.2_image2video_fp16.safetensors)
      --skip-models          Skip downloading WAN model weights
  -h, --help                 Show this help message
USAGE
}

resolve_path() {
  python3 - <<'PY'
import os, sys
print(os.path.abspath(os.path.expanduser(sys.argv[1])))
PY
}

ensure_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERROR] Required command '$cmd' is not available. Please install it and retry." >&2
    exit 1
  fi
}

log_step() {
  echo -e "\n[setup-wan22] $1"
}

TARGET_DIR_RAW=""
VENV_PATH_RAW=""
TARGET_DIR=""
VENV_PATH=""
HF_TOKEN=""
TEXT_MODEL_REPO="Wan-Community/WAN2.2-Text2Video"
TEXT_MODEL_FILE="wan2.2_text2video_fp16.safetensors"
IMAGE_MODEL_REPO="Wan-Community/WAN2.2-Image2Video"
IMAGE_MODEL_FILE="wan2.2_image2video_fp16.safetensors"
DOWNLOAD_MODELS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)
      [[ $# -ge 2 ]] || { echo "--dir requires a value" >&2; exit 1; }
      TARGET_DIR_RAW="$2"
      shift 2
      ;;
    -v|--venv)
      [[ $# -ge 2 ]] || { echo "--venv requires a value" >&2; exit 1; }
      VENV_PATH_RAW="$2"
      shift 2
      ;;
    --token)
      [[ $# -ge 2 ]] || { echo "--token requires a value" >&2; exit 1; }
      HF_TOKEN="$2"
      shift 2
      ;;
    --text-model)
      [[ $# -ge 2 ]] || { echo "--text-model requires a value" >&2; exit 1; }
      TEXT_MODEL_REPO="$2"
      shift 2
      ;;
    --text-file)
      [[ $# -ge 2 ]] || { echo "--text-file requires a value" >&2; exit 1; }
      TEXT_MODEL_FILE="$2"
      shift 2
      ;;
    --image-model)
      [[ $# -ge 2 ]] || { echo "--image-model requires a value" >&2; exit 1; }
      IMAGE_MODEL_REPO="$2"
      shift 2
      ;;
    --image-file)
      [[ $# -ge 2 ]] || { echo "--image-file requires a value" >&2; exit 1; }
      IMAGE_MODEL_FILE="$2"
      shift 2
      ;;
    --skip-models)
      DOWNLOAD_MODELS=0
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

ensure_command git
ensure_command python3

if [[ -z "$TARGET_DIR_RAW" ]]; then
  TARGET_DIR="$(resolve_path "./ComfyUI")"
else
  TARGET_DIR="$(resolve_path "$TARGET_DIR_RAW")"
fi

if [[ -z "$VENV_PATH_RAW" ]]; then
  VENV_PATH="$(resolve_path "$TARGET_DIR/.venv")"
else
  VENV_PATH="$(resolve_path "$VENV_PATH_RAW")"
fi

log_step "Preparing target directory at $TARGET_DIR"
mkdir -p "$TARGET_DIR"

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  log_step "Cloning ComfyUI repository"
  git clone https://github.com/comfyanonymous/ComfyUI.git "$TARGET_DIR"
else
  log_step "ComfyUI repository already exists. Skipping clone"
fi

log_step "Creating virtual environment at $VENV_PATH"
python3 -m venv "$VENV_PATH"

PYTHON_BIN="$VENV_PATH/bin/python"
HUGGINGFACE_CLI="$VENV_PATH/bin/huggingface-cli"

log_step "Upgrading pip and installing ComfyUI dependencies"
"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r "$TARGET_DIR/requirements.txt"
"$PYTHON_BIN" -m pip install av imageio-ffmpeg moviepy huggingface_hub

log_step "Ensuring model directories exist"
mkdir -p "$TARGET_DIR/models/checkpoints" \
         "$TARGET_DIR/models/unet" \
         "$TARGET_DIR/models/vae" \
         "$TARGET_DIR/models/clip" \
         "$TARGET_DIR/models/wan" \
         "$TARGET_DIR/custom_nodes"

WAN_NODE_PATH="$TARGET_DIR/custom_nodes/ComfyUI-Wan-Nodes"
if [[ ! -d "$WAN_NODE_PATH/.git" ]]; then
  log_step "Cloning WAN custom nodes"
  git clone https://github.com/Wan-Community/ComfyUI-Wan-Nodes.git "$WAN_NODE_PATH"
else
  log_step "Updating WAN custom nodes"
  git -C "$WAN_NODE_PATH" pull --ff-only
fi

if [[ -f "$WAN_NODE_PATH/requirements.txt" ]]; then
  log_step "Installing WAN node specific dependencies"
  "$PYTHON_BIN" -m pip install -r "$WAN_NODE_PATH/requirements.txt"
fi

if [[ -n "$HF_TOKEN" ]]; then
  log_step "Authenticating with Hugging Face CLI"
  if [[ ! -x "$HUGGINGFACE_CLI" ]]; then
    echo "[ERROR] huggingface-cli not found in $VENV_PATH. Ensure huggingface_hub installed correctly." >&2
    exit 1
  fi
  "$HUGGINGFACE_CLI" login --token "$HF_TOKEN" --add-to-git-credential
else
  echo "[setup-wan22] No Hugging Face token provided. Downloads may fail if the models require authentication."
fi

if [[ $DOWNLOAD_MODELS -eq 1 ]]; then
  if [[ ! -x "$HUGGINGFACE_CLI" ]]; then
    echo "[ERROR] huggingface-cli not found in $VENV_PATH. Cannot download models automatically." >&2
    exit 1
  fi
  download_model() {
    local repo="$1"
    local file="$2"
    local target="$3"
    log_step "Downloading $file from $repo"
    "$HUGGINGFACE_CLI" download "$repo" "$file" \
      --local-dir "$target" \
      --local-dir-use-symlinks False \
      --resume-download
  }

  download_model "$TEXT_MODEL_REPO" "$TEXT_MODEL_FILE" "$TARGET_DIR/models/wan"
  download_model "$IMAGE_MODEL_REPO" "$IMAGE_MODEL_FILE" "$TARGET_DIR/models/wan"
else
  echo "[setup-wan22] Skipping WAN model downloads as requested."
fi

cat <<SUMMARY

[setup-wan22] Installation complete!
- ComfyUI directory: $TARGET_DIR
- Virtual environment: $VENV_PATH
- WAN custom nodes: $WAN_NODE_PATH
- Models directory: $TARGET_DIR/models/wan

To start ComfyUI:
  source "$VENV_PATH/bin/activate"
  python "$TARGET_DIR/main.py" --listen 0.0.0.0 --port 8188
SUMMARY
