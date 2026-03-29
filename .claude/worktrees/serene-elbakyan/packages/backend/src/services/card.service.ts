import db from '../db/database';
import { logEvent } from './event-log.service';

export type CardType = 'service' | 'staff' | 'user';

interface CardRow {
  id: string;
  balance: number;
  card_type: CardType;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  balance: number;
  cardType: CardType;
}

export function getCard(cardId: string): Card | null {
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as CardRow | undefined;
  return row ? { id: row.id, balance: row.balance, cardType: row.card_type } : null;
}

export function createCard(cardId: string, initialBalance: number = 0, cardType: CardType = 'user'): Card {
  db.prepare(
    'INSERT INTO cards (id, balance, card_type) VALUES (?, ?, ?)'
  ).run(cardId, initialBalance, cardType);
  
  logEvent('system', 'card_created', undefined, { cardId, balance: initialBalance, cardType });
  
  return { id: cardId, balance: initialBalance, cardType };
}

export function setCardType(cardId: string, cardType: CardType): void {
  db.prepare(
    "UPDATE cards SET card_type = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(cardType, cardId);
}

export function addCoins(cardId: string, coins: number): Card {
  let card = getCard(cardId);
  if (!card) {
    card = createCard(cardId, coins);
  } else {
    db.prepare(
      "UPDATE cards SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?"
    ).run(coins, cardId);
    card.balance += coins;
    logEvent('system', 'coins_added', undefined, { cardId, coins, newBalance: card.balance });
  }
  return card;
}

export function deductCoin(cardId: string): boolean {
  const card = getCard(cardId);
  if (!card || card.balance <= 0) {
    return false;
  }
  
  db.prepare(
    "UPDATE cards SET balance = balance - 1, updated_at = datetime('now') WHERE id = ?"
  ).run(cardId);
  
  logEvent('system', 'coin_deducted', undefined, { cardId, newBalance: card.balance - 1 });
  
  return true;
}

export function getBalance(cardId: string): number {
  const card = getCard(cardId);
  return card ? card.balance : 0;
}

export function getAllCards(): Card[] {
  const rows = db.prepare('SELECT * FROM cards').all() as CardRow[];
  return rows.map(row => ({
    id: row.id,
    balance: row.balance,
    cardType: row.card_type,
  }));
}
