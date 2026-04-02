import { useState, useCallback, useEffect, useRef } from 'react';
import { callServiceDiag, ServiceDiagAction, setFillTime as apiSetFillTime, getFillTime as apiGetFillTime, getBgVideo, saveBgVideo, getAvailableVideos, VideoItem, checkCard, addCard, topupCard, getAllCards as apiGetAllCards, getCardHistory, updateCard, deleteCard, CardInfo, CardTransaction } from '../services/api';
import { ServiceDiagData, ServiceCard, SerialLogEntry } from '../hooks/useStationStatus';

interface ServicePanelProps {
  stationId: string;
  diagData: ServiceDiagData;
}

export default function ServicePanel({ stationId, diagData }: ServicePanelProps) {
  const [loading, setLoading] = useState<ServiceDiagAction | null>(null);
  const [showSerialLog, setShowSerialLog] = useState(false);
  const [fillTime, setFillTime] = useState(diagData.fillTimeMs ?? 5000);
  const [bgVideoUrl, setBgVideoUrl] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showMainLog, setShowMainLog] = useState(() => localStorage.getItem('hideMainLog') !== 'true');
  const [showQr, setShowQr] = useState(() => localStorage.getItem('hideQr') !== 'true');
  const [showCardPanel, setShowCardPanel] = useState(() => localStorage.getItem('hideCardPanel') !== 'true');
  const [cardMgmtId, setCardMgmtId] = useState('');
  const [cardMgmtType, setCardMgmtType] = useState<'user' | 'staff'>('user');
  const [cardMgmtAmount, setCardMgmtAmount] = useState(10);
  const [cardMgmtResult, setCardMgmtResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cardMgmtLoading, setCardMgmtLoading] = useState(false);
  
  const [showCardTable, setShowCardTable] = useState(false);
  const [allCards, setAllCards] = useState<CardInfo[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [cardSortBy, setCardSortBy] = useState<'id' | 'balance' | 'type'>('id');
  const [cardSortOrder, setCardSortOrder] = useState<'asc' | 'desc'>('asc');
  const [cardHistoryCard, setCardHistoryCard] = useState<CardInfo | null>(null);
  const [cardHistory, setCardHistory] = useState<CardTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editCard, setEditCard] = useState<CardInfo | null>(null);
  const [editCardType, setEditCardType] = useState<string>('user');
  const [editCardBalance, setEditCardBalance] = useState<number>(0);
  
  const logRef = useRef<HTMLDivElement>(null);

  // Request fill time from ESP32 when entering service mode
  useEffect(() => {
    apiGetFillTime(stationId).catch(err => {
      console.error('Failed to get fill time:', err);
    });
    getBgVideo().then(setBgVideoUrl).catch(() => {});
    getAvailableVideos().then(setVideos).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    if (diagData.fillTimeMs !== null) {
      setFillTime(diagData.fillTimeMs);
    }
  }, [diagData.fillTimeMs]);

  const runAction = useCallback(async (action: ServiceDiagAction) => {
    setLoading(action);
    try {
      await callServiceDiag(stationId, action);
    } catch (err) {
      console.error('Service diag error:', err);
    } finally {
      setLoading(null);
    }
  }, [stationId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [diagData.serialLog]);

  useEffect(() => {
    if (diagData.scannedCardId) {
      setCardMgmtId(diagData.scannedCardId);
      setCardMgmtResult(null);
    }
  }, [diagData.scannedCardId]);

  const handleCardAction = async (action: 'check' | 'add' | 'topup') => {
    setCardMgmtLoading(true);
    setCardMgmtResult(null);
    try {
      if (action === 'check') {
        const card = await checkCard(cardMgmtId);
        if (!card) setCardMgmtResult({ ok: false, msg: 'Карта не найдена' });
        else {
          const label: Record<string, string> = { user: 'Пользователь', staff: 'Персонал', service: 'Сервис' };
          setCardMgmtResult({ ok: true, msg: `${label[card.cardType] ?? card.cardType} | Монет: ${card.balance}` });
        }
      } else if (action === 'add') {
        const card = await addCard(cardMgmtId, cardMgmtType, cardMgmtAmount);
        setCardMgmtResult({ ok: true, msg: `Карта добавлена. Баланс: ${card.balance}` });
      } else {
        const card = await topupCard(cardMgmtId, cardMgmtAmount);
        setCardMgmtResult({ ok: true, msg: `Пополнено. Новый баланс: ${card.balance}` });
      }
    } catch (e: unknown) {
      setCardMgmtResult({ ok: false, msg: e instanceof Error ? e.message : 'Ошибка' });
    } finally {
      setCardMgmtLoading(false);
    }
  };

  const loadAllCards = useCallback(async () => {
    setCardsLoading(true);
    try {
      const cards = await apiGetAllCards();
      setAllCards(cards);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const handleViewHistory = async (card: CardInfo) => {
    setCardHistoryCard(card);
    setHistoryLoading(true);
    try {
      const history = await getCardHistory(card.id);
      setCardHistory(history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Удалить карту?')) return;
    try {
      await deleteCard(cardId);
      await loadAllCards();
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const handleEditCard = (card: CardInfo) => {
    setEditCard(card);
    setEditCardType(card.cardType);
    setEditCardBalance(card.balance);
  };

  const handleSaveEdit = async () => {
    if (!editCard) return;
    try {
      await updateCard(editCard.id, { cardType: editCardType, balance: editCardBalance });
      setEditCard(null);
      await loadAllCards();
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  };

  const filteredCards = allCards.filter(card => 
    card.id.toLowerCase().includes(cardSearch.toLowerCase()) ||
    card.cardType.toLowerCase().includes(cardSearch.toLowerCase())
  ).sort((a, b) => {
    let cmp = 0;
    if (cardSortBy === 'id') cmp = a.id.localeCompare(b.id);
    else if (cardSortBy === 'balance') cmp = a.balance - b.balance;
    else cmp = a.cardType.localeCompare(b.cardType);
    return cardSortOrder === 'asc' ? cmp : -cmp;
  });

  const cardTypeLabel: Record<ServiceCard['cardType'], string> = {
    service: 'Сервис',
    staff: 'Персонал',
    user: 'Пользователь',
  };

  return (
    <div className="service-panel">
      <div className="service-panel-title">🔧 Режим диагностики</div>

      <div className="service-panel-buttons">
        <button
          className="service-btn"
          onClick={() => runAction('get_cards')}
          disabled={loading !== null}
        >
          {loading === 'get_cards' ? '⏳' : '📋'} Карты
        </button>

        <button
          className="service-btn"
          onClick={() => runAction('get_status')}
          disabled={loading !== null}
        >
          {loading === 'get_status' ? '⏳' : '📶'} Статус
        </button>

        <button
          className="service-btn"
          onClick={() => { runAction('test_relay'); setShowSerialLog(true); }}
          disabled={loading !== null}
        >
          {loading === 'test_relay' ? '⏳' : '🔌'} Тест реле
        </button>

        <button
          className="service-btn"
          onClick={() => { runAction('test_button'); setShowSerialLog(true); }}
          disabled={loading !== null}
        >
          {loading === 'test_button' ? '⏳' : '🔘'} Тест кнопки
        </button>
      </div>

      <div className="service-panel-full">

        <div className="fill-time-control">
          <label>Управление картами</label>
          <input
            className="service-fill-input"
            placeholder="ID карты"
            value={cardMgmtId}
            onChange={e => { setCardMgmtId(e.target.value); setCardMgmtResult(null); }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <select
              className="service-fill-input"
              style={{ flex: 1 }}
              value={cardMgmtType}
              onChange={e => setCardMgmtType(e.target.value as 'user' | 'staff')}
            >
              <option value="user">Пользователь</option>
              <option value="staff">Персонал</option>
            </select>
            <input
              type="number"
              className="service-fill-input"
              style={{ flex: 1 }}
              min={1}
              max={999}
              value={cardMgmtAmount}
              onChange={e => setCardMgmtAmount(Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              className="service-btn"
              style={{ flex: 1 }}
              disabled={!cardMgmtId || cardMgmtLoading}
              onClick={() => handleCardAction('check')}
            >
              🔍 Проверить
            </button>
            <button
              className="service-btn"
              style={{ flex: 1, background: '#4CAF50', borderColor: '#4CAF50', color: '#fff' }}
              disabled={!cardMgmtId || cardMgmtLoading}
              onClick={() => handleCardAction('add')}
            >
              ➕ Добавить
            </button>
            <button
              className="service-btn"
              style={{ flex: 1, background: '#2196F3', borderColor: '#2196F3', color: '#fff' }}
              disabled={!cardMgmtId || cardMgmtLoading}
              onClick={() => handleCardAction('topup')}
            >
              💰 Пополнить
            </button>
          </div>
          {cardMgmtResult && (
            <div className={`service-result ${cardMgmtResult.ok ? 'status-online' : 'relay-failed'}`}>
              {cardMgmtResult.msg}
            </div>
          )}
        </div>

        <div className="fill-time-control">
          <label>Время налива: {fillTime} мс ({(fillTime/1000).toFixed(1)} сек)</label>
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={fillTime}
            onChange={(e) => setFillTime(Number(e.target.value))}
          />
          <button
            className="service-btn"
            style={{ marginTop: '12px', background: '#FF9500', borderColor: '#FF9500', color: '#fff' }}
            onClick={() => { apiSetFillTime(stationId, fillTime); setShowSerialLog(true); }}
          >
            💾 Сохранить
          </button>
        </div>

        <div className="fill-time-control">
          <label>Видео на фоне</label>
          <div className="video-selector-grid">
            {videos.map(v => (
              <div
                key={v.url}
                className={`video-thumb${bgVideoUrl === v.url ? ' selected' : ''}`}
                onClick={() => {
                  setBgVideoUrl(v.url);
                  saveBgVideo(v.url).catch(err => console.error('saveBgVideo error:', err));
                }}
              >
                <video src={v.url} muted loop autoPlay playsInline />
                <span>{v.name.replace('.mp4', '')}</span>
              </div>
            ))}
          </div>
          {bgVideoUrl && (
            <button
              className="service-btn"
              style={{ marginTop: '8px', background: '#f44336', borderColor: '#f44336', color: '#fff' }}
              onClick={() => {
                saveBgVideo('').then(() => setBgVideoUrl('')).catch(err => console.error('saveBgVideo error:', err));
              }}
            >
              🗑️ Убрать видео
            </button>
          )}
        </div>

        <button
          className="service-btn"
          onClick={() => setShowSerialLog(!showSerialLog)}
        >
          📟 Лог {showSerialLog ? '▲' : '▼'}
        </button>

        <label className="service-btn" style={{ cursor: 'pointer', justifyContent: 'space-between' }}>
          📋 Лог на главном экране
          <input
            type="checkbox"
            checked={showMainLog}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            onChange={(e) => {
              setShowMainLog(e.target.checked);
              localStorage.setItem('hideMainLog', e.target.checked ? 'false' : 'true');
            }}
          />
        </label>

        <label className="service-btn" style={{ cursor: 'pointer', justifyContent: 'space-between' }}>
          📇 Статус карты
          <input
            type="checkbox"
            checked={showCardPanel}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            onChange={(e) => {
              setShowCardPanel(e.target.checked);
              localStorage.setItem('hideCardPanel', e.target.checked ? 'false' : 'true');
            }}
          />
        </label>

        <label className="service-btn" style={{ cursor: 'pointer', justifyContent: 'space-between' }}>
          📷 QR-код на экране
          <input
            type="checkbox"
            checked={showQr}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            onChange={(e) => {
              setShowQr(e.target.checked);
              localStorage.setItem('hideQr', e.target.checked ? 'false' : 'true');
            }}
          />
        </label>

        <button
          className="service-btn service-btn-exit"
          onClick={() => runAction('cancel')}
          disabled={loading !== null}
        >
          ❌ Выход
        </button>

      </div>{/* end service-panel-full */}

      <button
        className="service-btn"
        style={{ marginBottom: '16px', background: '#9C27B0', borderColor: '#9C27B0', color: '#fff' }}
        onClick={() => { setShowCardTable(!showCardTable); if (!showCardTable) loadAllCards(); }}
      >
        📊 Таблица карт {showCardTable ? '▲' : '▼'}
      </button>

      {showCardTable && (
        <div className="card-table-container">
          <div className="card-table-search">
            <input
              type="text"
              placeholder="Поиск по ID или типу..."
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              className="service-fill-input"
            />
          </div>
          
          <div className="card-table-sort">
            <label>Сортировка: </label>
            <select value={cardSortBy} onChange={e => setCardSortBy(e.target.value as 'id' | 'balance' | 'type')}>
              <option value="id">ID</option>
              <option value="type">Тип</option>
              <option value="balance">Баланс</option>
            </select>
            <button onClick={() => setCardSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              {cardSortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {cardsLoading ? (
            <div className="service-result">Загрузка...</div>
          ) : filteredCards.length === 0 ? (
            <div className="service-result">Карты не найдены</div>
          ) : (
            <table className="cards-table-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тип</th>
                  <th>Баланс</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(card => (
                  <tr key={card.id}>
                    <td className="card-id">{card.id}</td>
                    <td>
                      <span className={`card-type-badge type-${card.cardType}`}>
                        {cardTypeLabel[card.cardType as ServiceCard['cardType']] || card.cardType}
                      </span>
                    </td>
                    <td className="card-balance">{card.cardType === 'user' ? card.balance : '∞'}</td>
                    <td className="card-actions">
                      <button className="action-btn" onClick={() => handleViewHistory(card)} title="История">📜</button>
                      <button className="action-btn" onClick={() => handleEditCard(card)} title="Редактировать">✏️</button>
                      <button className="action-btn delete" onClick={() => handleDeleteCard(card.id)} title="Удалить">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {cardHistoryCard && (
        <div className="modal-overlay" onClick={() => setCardHistoryCard(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>История карты</h3>
              <button className="modal-close" onClick={() => setCardHistoryCard(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="card-info-row">
                <span className="card-id">{cardHistoryCard.id}</span>
                <span className={`card-type-badge type-${cardHistoryCard.cardType}`}>
                  {cardTypeLabel[cardHistoryCard.cardType as ServiceCard['cardType']]}
                </span>
              </div>
              {historyLoading ? (
                <div>Загрузка...</div>
              ) : cardHistory.length === 0 ? (
                <div className="empty-history">Нет транзакций</div>
              ) : (
                <div className="history-list">
                  {cardHistory.map(t => (
                    <div key={t.id} className="history-item">
                      <span className={`history-type ${t.type}`}>{t.type}</span>
                      <span className="history-amount">{t.amount > 0 ? '+' : ''}{t.amount}</span>
                      <span className="history-date">{new Date(t.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editCard && (
        <div className="modal-overlay" onClick={() => setEditCard(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Редактировать карту</h3>
              <button className="modal-close" onClick={() => setEditCard(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-field">
                <label>ID карты:</label>
                <input value={editCard.id} disabled className="service-fill-input" />
              </div>
              <div className="edit-field">
                <label>Тип карты:</label>
                <select value={editCardType} onChange={e => setEditCardType(e.target.value)} className="service-fill-input">
                  <option value="user">Пользователь</option>
                  <option value="staff">Персонал</option>
                  <option value="service">Сервис</option>
                </select>
              </div>
              <div className="edit-field">
                <label>Баланс:</label>
                <input type="number" value={editCardBalance} onChange={e => setEditCardBalance(Number(e.target.value))} className="service-fill-input" min={0} />
              </div>
              <button className="service-btn" style={{ background: '#4CAF50', borderColor: '#4CAF50', color: '#fff', marginTop: '12px' }} onClick={handleSaveEdit}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showSerialLog && diagData.serialLog && (
        <div className="serial-log" ref={logRef}>
          {diagData.serialLog.length === 0 ? (
            <div className="serial-log-empty">Нет данных. Нажмите "Тест реле" для отправки команды.</div>
          ) : (
            diagData.serialLog.map((entry: SerialLogEntry, index: number) => (
              <div key={index} className={`serial-log-entry ${entry.direction}`}>
                <span className="serial-time">{entry.time.split('T')[1]?.split('.')[0]}</span>
                <span className="serial-dir">{entry.direction === 'in' ? '←' : '→'}</span>
                <span className="serial-data">{entry.data}</span>
              </div>
            ))
          )}
        </div>
      )}

      {diagData.relayTestResult && (
        <div className={`service-result relay-${diagData.relayTestResult}`}>
          {diagData.relayTestResult === 'testing' && 'Тестирование реле...'}
          {diagData.relayTestResult === 'ok' && '✓ Реле работает'}
          {diagData.relayTestResult === 'failed' && '✗ Реле не ответило'}
        </div>
      )}

{diagData.isOnline !== null && diagData.relayTestResult === null && (
        <div className={`service-result status-${diagData.isOnline ? 'online' : 'offline'}`}>
          {diagData.isOnline ? '✓ Станция онлайн' : '✗ Станция офлайн'}
        </div>
      )}

      {diagData.cards !== null && (
        <div className="service-cards">
          {diagData.cards.length === 0 ? (
            <div className="service-result">Карты не найдены</div>
          ) : (
            <table className="cards-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тип</th>
                  <th>Баланс</th>
                </tr>
              </thead>
              <tbody>
                {diagData.cards.map((card: ServiceCard) => (
                  <tr key={card.id}>
                    <td className="card-id">{card.id}</td>
                    <td>
                      <span className={`card-type-badge type-${card.cardType}`}>
                        {cardTypeLabel[card.cardType]}
                      </span>
                    </td>
                    <td>{card.cardType === 'user' ? card.balance : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="service-hint">Приложите карту повторно для выхода</div>
    </div>
  );
}
