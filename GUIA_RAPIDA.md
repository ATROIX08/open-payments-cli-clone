# 🚀 Guía Rápida - Enviar Pagos con Interledger

## ✨ ¡Todo está listo!

Ya configuré todo lo necesario para que puedas enviar pagos desde una interfaz web moderna.

## 📝 Pasos para Usar

### 1. Iniciar el Servidor

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm run server
```

Verás un mensaje como:
```
🚀 Servidor iniciado en http://localhost:3000
📊 Wallet URL: https://ilp.interledger-test.dev/183dbd98
🔑 Key ID: 9a6517a5-1d56-4569-b73b-3d9109c1ea40

✨ Abre http://localhost:3000 en tu navegador para comenzar
```

### 2. Abrir la Interfaz Web

1. Abre tu navegador favorito
2. Ve a: **http://localhost:3000**
3. Verás una página morada con el título "Enviar Pago 💸"

### 3. Enviar un Pago

En el formulario, completa:

1. **URL de Wallet Destino** ⭐ (REQUERIDO)
   - Ejemplo: `https://ilp.interledger-test.dev/ABC123`
   - Esta es la wallet que recibirá el dinero
   - Puedes cambiarla cada vez que hagas un pago

2. **Monto** ⭐ (REQUERIDO)
   - Ejemplo: `100` (representa $1.00 si tu wallet está en USD con escala 2)
   - Ejemplo: `500` (representa $5.00)
   - El monto está en la unidad más pequeña de tu moneda

3. **Descripción** (Opcional)
   - Ejemplo: "Pago por servicios"
   - Una nota personal sobre el pago

4. Haz clic en el botón **"Enviar Pago"**

### 4. Ver el Resultado

- ⏳ Verás un mensaje "Procesando pago..."
- ✅ Si todo sale bien: "¡Pago enviado exitosamente!"
  - Se mostrarán los detalles del pago
  - ID del pago
  - Monto debitado y recibido
  - Estado del pago
- ❌ Si hay un error: Se mostrará el mensaje de error

## 💡 Características Principales

### ✨ Cambiar Destinatario Fácilmente
- Cada vez que quieras enviar un pago, simplemente ingresa la nueva URL de destino
- No necesitas configurar nada más
- Tu wallet emisora está configurada automáticamente desde el archivo `.env`

### 📊 Estado en Tiempo Real
- En la parte superior verás el estado de tu conexión
- Info de tu wallet (ID, moneda, escala)
- Estado: ✅ Conectado o ❌ Error

### 🎨 Interfaz Moderna
- Diseño limpio y profesional
- Animaciones suaves
- Responsive (funciona en móvil y desktop)
- Alertas coloridas para cada tipo de mensaje

## 🔧 Configuración Actual

Tu archivo `.env` ya está configurado con:

```
KEY_ID=9a6517a5-1d56-4569-b73b-3d9109c1ea40
WALLET_URL=https://ilp.interledger-test.dev/183dbd98
PRIVATE_KEY_PATH=./keys/private_python.key
PUBLIC_KEY_PATH=./keys/public_python.key
```

## 📚 Ejemplos de URLs de Destino

Puedes enviar pagos a cualquier wallet de Interledger, por ejemplo:

- `https://ilp.interledger-test.dev/alice`
- `https://ilp.interledger-test.dev/bob`
- `$ilp.interledger-test.dev/charlie` (formato con $)

## ❓ Preguntas Frecuentes

### ¿Cómo sé cuánto estoy enviando?
Si tu wallet está en USD con escala 2:
- `100` = $1.00
- `500` = $5.00
- `1000` = $10.00

Si está en otra moneda o escala, el cálculo cambia. Verifica en el estado de tu wallet.

### ¿Por qué aparece "Esperando aprobación"?
Algunos pagos requieren aprobación interactiva. Si esto pasa:
1. Se mostrará una URL de interacción
2. Ábrela en tu navegador
3. Aprueba el pago
4. Intenta nuevamente

### ¿Puedo cerrar el navegador mientras procesa?
❌ No, mantén la ventana abierta hasta que veas la confirmación o error.

### ¿Los pagos son instantáneos?
⚡ Los pagos en Interledger son muy rápidos, generalmente toman entre 5-15 segundos.

## 🛑 Detener el Servidor

Para detener el servidor:
1. Ve a la terminal donde lo iniciaste
2. Presiona `Ctrl + C`

## 🆘 ¿Problemas?

### No puedo acceder a localhost:3000
- Verifica que el servidor esté corriendo
- Revisa si otro programa está usando el puerto 3000
- Intenta cambiar el puerto en `.env`: `PORT=3001`

### Error: "No se pudo conectar"
- Verifica que tu `.env` esté correcto
- Asegúrate de que tus archivos de clave existan en `keys/`
- Revisa que tu `KEY_ID` sea válido

### La URL de destino no funciona
- Verifica que sea una URL válida de Interledger
- Debe comenzar con `https://` o `$`
- Ejemplo correcto: `https://ilp.interledger-test.dev/user123`

## 🎉 ¡Listo!

Ahora puedes enviar pagos de forma fácil y rápida. Solo cambia la URL de destino cada vez que quieras enviar a alguien diferente.

---

**Nota:** Esta aplicación está configurada para la red de prueba de Interledger. No uses claves de producción aquí.

