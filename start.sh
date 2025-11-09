#!/bin/bash

echo "========================================"
echo "  Iniciando Servidor de Pagos"
echo "  Interledger Open Payments"
echo "========================================"
echo ""
echo "Instalando dependencias (si es necesario)..."
npm install
echo ""
echo "Iniciando servidor..."
echo ""
echo "Una vez iniciado, abre tu navegador en:"
echo "http://localhost:3000"
echo ""
echo "Para detener el servidor, presiona Ctrl+C"
echo ""
npm run server

