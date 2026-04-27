import {
  getMessagingProviderStatuses,
  getTelegramConfigStatus,
  getWhatsAppConfigStatus,
} from './configStatus.js';

describe('messaging provider config status', () => {
  it('returns not_configured (instead of throwing) when Telegram keys are missing', () => {
    const result = getTelegramConfigStatus({});

    expect(result.status).toBe('not_configured');
    expect(result.missing).toEqual(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  });

  it('returns not_configured (instead of throwing) when WhatsApp keys are missing', () => {
    const result = getWhatsAppConfigStatus({});

    expect(result.status).toBe('not_configured');
    expect(result.missing).toEqual(['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
  });

  it('returns configured when all required keys exist', () => {
    const result = getMessagingProviderStatuses({
      TELEGRAM_BOT_TOKEN: 'tg-token',
      TELEGRAM_CHAT_ID: 'chat-id',
      WHATSAPP_ACCESS_TOKEN: 'wa-token',
      WHATSAPP_PHONE_NUMBER_ID: 'wa-id',
    });

    expect(result.telegram.status).toBe('configured');
    expect(result.whatsapp.status).toBe('configured');
  });
});
