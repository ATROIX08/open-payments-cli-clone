const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { createAuthenticatedClient } = require('@interledger/open-payments');
const { parseWalletAddress, poll, sleep } = require('./src/utils');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Función para leer la clave privada
function getPrivateKey() {
  const privateKeyPath = process.env.PRIVATE_KEY_PATH || './keys/private_python.key';
  return fs.readFileSync(privateKeyPath, 'utf8');
}

// Función para crear el cliente autenticado
async function createClient() {
  const walletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
  const privateKey = getPrivateKey();
  const keyId = process.env.KEY_ID;

  return await createAuthenticatedClient({
    walletAddressUrl,
    privateKey,
    keyId
  });
}

// Endpoint principal para enviar pagos
app.post('/api/send-payment', async (req, res) => {
  const { receivingWalletUrl, amount, description } = req.body;

  if (!receivingWalletUrl || !amount) {
    return res.status(400).json({ 
      error: 'Se requiere la URL de destino y el monto' 
    });
  }

  try {
    console.log('Iniciando proceso de pago...');
    console.log('Destinatario:', receivingWalletUrl);
    console.log('Monto:', amount);

    // Crear cliente
    const client = await createClient();
    
    // Obtener las wallet addresses
    const sendingWalletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
    const receivingWalletAddressUrl = parseWalletAddress(receivingWalletUrl);

    console.log('Obteniendo información de las wallets...');
    const [sendingWalletAddress, receivingWalletAddress] = await Promise.all([
      client.walletAddress.get({ url: sendingWalletAddressUrl }),
      client.walletAddress.get({ url: receivingWalletAddressUrl })
    ]);

    console.log('Wallet emisora:', sendingWalletAddress.id);
    console.log('Wallet receptora:', receivingWalletAddress.id);

    // Paso 1: Crear incoming payment público en la wallet receptora
    console.log('Paso 1: Creando incoming payment público...');
    
    // Obtener grant público para incoming payment (sin autenticación de usuario)
    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['create']
            }
          ]
        }
      }
    );

    // Crear incoming payment SIN monto específico (acepta cualquier cantidad)
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
      },
      {
        walletAddress: receivingWalletAddress.id,
        metadata: {
          description: description || 'Pago desde interfaz web'
        }
      }
    );

    console.log('Incoming payment creado:', incomingPayment.id);

    // Paso 2: Obtener quote grant
    console.log('Paso 2: Obteniendo grant para quote...');
    const quoteGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'quote',
              actions: ['read', 'create']
            }
          ]
        }
      }
    );

    const quoteToken = quoteGrant.access_token.value;

    // Paso 3: Crear quote con debitAmount (cuánto quieres gastar)
    console.log('Paso 3: Creando quote...');
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteToken
      },
      {
        receiver: incomingPayment.id,
        walletAddress: sendingWalletAddress.id,
        method: 'ilp',
        debitAmount: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale,
          value: amount
        }
      }
    );

    console.log('Quote creado:', quote.id);
    console.log('Monto a debitar:', quote.debitAmount.value);
    console.log('Monto a recibir:', quote.receiveAmount.value);

    // Paso 4: Obtener outgoing payment grant
    console.log('Paso 4: Obteniendo grant para outgoing payment...');
    const pendingOutgoingPaymentGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['read', 'create', 'list'],
              identifier: sendingWalletAddress.id,
              limits: {
                debitAmount: {
                  assetCode: sendingWalletAddress.assetCode,
                  assetScale: sendingWalletAddress.assetScale,
                  value: quote.debitAmount.value
                }
              }
            }
          ]
        },
        interact: {
          start: ['redirect']
        }
      }
    );

    const interactUrl = pendingOutgoingPaymentGrant.interact?.redirect;
    console.log('Grant pendiente obtenido, URL de interacción:', interactUrl);

    const continueUrl = pendingOutgoingPaymentGrant.continue.uri;
    const continueToken = pendingOutgoingPaymentGrant.continue.access_token.value;
    const pollingFrequencyMs = pendingOutgoingPaymentGrant.continue.wait * 1000;

    // Si hay URL de interacción, retornar inmediatamente para que el frontend pueda redirigir el popup
    let finalizedOutgoingPaymentGrant;
    
    if (interactUrl) {
      console.log('Paso 5: Se requiere aprobación del usuario');
      console.log('🔗 URL de aprobación:', interactUrl);
      
      // Retornar inmediatamente al frontend con el interactUrl
      // El frontend ya tiene un popup abierto y lo redirigirá a esta URL
      return res.status(202).json({
        status: 'pending_approval',
        message: 'Se requiere aprobación del usuario',
        interactUrl: interactUrl,
        // Incluir datos para continuar el pago después
        continueData: {
          continueUrl,
          continueToken,
          quote: {
            id: quote.id,
            debitAmount: quote.debitAmount,
            receiveAmount: quote.receiveAmount
          },
          incomingPaymentId: incomingPayment.id,
          sendingWalletUrl: sendingWalletAddress.id,
          receivingWalletUrl: receivingWalletAddress.id
        }
      });
    } else {
      // No hay interacción requerida
      await sleep(pollingFrequencyMs);
      finalizedOutgoingPaymentGrant = await client.grant.continue({
        accessToken: continueToken,
        url: continueUrl
      });
    }

    const outgoingPaymentToken = finalizedOutgoingPaymentGrant.access_token.value;
    console.log('Grant aprobado');

    // Paso 6: Crear outgoing payment
    console.log('Paso 6: Creando outgoing payment...');
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: outgoingPaymentToken
      },
      {
        walletAddress: sendingWalletAddress.id,
        quoteId: quote.id,
        metadata: {
          description: description || 'Pago realizado desde la interfaz web'
        }
      }
    );

    console.log('Pago completado exitosamente!');
    console.log('Outgoing payment ID:', outgoingPayment.id);

    res.json({
      success: true,
      message: 'Pago enviado exitosamente',
      data: {
        outgoingPaymentId: outgoingPayment.id,
        incomingPaymentId: incomingPayment.id,
        quoteId: quote.id,
        receiver: receivingWalletAddress.id,
        sentTo: receivingWalletAddress.id,
        debitAmount: quote.debitAmount,
        receiveAmount: quote.receiveAmount,
        status: outgoingPayment.status
      }
    });

  } catch (error) {
    console.error('Error al procesar el pago:', error);
    res.status(500).json({
      error: 'Error al procesar el pago',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para completar el pago después de la aprobación
app.post('/api/complete-payment', async (req, res) => {
  const { continueData } = req.body;
  
  if (!continueData) {
    return res.status(400).json({ error: 'Faltan datos para continuar el pago' });
  }
  
  console.log('\nCompletando pago después de aprobación...');
  
  try {
    const client = await createClient();
    const { continueUrl, continueToken, quote, incomingPaymentId, sendingWalletUrl, receivingWalletUrl } = continueData;
    
    // Paso 5: Hacer polling del grant para verificar aprobación
    console.log('Paso 5: Verificando aprobación del grant...');
    
    const pollingFrequencyMs = 1000; // 1 segundo
    const maxAttempts = 60;
    let attempts = 0;
    let finalizedOutgoingPaymentGrant;
    
    while (attempts < maxAttempts) {
      await sleep(pollingFrequencyMs);
      attempts++;
      
      try {
        console.log(`Esperando aprobación... (intento ${attempts}/${maxAttempts})`);
        
        const continuedGrant = await client.grant.continue({
          accessToken: continueToken,
          url: continueUrl
        });
        
        if (continuedGrant?.access_token?.value) {
          finalizedOutgoingPaymentGrant = continuedGrant;
          console.log('✅ Grant aprobado');
          break;
        }
      } catch (error) {
        // Continuar esperando
        continue;
      }
    }
    
    if (!finalizedOutgoingPaymentGrant) {
      console.log('❌ Timeout esperando aprobación');
      return res.status(408).json({
        error: 'Timeout esperando aprobación',
        details: 'El pago no fue aprobado a tiempo.'
      });
    }

    const outgoingPaymentToken = finalizedOutgoingPaymentGrant.access_token.value;

    // Paso 6: Crear outgoing payment
    console.log('Paso 6: Creando outgoing payment...');
    
    const sendingWalletAddressUrl = parseWalletAddress(sendingWalletUrl);
    const sendingWalletAddress = await client.walletAddress.get({ url: sendingWalletAddressUrl });
    
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: outgoingPaymentToken
      },
      {
        walletAddress: sendingWalletUrl,
        quoteId: quote.id,
        metadata: {
          description: 'Pago realizado desde la interfaz web'
        }
      }
    );

    console.log('✅ Pago completado exitosamente!');
    console.log('Outgoing payment ID:', outgoingPayment.id);

    res.json({
      success: true,
      message: 'Pago enviado exitosamente',
      data: {
        outgoingPaymentId: outgoingPayment.id,
        incomingPaymentId: incomingPaymentId,
        quoteId: quote.id,
        receiver: receivingWalletUrl,
        sentTo: receivingWalletUrl,
        debitAmount: quote.debitAmount,
        receiveAmount: quote.receiveAmount,
        status: outgoingPayment.status
      }
    });

  } catch (error) {
    console.error('Error al completar el pago:', error);
    res.status(500).json({
      error: 'Error al completar el pago',
      details: error.description || error.message
    });
  }
});

// Endpoint para verificar el estado del servidor
app.get('/api/status', async (req, res) => {
  try {
    const client = await createClient();
    const walletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
    const walletAddress = await client.walletAddress.get({ url: walletAddressUrl });
    
    res.json({
      status: 'ok',
      wallet: {
        id: walletAddress.id,
        assetCode: walletAddress.assetCode,
        assetScale: walletAddress.assetScale
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado en http://localhost:${PORT}`);
  console.log(`📊 Wallet URL: ${process.env.WALLET_URL}`);
  console.log(`🔑 Key ID: ${process.env.KEY_ID}`);
  console.log(`\n✨ Abre http://localhost:${PORT} en tu navegador para comenzar\n`);
});

