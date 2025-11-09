# 📋 Instrucciones Completas - Todo Listo

## ✅ ¿Qué se ha creado?

He configurado completamente tu repositorio con una interfaz web para enviar pagos de Interledger. Aquí está todo lo nuevo:

### Archivos Nuevos:

1. **`server.js`** - Servidor web Express con API para pagos
2. **`public/index.html`** - Interfaz web moderna y responsive
3. **`README.md`** - Documentación completa
4. **`GUIA_RAPIDA.md`** - Guía rápida de uso
5. **`start.bat`** - Script de inicio para Windows
6. **`start.sh`** - Script de inicio para Linux/Mac
7. **`.gitignore`** - Para proteger tus claves y .env

### Dependencias Instaladas:
- ✅ `express` - Servidor web
- ✅ `cors` - Para permitir peticiones desde el navegador

## 🚀 Cómo Iniciar

### Opción 1: Usando el script (RECOMENDADO)

**Windows:**
```bash
.\start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Opción 2: Manual

```bash
npm run server
```

### Opción 3: Si usas pnpm

```bash
pnpm run server
```

## 📍 Verificar tu archivo .env

Asegúrate de que tu archivo `.env` contenga:

```env
KEY_ID=9a6517a5-1d56-4569-b73b-3d9109c1ea40
WALLET_URL=https://ilp.interledger-test.dev/183dbd98
PRIVATE_KEY_PATH=./keys/private_python.key
PUBLIC_KEY_PATH=./keys/public_python.key
PORT=3000
```

## 🌐 Acceder a la Interfaz Web

Una vez que el servidor esté corriendo:

1. Abre tu navegador
2. Ve a: **http://localhost:3000**
3. ¡Verás la interfaz lista para usar!

## 📝 Cómo Usar la Interfaz

### Pantalla Principal:

```
┌─────────────────────────────────────┐
│         💸 Enviar Pago              │
│                                     │
│  Estado del Servidor: ✅ Conectado │
│  Wallet: https://ilp...             │
│                                     │
│  URL de Wallet Destino *            │
│  [_________________________]        │
│                                     │
│  Monto *                            │
│  [_________________________]        │
│                                     │
│  Descripción (opcional)             │
│  [_________________________]        │
│                                     │
│     [ Enviar Pago ]                 │
└─────────────────────────────────────┘
```

### Para Enviar un Pago:

1. **URL de Wallet Destino**: Pega la URL completa
   - Ejemplo: `https://ilp.interledger-test.dev/user123`
   - Puedes cambiarla cada vez

2. **Monto**: Ingresa el monto en la unidad más pequeña
   - Si es USD con escala 2: `100` = $1.00
   - `500` = $5.00, `1000` = $10.00

3. **Descripción**: (Opcional) Una nota sobre el pago

4. Click en **"Enviar Pago"**

## 🎨 Características de la Interfaz

✨ **Moderna y Limpia**
- Diseño con gradientes morados
- Animaciones suaves
- Responsive (funciona en móvil)

📊 **Información en Tiempo Real**
- Estado de conexión visible
- Detalles de tu wallet
- Alertas coloridas para cada acción

🔄 **Feedback Instantáneo**
- Indicador de carga mientras procesa
- Mensajes de éxito con detalles completos
- Errores claros y descriptivos

## 🔍 Estructura del Flujo de Pago

El servidor maneja automáticamente todo el proceso:

1. ✅ Verifica que ambas wallets existan
2. ✅ Crea un incoming payment en la wallet destino
3. ✅ Solicita un quote para el pago
4. ✅ Obtiene los grants necesarios
5. ✅ Crea el outgoing payment
6. ✅ Te muestra el resultado

Todo esto sucede en segundos de forma automática.

## 🎯 Ventajas de Esta Solución

### Antes (CLI):
```
> ip:create 100
> quote:create
> grant:op
[esperar aprobación]
> op:create
```

### Ahora (Web):
1. Ingresas URL destino
2. Ingresas monto
3. Click en "Enviar"
4. ¡Listo! ✨

## 📊 API Endpoints Disponibles

Si quieres integrar con otras aplicaciones:

### GET `/api/status`
Verifica el estado del servidor y wallet

**Respuesta:**
```json
{
  "status": "ok",
  "wallet": {
    "id": "https://ilp.interledger-test.dev/183dbd98",
    "assetCode": "USD",
    "assetScale": 2
  }
}
```

### POST `/api/send-payment`
Envía un pago

**Body:**
```json
{
  "receivingWalletUrl": "https://ilp.interledger-test.dev/user123",
  "amount": "100",
  "description": "Pago por servicios"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Pago enviado exitosamente",
  "data": {
    "outgoingPaymentId": "...",
    "incomingPaymentId": "...",
    "quoteId": "...",
    "debitAmount": { "value": "100", "assetCode": "USD" },
    "receiveAmount": { "value": "100", "assetCode": "USD" },
    "status": "COMPLETED"
  }
}
```

## 🔧 Solución de Problemas

### ❌ Error: "Cannot find module"
```bash
npm install
```

### ❌ Error: "Puerto 3000 en uso"
Cambia el puerto en tu `.env`:
```env
PORT=3001
```

### ❌ Error: "No se pudo conectar"
Verifica:
1. ¿Existe el archivo `.env`?
2. ¿Existen los archivos de claves en `keys/`?
3. ¿Son correctos los valores de `KEY_ID` y `WALLET_URL`?

### ❌ Error: "Invalid grant"
- Tu clave privada no coincide con la pública registrada
- Verifica que el `KEY_ID` sea correcto

## 🎓 Ejemplos de Uso

### Ejemplo 1: Pago Simple
```
URL Destino: https://ilp.interledger-test.dev/alice
Monto: 100
Descripción: Prueba de pago
```

### Ejemplo 2: Pago Mayor
```
URL Destino: https://ilp.interledger-test.dev/bob
Monto: 5000
Descripción: Pago por servicios de desarrollo
```

### Ejemplo 3: Pago a otra wallet
```
URL Destino: https://ilp.interledger-test.dev/charlie
Monto: 250
Descripción: Reembolso
```

## 📱 Compatibilidad

✅ Chrome / Edge
✅ Firefox
✅ Safari
✅ Opera
✅ Móviles (responsive)

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- NUNCA subas tu archivo `.env` a GitHub
- NUNCA compartas tus claves privadas
- Los archivos están protegidos en `.gitignore`
- Usa solo en redes de prueba hasta estar seguro

## 📚 Recursos Adicionales

- [Documentación de Open Payments](https://openpayments.guide/)
- [Red de Prueba Interledger](https://interledger-test.dev/)
- [Rafiki Money](https://rafiki.money/) - Para crear wallets de prueba

## 🎉 ¡Listo para Usar!

Ahora tienes una interfaz web completa para enviar pagos. Solo:

1. Inicia el servidor: `npm run server`
2. Abre: `http://localhost:3000`
3. Ingresa la URL de destino
4. ¡Envía tu primer pago!

**La URL de destino puede cambiar cada vez que quieras enviar a alguien diferente.**

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:

1. Verifica que el archivo `.env` existe y tiene todos los valores
2. Verifica que los archivos de claves existen en `keys/`
3. Lee la sección de "Solución de Problemas" arriba
4. Revisa los logs en la consola del servidor

---

**¡Disfruta enviando pagos con Interledger! 🚀**

