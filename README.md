# 💸 Open Payments - Interfaz Web

Una interfaz web simple y moderna para enviar pagos usando Interledger Open Payments.

## 🚀 Características

- ✨ Interfaz web intuitiva y moderna
- 💳 Envía pagos a cualquier wallet de Interledger
- 🔒 Seguro y basado en el protocolo Open Payments
- 📊 Visualización del estado de la wallet
- 🎯 Proceso de pago simplificado

## 📋 Requisitos Previos

- Node.js (versión 14 o superior)
- Una wallet de Interledger con claves de desarrollador configuradas
- Acceso a la red de prueba de Interledger

## 🛠️ Instalación

1. **Clonar el repositorio** (o descargar los archivos)

2. **Instalar dependencias:**
```bash
npm install
```
O si usas pnpm:
```bash
pnpm install
```

3. **Configurar variables de entorno:**

Crea un archivo `.env` en la raíz del proyecto con la siguiente información:

```env
KEY_ID=tu-key-id-aquí
WALLET_URL=https://ilp.interledger-test.dev/tu-wallet-id
PRIVATE_KEY_PATH=./keys/private_python.key
PUBLIC_KEY_PATH=./keys/public_python.key
PORT=3000
```

Reemplaza los valores con tu información:
- `KEY_ID`: El ID de tu clave de desarrollador
- `WALLET_URL`: La URL de tu wallet de Interledger
- `PRIVATE_KEY_PATH`: Ruta a tu archivo de clave privada
- `PUBLIC_KEY_PATH`: Ruta a tu archivo de clave pública
- `PORT`: Puerto en el que se ejecutará el servidor (opcional, default: 3000)

4. **Asegúrate de tener tus claves:**

Coloca tus archivos de clave privada y pública en la carpeta `keys/`:
- `keys/private_python.key`
- `keys/public_python.key`

## 🎮 Uso

### Iniciar el Servidor Web

```bash
npm run server
```

O con pnpm:
```bash
pnpm server
```

El servidor se iniciará en `http://localhost:3000` (o el puerto que hayas configurado).

### Usar la Interfaz Web

1. Abre tu navegador y ve a `http://localhost:3000`
2. Verás el estado de tu wallet en la parte superior
3. Completa el formulario:
   - **URL de Wallet Destino**: La URL completa de la wallet que recibirá el pago
   - **Monto**: El monto a enviar (en la menor unidad de la moneda, ej: centavos)
   - **Descripción**: (Opcional) Una nota sobre el pago
4. Haz clic en "Enviar Pago"
5. Espera a que se procese el pago
6. ¡Verás una confirmación con los detalles del pago!

### Ejemplo de Uso

Si tu wallet tiene USD con escala 2:
- Monto: `100` = $1.00 USD
- Monto: `500` = $5.00 USD
- Monto: `1000` = $10.00 USD

## 🔧 Modo CLI (Línea de Comandos)

También puedes usar la aplicación en modo CLI:

```bash
npm start
```

O con configuración desde el archivo .env:
```bash
npm run start:config
```

## 📁 Estructura del Proyecto

```
.
├── README.md
├── index.js                    # CLI principal
├── server.js                   # Servidor web Express
├── package.json
├── .env                        # Variables de entorno (no incluido)
├── keys/
│   ├── private_python.key      # Tu clave privada (no incluido)
│   └── public_python.key       # Tu clave pública (no incluido)
├── public/
│   └── index.html              # Interfaz web
└── src/
    ├── handlers/
    │   ├── incoming-payment.js
    │   ├── outgoing-payment.js
    │   ├── quote.js
    │   ├── scenario.js
    │   └── session.js
    └── utils.js
```

## 🔐 Seguridad

- **NUNCA** compartas tu clave privada
- **NUNCA** subas tu archivo `.env` a GitHub
- Las claves están en `.gitignore` por defecto
- Usa solo en redes de prueba hasta que estés seguro

## 🐛 Solución de Problemas

### Error: "No se pudo conectar"
- Verifica que tu archivo `.env` esté configurado correctamente
- Asegúrate de que tu `WALLET_URL` y `KEY_ID` sean válidos
- Verifica que tus archivos de clave existan en la carpeta `keys/`

### Error: "Grant no aprobado"
- Algunos pagos requieren aprobación interactiva
- Si aparece una URL de interacción, ábrela en tu navegador para aprobar el pago
- La URL de interacción aparecerá en el mensaje de error

### Error: "Invalid grant"
- Verifica que tu clave privada corresponda a la clave pública registrada en tu wallet
- Asegúrate de que tu `KEY_ID` sea correcto

## 📚 Recursos

- [Documentación de Open Payments](https://openpayments.guide/)
- [Interledger Foundation](https://interledger.org/)
- [Red de Prueba de Interledger](https://interledger-test.dev/)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

## 📄 Licencia

ISC

## 🙏 Agradecimientos

Basado en el SDK de Open Payments de Interledger Foundation.
