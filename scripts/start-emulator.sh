#!/usr/bin/env bash
set -e

echo "=== Emuladores disponíveis (AVD) ==="
AVDS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && AVDS+=("$line")
done < <(emulator -list-avds 2>/dev/null)

if [[ ${#AVDS[@]} -eq 0 ]]; then
  echo "Nenhum AVD encontrado. Crie um emulador no Android Studio (AVD Manager)."
  exit 1
fi

echo ""
for i in "${!AVDS[@]}"; do
  echo "  $((i + 1))) ${AVDS[$i]}"
done
echo "  0) Sair"
echo ""
read -p "Qual emulador deseja iniciar? " choice

if [[ "$choice" == "0" ]]; then
  echo "Cancelado."
  exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#AVDS[@]} )); then
  echo "Opção inválida."
  exit 1
fi

AVD="${AVDS[$((choice - 1))]}"
echo ""
echo "Iniciando '$AVD' em segundo plano (logs suprimidos)..."
nohup emulator -avd "$AVD" > /dev/null 2>&1 &
echo "Emulador em execução. Use 'adb devices' para verificar quando estiver pronto."
