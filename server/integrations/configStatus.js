const statusResponse = (requiredKeys, env) => {
  const missing = requiredKeys.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  return {
    status: missing.length === 0 ? 'configured' : 'not_configured',
    missing,
  };
};

export const getTelegramConfigStatus = (env = process.env) => (
  statusResponse(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'], env)
);

export const getWhatsAppConfigStatus = (env = process.env) => (
  statusResponse(['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'], env)
);

export const getMessagingProviderStatuses = (env = process.env) => ({
  telegram: getTelegramConfigStatus(env),
  whatsapp: getWhatsAppConfigStatus(env),
});
