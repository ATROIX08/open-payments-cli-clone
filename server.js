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
    
    // Convertir el monto a la menor unidad usando el assetScale
    // Si el usuario ingresa 10 EUR y assetScale es 2, enviamos 1000 (10 * 10^2)
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    console.log(`Monto ingresado: ${amount} ${sendingWalletAddress.assetCode}`);
    console.log(`Monto en unidades base: ${amountInBaseUnits} (scale: ${sendingWalletAddress.assetScale})`);
    
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
          value: amountInBaseUnits.toString()
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

// Endpoint para obtener cotizaciones de múltiples wallets
app.post('/api/quote-preview-multiple', async (req, res) => {
  const { receivingWalletUrls, amount } = req.body;
  
  if (!receivingWalletUrls || !Array.isArray(receivingWalletUrls) || receivingWalletUrls.length === 0 || !amount) {
    return res.status(400).json({ error: 'Se requieren URLs de destino y el monto' });
  }
  
  // Limitar a 5 wallets
  const wallets = receivingWalletUrls.slice(0, 5);
  
  console.log(`\nObteniendo cotizaciones para ${wallets.length} wallets...`);
  console.log('Monto:', amount);
  
  try {
    const client = await createClient();
    
    // Obtener wallet emisora
    const sendingWalletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
    const sendingWalletAddress = await client.walletAddress.get({ url: sendingWalletAddressUrl });
    
    // Convertir el monto a la menor unidad
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    
    // Obtener cotizaciones para cada wallet en paralelo
    const quotePromises = wallets.map(async (walletUrl) => {
      try {
        console.log(`Obteniendo cotización para: ${walletUrl}`);
        
        const receivingWalletAddressUrl = parseWalletAddress(walletUrl);
        const receivingWalletAddress = await client.walletAddress.get({ url: receivingWalletAddressUrl });
        
        // Crear incoming payment temporal
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
        
        const incomingPayment = await client.incomingPayment.create(
          {
            url: receivingWalletAddress.resourceServer,
            accessToken: incomingPaymentGrant.access_token.value
          },
          {
            walletAddress: receivingWalletAddress.id,
            metadata: {
              description: 'Cotización preliminar (comparación)'
            }
          }
        );
        
        // Obtener quote grant
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
        
        // Crear quote
        const quote = await client.quote.create(
          {
            url: sendingWalletAddress.resourceServer,
            accessToken: quoteGrant.access_token.value
          },
          {
            receiver: incomingPayment.id,
            walletAddress: sendingWalletAddress.id,
            method: 'ilp',
            debitAmount: {
              assetCode: sendingWalletAddress.assetCode,
              assetScale: sendingWalletAddress.assetScale,
              value: amountInBaseUnits.toString()
            }
          }
        );
        
        // Calcular valores reales
        const debitValue = parseFloat(quote.debitAmount.value) / Math.pow(10, quote.debitAmount.assetScale);
        const receiveValue = parseFloat(quote.receiveAmount.value) / Math.pow(10, quote.receiveAmount.assetScale);
        const originalAmount = parseFloat(amount);
        
        // Calcular el tipo de cambio (cuántas unidades de moneda destino por 1 unidad de moneda origen)
        const exchangeRate = receiveValue / debitValue;
        
        // Calcular la comisión/fee total (diferencia entre lo que pediste enviar y lo que realmente se debitará)
        const totalFee = debitValue - originalAmount;
        const feePercentage = (totalFee / originalAmount) * 100;
        
        // La eficiencia real es: qué porcentaje del monto original efectivamente se debitará
        // Si pediste 10 EUR y te cobran 10.50 EUR, la eficiencia es 95.24% (estás pagando 5% más)
        const efficiency = (originalAmount / debitValue) * 100;
        
        // Calcular cuánto del valor original "llega" al destinatario considerando ambas monedas
        // Para misma moneda: es directo (receiveValue vs originalAmount)
        // Para diferente moneda: necesitamos ver qué porcentaje del debitAmount se convierte en receiveAmount
        const conversionEfficiency = (receiveValue / debitValue) / (1 / exchangeRate) * 100;
        
        // Calcular pérdida total: cuánto del monto original se pierde en el proceso
        // Para misma moneda: originalAmount - receiveValue
        // Para diferente moneda: necesitamos convertir receiveValue a la moneda original usando el tipo de cambio
        const sameCurrency = quote.debitAmount.assetCode === quote.receiveAmount.assetCode;
        let netValue; // Valor neto que llega expresado en la moneda original
        
        if (sameCurrency) {
          // Mismo currency: directo
          netValue = receiveValue;
        } else {
          // Diferente currency: convertir usando el tipo de cambio inverso
          // Si envío 10 EUR y recibes 10.36 USD con tasa 1.0360
          // El valor neto en EUR es: 10.36 / 1.0360 = 10.00 EUR (aproximadamente)
          netValue = receiveValue / exchangeRate;
        }
        
        // Eficiencia real: qué porcentaje del monto original llega como valor neto
        const realEfficiency = (netValue / originalAmount) * 100;
        
        console.log(`✓ Cotización para ${walletUrl}:`);
        console.log(`  - Solicitado: ${originalAmount.toFixed(2)} ${quote.debitAmount.assetCode}`);
        console.log(`  - Se debitará: ${debitValue.toFixed(2)} ${quote.debitAmount.assetCode} (fee: ${totalFee.toFixed(2)})`);
        console.log(`  - Recibirá: ${receiveValue.toFixed(2)} ${quote.receiveAmount.assetCode}`);
        console.log(`  - Valor neto: ${netValue.toFixed(2)} ${quote.debitAmount.assetCode}`);
        console.log(`  - Eficiencia real: ${realEfficiency.toFixed(2)}%`);
        
        return {
          success: true,
          walletUrl: walletUrl,
          quote: {
            debitAmount: {
              value: debitValue,
              valueInBaseUnits: quote.debitAmount.value,
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale
            },
            receiveAmount: {
              value: receiveValue,
              valueInBaseUnits: quote.receiveAmount.value,
              assetCode: quote.receiveAmount.assetCode,
              assetScale: quote.receiveAmount.assetScale
            },
            exchangeRate: exchangeRate,
            netValue: netValue, // Valor neto que llega (en moneda del remitente)
            totalFee: totalFee, // Fee total en moneda del remitente
            feePercentage: feePercentage, // Porcentaje de fee
            realEfficiency: realEfficiency, // Eficiencia real (%)
            costToSend: debitValue // Costo real para enviar (lo que se debitará)
          }
        };
        
      } catch (error) {
        console.error(`✗ Error obteniendo cotización para ${walletUrl}:`, error.message);
        return {
          success: false,
          walletUrl: walletUrl,
          error: error.description || error.message || 'Error desconocido'
        };
      }
    });
    
    // Esperar todas las cotizaciones
    const quotes = await Promise.all(quotePromises);
    
    res.json({
      success: true,
      quotes: quotes
    });
    
  } catch (error) {
    console.error('Error al obtener cotizaciones múltiples:', error);
    res.status(500).json({
      error: 'Error al obtener cotizaciones',
      details: error.description || error.message
    });
  }
});

// Endpoint para obtener una cotización preliminar (preview) - Legacy
app.post('/api/quote-preview', async (req, res) => {
  const { receivingWalletUrl, amount } = req.body;
  
  if (!receivingWalletUrl || !amount) {
    return res.status(400).json({ error: 'Se requiere la URL de destino y el monto' });
  }
  
  try {
    console.log('\nObteniendo cotización preliminar...');
    console.log('Destinatario:', receivingWalletUrl);
    console.log('Monto:', amount);
    
    const client = await createClient();
    
    // Obtener las wallet addresses
    const sendingWalletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
    const receivingWalletAddressUrl = parseWalletAddress(receivingWalletUrl);
    
    const [sendingWalletAddress, receivingWalletAddress] = await Promise.all([
      client.walletAddress.get({ url: sendingWalletAddressUrl }),
      client.walletAddress.get({ url: receivingWalletAddressUrl })
    ]);
    
    // Crear incoming payment temporal
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
    
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
      },
      {
        walletAddress: receivingWalletAddress.id,
        metadata: {
          description: 'Cotización preliminar'
        }
      }
    );
    
    // Obtener quote grant
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
    
    // Convertir el monto a la menor unidad usando el assetScale
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    
    // Crear quote
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
      },
      {
        receiver: incomingPayment.id,
        walletAddress: sendingWalletAddress.id,
        method: 'ilp',
        debitAmount: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale,
          value: amountInBaseUnits.toString()
        }
      }
    );
    
    console.log('Cotización obtenida:', quote.id);
    
    // Calcular el tipo de cambio
    const debitValue = parseFloat(quote.debitAmount.value) / Math.pow(10, quote.debitAmount.assetScale);
    const receiveValue = parseFloat(quote.receiveAmount.value) / Math.pow(10, quote.receiveAmount.assetScale);
    const exchangeRate = receiveValue / debitValue;
    
    res.json({
      success: true,
      quote: {
        debitAmount: {
          value: debitValue,
          valueInBaseUnits: quote.debitAmount.value,
          assetCode: quote.debitAmount.assetCode,
          assetScale: quote.debitAmount.assetScale
        },
        receiveAmount: {
          value: receiveValue,
          valueInBaseUnits: quote.receiveAmount.value,
          assetCode: quote.receiveAmount.assetCode,
          assetScale: quote.receiveAmount.assetScale
        },
        exchangeRate: exchangeRate,
        sendingWallet: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale
        },
        receivingWallet: {
          assetCode: receivingWalletAddress.assetCode,
          assetScale: receivingWalletAddress.assetScale
        }
      }
    });
    
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({
      error: 'Error al obtener cotización',
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

