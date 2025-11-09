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

    console.log('Grant pendiente obtenido, URL de interacción:', pendingOutgoingPaymentGrant.interact?.redirect);

    const continueUrl = pendingOutgoingPaymentGrant.continue.uri;
    const continueToken = pendingOutgoingPaymentGrant.continue.access_token.value;
    const pollingFrequencyMs = pendingOutgoingPaymentGrant.continue.wait * 1000;

    // Esperar antes de hacer polling
    await sleep(pollingFrequencyMs);

    // Paso 5: Hacer polling para obtener el grant aprobado
    console.log('Paso 5: Esperando aprobación del grant...');
    let finalizedOutgoingPaymentGrant;
    
    try {
      finalizedOutgoingPaymentGrant = await poll({
        request: async () => {
          const grant = await client.grant.continue({
            accessToken: continueToken,
            url: continueUrl
          });
          
          if (!grant?.access_token?.value) {
            console.log('Esperando aprobación...');
            return null;
          }
          
          return grant;
        },
        successCondition: (response) => !!response,
        timeoutMs: 60000,
        pollingFrequencyMs
      });
    } catch (error) {
      return res.status(400).json({
        error: 'No se pudo completar el grant del outgoing payment',
        details: 'Por favor, navega a la URL de interacción para aprobar el pago',
        interactUrl: pendingOutgoingPaymentGrant.interact?.redirect,
        continueUrl,
        continueToken
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

