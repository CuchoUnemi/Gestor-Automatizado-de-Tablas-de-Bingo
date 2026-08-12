import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { checkWin, checkNearWin } from '../utils/bingoValidator';
import { Undo2, PlayCircle, RefreshCw, Trophy, BellRing } from 'lucide-react';

const GAME_MODES = [
  { id: 'tabla_llena', label: 'Cartón Lleno' },
  { id: 'linea_horizontal', label: 'Línea Horizontal' },
  { id: 'linea_vertical', label: 'Línea Vertical' },
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'letra_x', label: 'Letra X' },
  { id: 'cuatro_esquinas', label: '4 Esquinas' },
  { id: 'cruz', label: 'Cruz' },
  { id: 'cuadrado', label: 'Cuadrado' },
];

export default function AnnouncerPanel() {
  const [inputValue, setInputValue] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const inputRef = useRef(null);

  const {
    tables,
    calledNumbers,
    gameModes,
    gameMode, // legacy string
    winningTables,
    acknowledgedWinners,
    toggleGameMode,
    callNumber,
    undoLastNumber,
    setWinningTables,
    dismissWinners,
    resetRound,
  } = useGameStore();

  // Ensure we have an array of modes
  const currentModes = Array.isArray(gameModes) ? gameModes : (typeof gameMode === 'string' ? [gameMode] : ['tabla_llena']);

  // Focus input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, [calledNumbers]);

  // Validation logic
  useEffect(() => {
    if (tables.length === 0) return;
    
    if (calledNumbers.length === 0) {
      if (winningTables.length > 0) setWinningTables([]);
      return;
    }

    const winners = tables.filter(t => currentModes.some(m => checkWin(t.matrix, calledNumbers, m)));
    
    // Ignore winners that have already been acknowledged by the announcer
    const unacknowledgedWinners = winners.filter(w => !acknowledgedWinners.includes(w.card_id));
    const winnerIds = unacknowledgedWinners.map(w => w.card_id);
    
    if (JSON.stringify(winnerIds) !== JSON.stringify(winningTables)) {
      setWinningTables(winnerIds);
    }
  }, [calledNumbers, currentModes, tables, acknowledgedWinners, winningTables, setWinningTables]);

  // Calculate near winners
  const nearWinners = useMemo(() => {
    if (calledNumbers.length === 0 || tables.length === 0) return [];
    if (winningTables.length > 0) return [];
    
    const activeTables = tables.filter(t => !acknowledgedWinners.includes(t.card_id));
    return activeTables.filter(t => currentModes.some(m => checkNearWin(t.matrix, calledNumbers, m)));
  }, [calledNumbers, currentModes, tables, winningTables, acknowledgedWinners]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= 75) {
      callNumber(num);
    }
    setInputValue('');
  };


  const hasWon = winningTables.length > 0;

  return (
    <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Controls & Input */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl">
          <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center">
            <PlayCircle className="w-5 h-5 mr-2" />
            Configuración
          </h3>
          <p className="text-xs text-slate-400 mb-4">Puedes activar varios a la vez.</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {GAME_MODES.map(m => {
              const isActive = currentModes.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleGameMode(m.id)}
                  className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-all ${isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Pattern Preview */}
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex justify-center mb-2">
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }).map((_, i) => {
                const r = Math.floor(i / 5);
                const c = i % 5;
                let isTarget = false;
                if (r === 2 && c === 2) isTarget = true; // Comodin
                else {
                  for (const mode of currentModes) {
                    switch (mode) {
                      case 'tabla_llena': isTarget = true; break;
                      case 'linea_horizontal': if (r === 2) isTarget = true; break;
                      case 'linea_vertical': if (c === 2) isTarget = true; break;
                      case 'diagonal': if (r === c || r + c === 4) isTarget = true; break;
                      case 'letra_x': if (r === c || r + c === 4) isTarget = true; break;
                      case 'cuatro_esquinas': if ((r===0||r===4) && (c===0||c===4)) isTarget = true; break;
                      case 'cruz': if (r === 2 || c === 2) isTarget = true; break;
                      case 'cuadrado':
                      case 'cuadro_grande': if (r === 0 || r === 4 || c === 0 || c === 4) isTarget = true; break;
                    }
                  }
                }
                return (
                  <div key={i} className={`w-4 h-4 rounded-full ${isTarget ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></div>
                );
              })}
            </div>
          </div>

          {hasWon && (
            <p className="text-xs text-emerald-400 mt-2 font-semibold animate-pulse text-center">
              ↑ Cambia el modo para continuar la ronda.
            </p>
          )}
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl text-center">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Cantar Número</h3>
          
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="75"
              autoFocus
              disabled={hasWon}
              className="w-32 h-32 text-6xl text-center font-black bg-slate-900 border-2 border-indigo-500 rounded-2xl text-indigo-400 outline-none focus:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>

          <div className="flex justify-center mt-6">
            <button 
              onClick={undoLastNumber}
              disabled={calledNumbers.length === 0}
              className="flex items-center justify-center w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50 font-semibold"
            >
              <Undo2 className="w-5 h-5 mr-2" /> Deshacer Último Número
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Display & Alerts */}
      <div className="md:col-span-2 space-y-4">
        {hasWon && (
          <div className="bg-emerald-900/40 border-2 border-emerald-500 p-6 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] relative">
            <h2 className="text-3xl font-black text-emerald-400 flex items-center justify-center mb-6 animate-pulse">
              <Trophy className="w-10 h-10 mr-4 text-yellow-400" /> ¡BINGO DETECTADO!
            </h2>
            
            <button 
              onClick={dismissWinners}
              className="absolute top-4 right-4 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all"
            >
              Cerrar y Continuar Ronda
            </button>
            
            <div className="flex flex-col gap-6">
              {tables.filter(t => winningTables.includes(t.card_id)).map(t => (
                <div key={t.card_id} className="bg-slate-900/80 rounded-xl p-4 flex flex-col md:flex-row gap-6 border border-emerald-500/50">
                  {/* Digital Board */}
                  <div className="flex-1">
                    <h4 className="text-center font-bold text-emerald-400 mb-2 font-mono text-lg">{t.serial_number}</h4>
                    <div className="grid grid-cols-5 gap-1 max-w-[250px] mx-auto">
                      {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                        <div key={i} className="text-center font-bold text-slate-400 text-xs py-1 border-b border-slate-700">{letter}</div>
                      ))}
                      {t.matrix.map((row, rIdx) => 
                        row.map((cell, cIdx) => {
                          const isCalled = cell === 'COMODIN' || calledNumbers.includes(cell);
                          return (
                            <div 
                              key={`${rIdx}-${cIdx}`} 
                              className={`aspect-square flex flex-col items-center justify-center text-sm font-semibold rounded relative
                                ${isCalled ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-800 text-slate-400'}`}
                            >
                              <span className={isCalled ? 'mb-1' : ''}>{cell === 'COMODIN' ? '★' : cell}</span>
                              {isCalled && cell !== 'COMODIN' && (
                                <div className="absolute w-2 h-2 bg-yellow-400 rounded-full bottom-1 shadow-sm"></div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* Original Image Preview */}
                  {t.image_base64 && (
                    <div className="flex-1 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-4">
                      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Imagen Original</h4>
                      <img src={t.image_base64} alt="Original Bingo Card" className="max-w-full h-auto max-h-[250px] object-contain rounded border border-slate-700/50 shadow-md" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Near Winners Alert */}
        {!hasWon && nearWinners.length > 0 && (
          <div className="bg-yellow-500/10 border-2 border-yellow-500/50 p-6 rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <h4 className="text-xl text-yellow-400 font-bold mb-4 flex items-center justify-center">
              <BellRing className="w-8 h-8 mr-3 animate-bounce text-yellow-500" />
              ¡Tensión al máximo! (A 1 número de ganar)
            </h4>
            
            <div className="flex flex-col gap-6">
              {nearWinners.map(t => (
                <div key={t.card_id} className="bg-slate-900/80 rounded-xl p-4 flex flex-col md:flex-row gap-6 border border-yellow-500/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-900 font-bold text-xs px-3 py-1 rounded-bl-lg z-10 animate-pulse">
                    ¡FALTA 1!
                  </div>
                  {/* Digital Board for Near Winner */}
                  <div className="flex-1">
                    <h4 className="text-center font-bold text-yellow-400 mb-2 font-mono text-lg">{t.serial_number}</h4>
                    <div className="grid grid-cols-5 gap-1 max-w-[250px] mx-auto">
                      {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                        <div key={i} className="text-center font-bold text-slate-400 text-xs py-1 border-b border-slate-700">{letter}</div>
                      ))}
                      {t.matrix.map((row, rIdx) => 
                        row.map((cell, cIdx) => {
                          const isCalled = cell === 'COMODIN' || calledNumbers.includes(cell);
                          return (
                            <div 
                              key={`${rIdx}-${cIdx}`} 
                              className={`aspect-square flex flex-col items-center justify-center text-sm font-semibold rounded relative
                                ${isCalled ? 'bg-yellow-600 text-white shadow-inner' : 'bg-slate-800 text-slate-400'}`}
                            >
                              <span className={isCalled ? 'mb-1' : ''}>{cell === 'COMODIN' ? '★' : cell}</span>
                              {isCalled && cell !== 'COMODIN' && (
                                <div className="absolute w-2 h-2 bg-white rounded-full bottom-1 shadow-sm"></div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* Original Image Preview for Near Winner */}
                  {t.image_base64 && (
                    <div className="flex-1 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-4">
                      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Imagen Original</h4>
                      <img src={t.image_base64} alt="Original Bingo Card" className="max-w-full h-auto max-h-[250px] object-contain rounded border border-slate-700/50 shadow-md opacity-80" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl min-h-[300px]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="text-lg font-bold text-slate-300">Números Cantados ({calledNumbers.length})</h3>
            <button 
              onClick={() => setShowResetModal(true)}
              disabled={calledNumbers.length === 0}
              className="flex items-center px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50 font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reiniciar Juego
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {calledNumbers.map((num, i) => (
              <div 
                key={i} 
                className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold transition-all duration-300
                  ${i === calledNumbers.length - 1 ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.8)] scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {num}
              </div>
            ))}
            {calledNumbers.length === 0 && (
              <p className="text-slate-500 italic w-full text-center mt-10">Esperando el primer número...</p>
            )}
          </div>
        </div>
      </div>
      {/* Modal de Confirmación para Reiniciar */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                <RefreshCw className="w-5 h-5 text-red-400" />
              </div>
              ¿Reiniciar el juego?
            </h3>
            <p className="text-slate-300 mb-8 pl-1">
              Esta acción borrará <strong className="text-white">todos los números cantados</strong> y limpiará las alertas de ganadores. Las tablas de los jugadores se mantendrán registradas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetRound();
                  setShowResetModal(false);
                }}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-bold shadow-lg shadow-red-500/30 active:scale-95"
              >
                Sí, reiniciar juego
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
