import { Router } from 'express';
import { getCard, createCard, addCoins, getAllCards, deleteCard, getCardHistory, updateCard } from '../services/card.service';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.get('/', (_req, res) => {
  const cards = getAllCards();
  res.json(cards);
});

router.get('/:cardId', (req, res) => {
  const card = getCard(req.params.cardId);
  if (!card) throw new AppError(404, 'Карта не найдена');
  res.json(card);
});

router.get('/:cardId/history', (req, res) => {
  const card = getCard(req.params.cardId);
  if (!card) throw new AppError(404, 'Карта не найдена');
  const history = getCardHistory(req.params.cardId);
  res.json(history);
});

router.post('/', (req, res) => {
  const { id, cardType = 'user', balance = 0 } = req.body;
  if (!id) throw new AppError(400, 'ID карты обязателен');
  if (getCard(id)) throw new AppError(409, 'Карта уже существует');
  const card = createCard(String(id), Number(balance), cardType);
  res.status(201).json(card);
});

router.post('/:cardId/topup', (req, res) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) throw new AppError(400, 'Укажите сумму пополнения');
  if (!getCard(req.params.cardId)) throw new AppError(404, 'Карта не найдена');
  const card = addCoins(req.params.cardId, Number(amount));
  res.json(card);
});

router.put('/:cardId', (req, res) => {
  const { balance, cardType } = req.body;
  if (balance === undefined && !cardType) throw new AppError(400, 'Укажите данные для обновления');
  const card = updateCard(req.params.cardId, { balance, cardType });
  if (!card) throw new AppError(404, 'Карта не найдена');
  res.json(card);
});

router.delete('/:cardId', (req, res) => {
  const deleted = deleteCard(req.params.cardId);
  if (!deleted) throw new AppError(404, 'Карта не найдена');
  res.json({ success: true, message: 'Карта удалена' });
});

export default router;
