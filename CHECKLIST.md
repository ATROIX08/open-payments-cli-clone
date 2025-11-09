# ✅ Checklist de Verificación

## Antes de Iniciar el Servidor

### 1. Verifica que tengas Node.js instalado
```bash
node --version
```
Deberías ver algo como `v18.x.x` o superior.

### 2. Verifica que las dependencias estén instaladas
```bash
npm list express cors
```
Si no están instaladas:
```bash
npm install
```

### 3. Verifica que exista el archivo .env
Debe estar en la raíz del proyecto y contener:
```env
KEY_ID=9a6517a5-1d56-4569-b73b-3d9109c1ea40
WALLET_URL=https://ilp.interledger-test.dev/183dbd98
PRIVATE_KEY_PATH=./keys/private_python.key
PUBLIC_KEY_PATH=./keys/public_python.key
```

### 4. Verifica que existan las claves
```
✅ keys/private_python.key
✅ keys/public_python.key
```

---

## Para Iniciar

### Opción 1: Usar el script
**Windows:**
```bash
.\start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Opción 2: Comando directo
```bash
npm run server
```

---

## Verifica que el Servidor Funcione

### 1. Deberías ver en la consola:
```
🚀 Servidor iniciado en http://localhost:3000
📊 Wallet URL: https://ilp.interledger-test.dev/183dbd98
🔑 Key ID: 9a6517a5-1d56-4569-b73b-3d9109c1ea40

✨ Abre http://localhost:3000 en tu navegador para comenzar
```

### 2. Abre tu navegador
Ve a: `http://localhost:3000`

### 3. Verifica el estado
En la página deberías ver:
```
Estado del Servidor
✅ Conectado
Wallet: https://ilp.interledger-test.dev/183dbd98
Moneda: USD (escala: 2)
```

---

## Primer Pago de Prueba

### 1. Necesitas una wallet de destino
Puedes usar cualquier wallet de prueba de Interledger, por ejemplo:
- `https://ilp.interledger-test.dev/alice`
- O crea una nueva en [Rafiki Money](https://rafiki.money/)

### 2. Completa el formulario
```
URL de Wallet Destino: https://ilp.interledger-test.dev/tu-wallet-destino
Monto: 100
Descripción: Prueba de pago
```

### 3. Envía
Click en "Enviar Pago"

### 4. Espera el resultado
- ⏳ Verás "Procesando pago..."
- ✅ Después: "¡Pago enviado exitosamente!"

---

## Solución Rápida de Problemas

### ❌ "Cannot find module"
```bash
npm install
```

### ❌ "Port 3000 already in use"
Agrega a tu `.env`:
```env
PORT=3001
```

### ❌ "Cannot connect to server"
1. ¿Está el servidor corriendo?
2. ¿Hay algún error en la consola?
3. Intenta reiniciar el servidor

### ❌ "Invalid wallet address"
- Verifica que la URL esté completa
- Debe comenzar con `https://`
- Ejemplo correcto: `https://ilp.interledger-test.dev/user123`

### ❌ "Grant error" o "Unauthorized"
1. Verifica tu `KEY_ID` en `.env`
2. Verifica que las claves en `keys/` sean las correctas
3. Asegúrate de que la clave privada corresponda a tu wallet

---

## Estructura de Archivos Completa

```
✅ .env (con tus variables)
✅ server.js
✅ index.js
✅ package.json
✅ public/
   ✅ index.html
✅ src/
   ✅ handlers/ (todos los archivos)
   ✅ utils.js
✅ keys/
   ✅ private_python.key
   ✅ public_python.key
✅ node_modules/ (después de npm install)
```

---

## Documentación Disponible

📚 **Lee según tu necesidad:**

1. **`RESUMEN.md`** 
   - Vista general del proyecto
   - Lo que se creó
   - ⏱️ 5 minutos

2. **`GUIA_RAPIDA.md`**
   - Cómo empezar rápido
   - Pasos básicos
   - ⏱️ 2 minutos

3. **`INSTRUCCIONES.md`**
   - Tutorial completo
   - Ejemplos detallados
   - API reference
   - ⏱️ 10 minutos

4. **`README.md`**
   - Documentación técnica
   - Para desarrolladores
   - ⏱️ 15 minutos

---

## Flujo Recomendado para Empezar

```
1. Lee este CHECKLIST.md (estás aquí) ✅
   ↓
2. Verifica los requisitos (arriba) ✅
   ↓
3. Inicia el servidor ✅
   ↓
4. Abre el navegador ✅
   ↓
5. Haz un pago de prueba ✅
   ↓
6. Lee GUIA_RAPIDA.md para más info 📚
   ↓
7. ¡Disfruta! 🎉
```

---

## Comandos Útiles

```bash
# Ver versión de Node
node --version

# Ver dependencias instaladas
npm list

# Instalar/actualizar dependencias
npm install

# Iniciar servidor
npm run server

# Ver proceso de Node corriendo (Windows PowerShell)
Get-Process node

# Detener servidor
Ctrl + C (en la terminal donde corre)

# Ver si el puerto 3000 está en uso (Windows PowerShell)
netstat -ano | findstr :3000
```

---

## URLs Útiles

- **Aplicación**: http://localhost:3000
- **API Status**: http://localhost:3000/api/status
- **Rafiki Money**: https://rafiki.money/ (crear wallets de prueba)
- **Documentación Open Payments**: https://openpayments.guide/

---

## ¿Todo Listo?

Si puedes marcar ✅ en todos estos:

- ✅ Node.js instalado
- ✅ Dependencias instaladas (`npm install`)
- ✅ Archivo `.env` existe y está correcto
- ✅ Archivos de claves existen en `keys/`
- ✅ Servidor inicia sin errores
- ✅ Puedes abrir http://localhost:3000
- ✅ Ves "✅ Conectado" en la página

**¡Entonces estás listo para enviar pagos! 🚀**

---

## Próximos Pasos

1. ✅ Haz tu primer pago de prueba
2. 📚 Lee la documentación adicional
3. 🎨 Personaliza la interfaz (opcional)
4. 🔧 Integra con otras apps (opcional)
5. 🚀 ¡Experimenta!

---

**¿Listo para empezar? ¡Inicia el servidor y abre http://localhost:3000! 💸**

