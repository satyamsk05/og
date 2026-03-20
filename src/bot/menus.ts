// src/bot/menus.ts
import { Keyboard, InlineKeyboard } from 'grammy';

export const mainMenu = new Keyboard()
  .text('▶️ START BOT').text('💳 Cash').text('📊 Live').row()
  .text('⚡ Stats').text('🛒 Manual').text('📅 Logs').row()
  .text('📈 Chart').text('🛠️ Config').row()
  .placeholder('Select an option...')
  .resized();

export const stopMenu = new Keyboard()
  .text('🛑 Stop').text('💳 Cash').text('📊 Live').row()
  .text('⚡ Stats').text('🛒 Manual').text('📅 Logs').row()
  .text('📈 Chart').text('🛠️ Config').row()
  .placeholder('Select an option...')
  .resized();

export const configMenu = new Keyboard()
  .text('📊 7-Day History').row()
  .text('📅 Summary').text('📅 7-Day Stats').row()
  .text('🔄 Reset L1').text('🆘 Help').row()
  .text('🔙 Back')
  .resized();

export function getManualTradeInline(selectedCoin: string, selectedAmount: number) {
  const kb = new InlineKeyboard();
  
  // Row 1: Tokens
  const coins = ['BTC', 'ETH', 'SOL', 'XRP'];
  coins.forEach(c => {
    const label = c === selectedCoin ? `✅ ${c}` : c;
    kb.text(label, `m_coin_${c}`);
  });
  kb.row();
  
  // Row 2: Amounts
  const amounts = [1, 2, 5];
  amounts.forEach(a => {
    const label = a === selectedAmount ? `✅ $${a}` : `$${a}`;
    kb.text(label, `m_amount_${a}`);
  });
  kb.row();
  
  // Row 3: Directions
  kb.text('🟢 UP', 'm_exec_YES').text('🔴 DOWN', 'm_exec_NO');
  kb.row();
  
  kb.text('❌ Close', 'm_close');
  return kb;
}

export function getClaimMenu(unclaimedCount: number) {
  const keyboard = new Keyboard();
  if (unclaimedCount > 0) {
    keyboard.text('🎁 Claim Winnings').row();
  }
  return keyboard
    .text('▶️ START BOT').text('💳 Cash').text('📊 Live').row()
    .text('⚡ Stats').text('🛒 Manual').text('📅 Logs').row()
    .text('📈 Chart').text('🛠️ Config').row()
    .resized();
}
