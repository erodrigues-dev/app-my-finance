#!/usr/bin/env bash
set -e

echo "=== Emuladores conectados (adb) ==="
EMUS=()
while IFS= read -r line; do
  id=$(echo "$line" | awk '{print $1}')
  if [[ "$id" == emulator-* ]]; then
    EMUS+=("$id")
  fi
done < <(adb devices -l | grep -w "device" | grep -v "List of devices")

if [[ ${#EMUS[@]} -eq 0 ]]; then
  echo "Nenhum emulador conectado."
  exit 0
fi

echo ""
for i in "${!EMUS[@]}"; do
  echo "  $((i + 1))) ${EMUS[$i]}"
done
echo "  a) Desligar todos"
echo "  0) Sair"
echo ""
read -p "Qual emulador deseja desligar? " choice

if [[ "$choice" == "0" ]]; then
  echo "Cancelado."
  exit 0
fi

if [[ "$choice" == "a" || "$choice" == "A" ]]; then
  for id in "${EMUS[@]}"; do
    echo "Desligando $id..."
    adb -s "$id" emu kill
  done
  echo "Todos os emuladores foram desligados."
  exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#EMUS[@]} )); then
  echo "Opção inválida."
  exit 1
fi

SELECTED="${EMUS[$((choice - 1))]}"
echo "Desligando $SELECTED..."
adb -s "$SELECTED" emu kill
echo "Emulador desligado."
