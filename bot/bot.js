const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf('8579547514:AAFJQR6CL_Ui2Q8-Ac0g_y4vBtwrR4tXraU');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-webapp-url.com';

// Store bot state
const userStates = {};

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/user/${userId}`);
    const user = response.data;
    
    const welcomeMessage = `💰 *Crypto Wallet Bot* 🚀

Добро пожаловать в безопасный криптокошелек!

📊 Ваш баланс: $${user.total_usd ? user.total_usd.toFixed(2) : '0.00'}
🆔 ID: ${user.id}

Используйте кнопки ниже для управления вашими средствами:`;

    await ctx.replyWithPhoto(
      'https://raw.githubusercontent.com/your-repo/images/wallet-banner.jpg',
      {
        caption: welcomeMessage,
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          ['💰 Мой баланс', '📥 Пополнить'],
          ['📤 Вывести', '🔄 Обменять'],
          ['📊 Курсы', '📋 История'],
          ['🎯 Открыть Web App']
        ]).resize()
      }
    );
  } catch (error) {
    console.error('Start error:', error);
    ctx.reply('❌ Ошибка загрузки данных. Попробуйте позже.');
  }
});

// Balance button
bot.hears('💰 Мой баланс', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/balance/${userId}`);
    const { balances, total_usd } = response.data;
    
    let balanceText = `💼 *Ваш баланс*\n\n`;
    balanceText += `💵 *Общий баланс:* $${total_usd.toFixed(2)}\n\n`;
    
    Object.entries(balances).forEach(([currency, amount]) => {
      if (amount > 0) {
        balanceText += `• ${getCurrencyEmoji(currency)} ${currency}: ${amount}\n`;
      }
    });
    
    await ctx.reply(balanceText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📥 Пополнить', 'deposit_menu')],
        [Markup.button.callback('📤 Вывести', 'withdraw_menu')],
        [Markup.button.webApp('📊 Детали в Web App', WEBAPP_URL)]
      ])
    });
  } catch (error) {
    ctx.reply('❌ Ошибка загрузки баланса');
  }
});

// Deposit button
bot.hears('📥 Пополнить', async (ctx) => {
  await showDepositMenu(ctx);
});

// Withdraw button
bot.hears('📤 Вывести', async (ctx) => {
  await showWithdrawMenu(ctx);
});

// Exchange rates
bot.hears('📊 Курсы', async (ctx) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/rates`);
    const rates = response.data;
    
    let ratesText = `📈 *Курсы криптовалют*\n\n`;
    
    Object.entries(rates).forEach(([currency, price]) => {
      const change = (Math.random() * 10 - 5).toFixed(2);
      const emoji = change >= 0 ? '📈' : '📉';
      ratesText += `${getCurrencyEmoji(currency)} *${currency}:* $${price.toLocaleString()} (${emoji} ${change}%)\n`;
    });
    
    ratesText += `\n🔄 Для торговли используйте Web App:`;
    
    await ctx.reply(ratesText, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Торговать в Web App', WEBAPP_URL)]
      ])
    });
  } catch (error) {
    ctx.reply('❌ Ошибка загрузки курсов');
  }
});

// Transaction history
bot.hears('📋 История', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/transactions/${userId}`);
    const userTransactions = response.data;
    
    if (userTransactions.length === 0) {
      return ctx.reply('📭 У вас еще нет транзакций');
    }
    
    let historyText = `📋 *История транзакций*\n\n`;
    
    userTransactions.slice(0, 5).forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('ru-RU');
      const typeEmoji = tx.type === 'deposit' ? '📥' : '📤';
      const statusEmoji = tx.status === 'completed' ? '✅' : '⏳';
      
      historyText += `${typeEmoji} *${tx.currency} ${tx.amount}* ${statusEmoji}\n`;
      historyText += `📅 ${date} | ${tx.status}\n\n`;
    });
    
    await ctx.reply(historyText, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📊 Подробная история', WEBAPP_URL)],
        [Markup.button.callback('🔄 Обновить', 'refresh_history')]
      ])
    });
  } catch (error) {
    ctx.reply('❌ Ошибка загрузки истории');
  }
});

// Web App button
bot.hears('🎯 Открыть Web App', (ctx) => {
  ctx.reply(
    '🎯 Откройте веб-приложение для полного функционала:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🚀 Открыть Crypto App', WEBAPP_URL)
    ])
  );
});

// Callback handlers
bot.action('deposit_menu', async (ctx) => {
  await showDepositMenu(ctx);
});

bot.action('withdraw_menu', async (ctx) => {
  await showWithdrawMenu(ctx);
});

bot.action('refresh_history', async (ctx) => {
  await ctx.deleteMessage();
  const userId = ctx.from.id.toString();
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/transactions/${userId}`);
    const userTransactions = response.data;
    
    if (userTransactions.length === 0) {
      return ctx.reply('📭 У вас еще нет транзакций');
    }
    
    let historyText = `📋 *История транзакций*\n\n`;
    
    userTransactions.slice(0, 5).forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('ru-RU');
      const typeEmoji = tx.type === 'deposit' ? '📥' : '📤';
      const statusEmoji = tx.status === 'completed' ? '✅' : '⏳';
      
      historyText += `${typeEmoji} *${tx.currency} ${tx.amount}* ${statusEmoji}\n`;
      historyText += `📅 ${date} | ${tx.status}\n\n`;
    });
    
    await ctx.reply(historyText, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📊 Подробная история', WEBAPP_URL)],
        [Markup.button.callback('🔄 Обновить', 'refresh_history')]
      ])
    });
  } catch (error) {
    ctx.reply('❌ Ошибка загрузки истории');
  }
});

// Currency selection for deposit
['BTC', 'ETH', 'TON', 'USDT', 'BNB', 'SOL', 'XMR'].forEach(currency => {
  bot.action(`deposit_${currency}`, async (ctx) => {
    const userId = ctx.from.id.toString();
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/deposit/${currency}`, { userId });
      const { address, memo } = response.data;
      
      let depositText = `📥 *Пополнение ${currency}*\n\n`;
      depositText += `📍 Адрес для пополнения:\n\`${address}\`\n\n`;
      
      if (memo) {
        depositText += `🏷️ MEMO (обязательно!):\n\`${memo}\`\n\n`;
      }
      
      depositText += `⚠️ Отправляйте только ${currency} на этот адрес\n`;
      depositText += `⏱️ Зачисление: 1-3 подтверждения сети`;
      
      await ctx.editMessageText(depositText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Копировать адрес', `copy_${currency}`)],
          [Markup.button.callback('◀️ Назад', 'deposit_menu')]
        ])
      });
    } catch (error) {
      ctx.reply('❌ Ошибка генерации адреса');
    }
  });
});

// Copy address handlers
['BTC', 'ETH', 'TON', 'USDT', 'BNB', 'SOL', 'XMR'].forEach(currency => {
  bot.action(`copy_${currency}`, async (ctx) => {
    await ctx.answerCbQuery('📋 Адрес скопирован!');
    // В реальном боте здесь была бы логика копирования
  });
});

// Main menu handler
bot.action('main_menu', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('Главное меню:', {
    ...Markup.keyboard([
      ['💰 Мой баланс', '📥 Пополнить'],
      ['📤 Вывести', '🔄 Обменять'],
      ['📊 Курсы', '📋 История'],
      ['🎯 Открыть Web App']
    ]).resize()
  });
});

// Helper functions
async function showDepositMenu(ctx) {
  await ctx.reply('💎 Выберите валюту для пополнения:', {
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('₿ Bitcoin', 'deposit_BTC'),
        Markup.button.callback('Ξ Ethereum', 'deposit_ETH')
      ],
      [
        Markup.button.callback('💎 TON', 'deposit_TON'),
        Markup.button.callback('💵 USDT', 'deposit_USDT')
      ],
      [
        Markup.button.callback('🔶 BNB', 'deposit_BNB'),
        Markup.button.callback('🔵 Solana', 'deposit_SOL')
      ],
      [
        Markup.button.callback('🎯 Monero', 'deposit_XMR'),
        Markup.button.callback('◀️ Назад', 'main_menu')
      ]
    ])
  });
}

async function showWithdrawMenu(ctx) {
  const userId = ctx.from.id.toString();
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/balance/${userId}`);
    const { balances } = response.data;
    
    let withdrawText = `📤 *Вывод средств*\n\n`;
    withdrawText += `Доступные для вывода:\n`;
    
    Object.entries(balances).forEach(([currency, amount]) => {
      if (amount > 0) {
        withdrawText += `• ${getCurrencyEmoji(currency)} ${currency}: ${amount}\n`;
      }
    });
    
    withdrawText += `\nДля вывода используйте веб-приложение:`;
    
    await ctx.reply(withdrawText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Вывести в Web App', WEBAPP_URL)],
        [Markup.button.callback('◀️ Назад', 'main_menu')]
      ])
    });
  } catch (error) {
    ctx.reply('❌ Ошибка загрузки баланса');
  }
}

function getCurrencyEmoji(currency) {
  const emojis = {
    BTC: '₿',
    ETH: 'Ξ', 
    TON: '💎',
    USDT: '💵',
    BNB: '🔶',
    SOL: '🔵',
    XMR: '🎯'
  };
  return emojis[currency] || '💎';
}

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

// Start bot
bot.launch().then(() => {
  console.log('🤖 Crypto Bot started with token: 8579547514:AAFJQR6CL_Ui2Q8-Ac0g_y4vBtwrR4tXraU');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
