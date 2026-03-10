#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"

cd "$PROJECT_ROOT"

echo "=== Dispositivos conectados (adb) ==="
DEVICES=()
while IFS= read -r line; do
  id=$(echo "$line" | awk '{print $1}')
  [[ -n "$id" ]] && DEVICES+=("$id")
done < <(adb devices -l | grep -w "device" | grep -v "List of devices")

if [[ ${#DEVICES[@]} -eq 0 ]]; then
  echo "Nenhum dispositivo encontrado. Conecte um device ou inicie um emulador."
  exit 1
fi

echo ""
for i in "${!DEVICES[@]}"; do
  echo "  $((i + 1))) ${DEVICES[$i]}"
done
echo "  0) Sair"
echo ""
read -p "Selecione o dispositivo (número): " choice

if [[ "$choice" == "0" ]]; then
  echo "Cancelado."
  exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#DEVICES[@]} )); then
  echo "Opção inválida."
  exit 1
fi

SELECTED="${DEVICES[$((choice - 1))]}"
echo ""
echo "Dispositivo selecionado: $SELECTED"
echo ""

echo "=== Build do APK (npm run apk:release) ==="
npm run apk:release

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK não encontrado em: $APK_PATH"
  exit 1
fi

echo ""
echo "=== Instalando no dispositivo $SELECTED ==="
adb -s "$SELECTED" install -r "$APK_PATH"

echo ""
echo "Instalação concluída."
