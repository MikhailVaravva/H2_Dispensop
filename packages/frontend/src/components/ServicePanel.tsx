import { useState, useCallback, useEffect, useRef } from 'react';
import { callServiceDiag, ServiceDiagAction, setFillTime as apiSetFillTime, getFillTime as apiGetFillTime, getBgVideo, saveBgVideo, getAvailableVideos, VideoItem, checkCard, addCard, topupCard, getAllCards as apiGetAllCards, getCardHistory, updateCard, deleteCard, CardInfo, CardTransaction } from '../services/api';
import { ServiceDiagData, ServiceCard, SerialLogEntry } from '../hooks/useStationStatus';

interface ServicePanelProps {
  stationId: string;
  diagData: ServiceDiagData;
}

export default function ServicePanel({ stationId, diagData }: ServicePanelProps) {
  const [loading, setLoading] = useState<ServiceDiagAction | null>(null);
  const [showSerialLog, setShowSerialLog] = useState(true);
  const [clearedIndex, setClearedIndex] = useState(0);
  const [fillTime, setFillTime] = useState(diagData.fillTimeMs ?? 5000);
  const [bgVideoUrl, setBgVideoUrl] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('dispenser-theme') || 'default');
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
  const [cardSortBy, _setCardSortBy] = useState<'id' | 'balance' | 'type'>('id');
  const [cardSortOrder, _setCardSortOrder] = useState<'asc' | 'desc'>('asc');
  void _setCardSortBy; void _setCardSortOrder;
  const [cardHistoryCard, setCardHistoryCard] = useState<CardInfo | null>(null);
  const [cardHistory, setCardHistory] = useState<CardTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editCard, setEditCard] = useState<CardInfo | null>(null);
  const [editCardType, setEditCardType] = useState<string>('user');
  const [editCardBalance, setEditCardBalance] = useState<number>(0);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetFillTime(stationId).catch(err => console.error('Failed to get fill time:', err));
    getBgVideo().then(setBgVideoUrl).catch(() => {});
    getAvailableVideos().then(setVideos).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    if (diagData.fillTimeMs !== null) setFillTime(diagData.fillTimeMs);
  }, [diagData.fillTimeMs]);

  const runAction = useCallback(async (action: ServiceDiagAction) => {
    setLoading(action);
    try { await callServiceDiag(stationId, action); }
    catch (err) { console.error('Service diag error:', err); }
    finally { setLoading(null); }
  }, [stationId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [diagData.serialLog]);

  useEffect(() => {
    if (diagData.scannedCardId) { setCardMgmtId(diagData.scannedCardId); setCardMgmtResult(null); }
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
    } finally { setCardMgmtLoading(false); }
  };

  const loadAllCards = useCallback(async () => {
    setCardsLoading(true);
    try { setAllCards(await apiGetAllCards()); }
    catch (err) { console.error('Failed to load cards:', err); }
    finally { setCardsLoading(false); }
  }, []);

  const handleViewHistory = async (card: CardInfo) => {
    setCardHistoryCard(card);
    setHistoryLoading(true);
    try { setCardHistory(await getCardHistory(card.id)); }
    catch (err) { console.error('Failed to load history:', err); }
    finally { setHistoryLoading(false); }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Удалить карту?')) return;
    try { await deleteCard(cardId); await loadAllCards(); }
    catch (err) { console.error('Failed to delete card:', err); }
  };

  const handleEditCard = (card: CardInfo) => {
    setEditCard(card); setEditCardType(card.cardType); setEditCardBalance(card.balance);
  };

  const handleSaveEdit = async () => {
    if (!editCard) return;
    try { await updateCard(editCard.id, { cardType: editCardType, balance: editCardBalance }); setEditCard(null); await loadAllCards(); }
    catch (err) { console.error('Failed to update card:', err); }
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
    service: 'Серв.', staff: 'Перс.', user: 'Польз.',
  };

  const visibleLog = (diagData.serialLog ?? []).slice(clearedIndex);

  return (
    <div className="sp">
      <div className="sp-title">🔧 Режим диагностики</div>

      {/* === 3-column layout === */}
      <div className="sp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {/* COL 1: Buttons + Log */}
        <div className="sp-col">
          <div className="sp-buttons">
            <button className="sp-btn" onClick={() => runAction('get_cards')} disabled={loading !== null}>
              {loading === 'get_cards' ? '⏳' : '📋'} Карты
            </button>
            <button className="sp-btn" onClick={() => runAction('get_status')} disabled={loading !== null}>
              {loading === 'get_status' ? '⏳' : '📶'} Статус
            </button>
            <button className="sp-btn" onClick={() => { runAction('test_relay'); setShowSerialLog(true); }} disabled={loading !== null}>
              {loading === 'test_relay' ? '⏳' : '🔌'} Реле
            </button>
            <button className="sp-btn" onClick={() => { runAction('test_button'); setShowSerialLog(true); }} disabled={loading !== null}>
              {loading === 'test_button' ? '⏳' : '🔘'} Кнопка
            </button>
          </div>

          <div className="serial-log-window" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="serial-log-header" onClick={() => setShowSerialLog(!showSerialLog)}>
              <span className="serial-log-title">📟 Лог COM-порта</span>
              {visibleLog.length > 0 && <span className="serial-log-count">{visibleLog.length}</span>}
              <button className="serial-log-clear" onClick={e => { e.stopPropagation(); setClearedIndex(diagData.serialLog?.length ?? 0); }}>Очистить</button>
              <span className="serial-log-collapse">{showSerialLog ? '▲' : '▼'}</span>
            </div>
            {showSerialLog && (
              <div className="serial-log-body" ref={logRef} style={{ flex: 1, maxHeight: 'none' }}>
                {visibleLog.length === 0 ? (
                  <div className="serial-log-empty">Ожидание данных...</div>
                ) : (
                  visibleLog.map((entry: SerialLogEntry, index: number) => (
                    <div key={clearedIndex + index} className={`serial-log-entry ${entry.direction}${entry.data.startsWith('TOUCH_RX:') || entry.data === 'TOUCH_PRESSED' ? ' touch' : ''}`}>
                      <span className="serial-time">{entry.time.split('T')[1]?.split('.')[0]}</span>
                      <span className="serial-dir">{entry.direction === 'in' ? '←' : '→'}</span>
                      <span className="serial-data">{entry.data}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {diagData.relayTestResult && (
            <div className={`sp-result relay-${diagData.relayTestResult}`}>
              {diagData.relayTestResult === 'testing' && 'Тестирование реле...'}
              {diagData.relayTestResult === 'ok' && '✓ Реле OK'}
              {diagData.relayTestResult === 'failed' && '✗ Реле не ответило'}
            </div>
          )}
        </div>

        {/* COL 2: Card mgmt + Fill time */}
        <div className="sp-col">
          <div className="sp-card">
            <div className="sp-card-label">Управление картами</div>
            <input className="sp-input" placeholder="ID карты" value={cardMgmtId} onChange={e => { setCardMgmtId(e.target.value); setCardMgmtResult(null); }} />
            <div className="sp-row">
              <select className="sp-input" value={cardMgmtType} onChange={e => setCardMgmtType(e.target.value as 'user' | 'staff')}>
                <option value="user">Пользователь</option>
                <option value="staff">Персонал</option>
              </select>
              <input type="number" className="sp-input" min={1} max={999} value={cardMgmtAmount} onChange={e => setCardMgmtAmount(Number(e.target.value))} />
            </div>
            <div className="sp-row">
              <button className="sp-btn sp-btn-sm" disabled={!cardMgmtId || cardMgmtLoading} onClick={() => handleCardAction('check')}>🔍</button>
              <button className="sp-btn sp-btn-sm sp-btn-green" disabled={!cardMgmtId || cardMgmtLoading} onClick={() => handleCardAction('add')}>➕</button>
              <button className="sp-btn sp-btn-sm sp-btn-blue" disabled={!cardMgmtId || cardMgmtLoading} onClick={() => handleCardAction('topup')}>💰</button>
            </div>
            {cardMgmtResult && (
              <div className={`sp-result ${cardMgmtResult.ok ? 'status-online' : 'relay-failed'}`}>{cardMgmtResult.msg}</div>
            )}
          </div>

          <div className="sp-card">
            <div className="sp-card-label">Налив: {fillTime} мс ({(fillTime/1000).toFixed(1)} с)</div>
            <input type="range" min="1000" max="30000" step="1000" value={fillTime} onChange={e => setFillTime(Number(e.target.value))} className="sp-range" />
            <button className="sp-btn sp-btn-orange" onClick={() => { apiSetFillTime(stationId, fillTime); setShowSerialLog(true); }}>💾 Сохранить</button>
          </div>

          <button className="sp-btn sp-btn-purple" onClick={() => { setShowCardTable(!showCardTable); if (!showCardTable) loadAllCards(); }}>
            📊 Таблица карт {showCardTable ? '▲' : '▼'}
          </button>

          {diagData.isOnline !== null && (
            <div className={`sp-result status-${diagData.isOnline ? 'online' : 'offline'}`}>
              {diagData.isOnline ? '✓ Онлайн' : '✗ Офлайн'}
            </div>
          )}
        </div>

        {/* COL 3: Video + Toggles + Exit */}
        <div className="sp-col">
          <div className="sp-card" style={{ flex: 1 }}>
            <div className="sp-card-label">Видео на фоне</div>
            <div className="sp-video-grid">
              {videos.map(v => (
                <div key={v.url} className={`video-thumb${bgVideoUrl === v.url ? ' selected' : ''}`} onClick={() => { setBgVideoUrl(v.url); saveBgVideo(v.url).catch(() => {}); }}>
                  <video src={v.url} muted loop autoPlay playsInline />
                  <span>{v.name.replace('.mp4', '')}</span>
                </div>
              ))}
            </div>
            {bgVideoUrl && (
              <button className="sp-btn sp-btn-red" style={{ marginTop: '4px' }} onClick={() => { saveBgVideo('').then(() => setBgVideoUrl('')).catch(() => {}); }}>🗑️ Убрать</button>
            )}
          </div>

          <div className="sp-toggles">
            <label className="sp-toggle"><span>📋 Лог</span><input type="checkbox" checked={showMainLog} onChange={e => { setShowMainLog(e.target.checked); localStorage.setItem('hideMainLog', e.target.checked ? 'false' : 'true'); }} /></label>
            <label className="sp-toggle"><span>📇 Карта</span><input type="checkbox" checked={showCardPanel} onChange={e => { setShowCardPanel(e.target.checked); localStorage.setItem('hideCardPanel', e.target.checked ? 'false' : 'true'); }} /></label>
            <label className="sp-toggle"><span>📷 QR</span><input type="checkbox" checked={showQr} onChange={e => { setShowQr(e.target.checked); localStorage.setItem('hideQr', e.target.checked ? 'false' : 'true'); }} /></label>
          </div>

          <div className="sp-card">
            <div className="sp-card-label">Тема оформления</div>
            <div className="sp-row">
              {[{ id: 'default', name: 'Светлая' }, { id: 'dark', name: 'Тёмная' }].map(t => (
                <button key={t.id} className={`sp-btn sp-btn-sm${currentTheme === t.id ? ' sp-btn-active' : ''}`} onClick={() => {
                  setCurrentTheme(t.id);
                  localStorage.setItem('dispenser-theme', t.id);
                  if (t.id === 'default') document.documentElement.removeAttribute('data-theme');
                  else document.documentElement.setAttribute('data-theme', t.id);
                }}>{t.name}</button>
              ))}
            </div>
          </div>

          <button className="sp-btn sp-btn-exit" onClick={() => runAction('cancel')} disabled={loading !== null}>❌ Выход</button>
        </div>
      </div>

      {showCardTable && (
        <div className="modal-overlay" onClick={() => setShowCardTable(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Таблица карт</h3><button className="modal-close" onClick={() => setShowCardTable(false)}>✕</button></div>
            <div className="modal-body">
              <input type="text" placeholder="Поиск по ID или типу..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} className="sp-input" />
              {cardsLoading ? <div className="sp-result">Загрузка...</div> : filteredCards.length === 0 ? <div className="sp-result">Нет карт</div> : (
                <table className="cards-table-full">
                  <thead><tr><th>ID</th><th>Тип</th><th>Баланс</th><th>Действия</th></tr></thead>
                  <tbody>
                    {filteredCards.map(card => (
                      <tr key={card.id}>
                        <td className="card-id">{card.id}</td>
                        <td><span className={`card-type-badge type-${card.cardType}`}>{cardTypeLabel[card.cardType as ServiceCard['cardType']] || card.cardType}</span></td>
                        <td className="card-balance">{card.cardType === 'user' ? card.balance : '∞'}</td>
                        <td className="card-actions">
                          <button className="action-btn" onClick={() => handleViewHistory(card)}>📜</button>
                          <button className="action-btn" onClick={() => handleEditCard(card)}>✏️</button>
                          <button className="action-btn delete" onClick={() => handleDeleteCard(card.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {cardHistoryCard && (
        <div className="modal-overlay" onClick={() => setCardHistoryCard(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>История карты</h3><button className="modal-close" onClick={() => setCardHistoryCard(null)}>✕</button></div>
            <div className="modal-body">
              <div className="card-info-row">
                <span className="card-id">{cardHistoryCard.id}</span>
                <span className={`card-type-badge type-${cardHistoryCard.cardType}`}>{cardTypeLabel[cardHistoryCard.cardType as ServiceCard['cardType']]}</span>
              </div>
              {historyLoading ? <div>Загрузка...</div> : cardHistory.length === 0 ? <div className="empty-history">Нет транзакций</div> : (
                <div className="history-list">
                  {cardHistory.map(t => (
                    <div key={t.id} className="history-item">
                      <span className={`history-type ${t.type}`}>{t.type}</span>
                      <span className="history-amount">{t.amount > 0 ? '+' : ''}{t.amount}</span>
                      <span className="history-date">{new Date(t.createdAt.includes('Z') ? t.createdAt : t.createdAt + 'Z').toLocaleString('ru-RU')}</span>
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
            <div className="modal-header"><h3>Редактировать карту</h3><button className="modal-close" onClick={() => setEditCard(null)}>✕</button></div>
            <div className="modal-body">
              <div className="edit-field"><label>ID:</label><input value={editCard.id} disabled className="sp-input" /></div>
              <div className="edit-field"><label>Тип:</label>
                <select value={editCardType} onChange={e => setEditCardType(e.target.value)} className="sp-input">
                  <option value="user">Пользователь</option><option value="staff">Персонал</option><option value="service">Сервис</option>
                </select>
              </div>
              <div className="edit-field"><label>Баланс:</label><input type="number" value={editCardBalance} onChange={e => setEditCardBalance(Number(e.target.value))} className="sp-input" min={0} /></div>
              <button className="sp-btn sp-btn-green" style={{ marginTop: '8px' }} onClick={handleSaveEdit}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <div className="sp-hint">Приложите сервисную карту для выхода</div>
    </div>
  );
}
