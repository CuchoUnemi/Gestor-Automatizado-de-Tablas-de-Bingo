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
  { id: 'cuadro_grande', label: 'Cuadro Grande' },
];

export default function AnnouncerPanel() {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const {
    tables,
    calledNumbers,
    gameMode,
    winningTables,
    acknowledgedWinners,
    setGameMode,
    callNumber,
    undoLastNumber,
    setWinningTables,
    dismissWinners,
    resetRound,
  } = useGameStore();

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

    const winners = tables.filter(t => checkWin(t.matrix, calledNumbers, gameMode));
    
    // Ignore winners that have already been acknowledged by the announcer
    const unacknowledgedWinners = winners.filter(w => !acknowledgedWinners.includes(w.card_id));
    const winnerIds = unacknowledgedWinners.map(w => w.card_id);
    
    // Only update if the winners list has changed
    // This allows the system to clear the winners when the user switches
    // to a harder game mode (like from 'Línea' to 'Cartón Lleno')
    if (JSON.stringify(winnerIds) !== JSON.stringify(winningTables)) {
      setWinningTables(winnerIds);
    }
  }, [calledNumbers, gameMode, tables, acknowledgedWinners]);

  // Calculate near winners
  const nearWinners = useMemo(() => {
    if (calledNumbers.length === 0 || tables.length === 0) return [];
    // Only show near winners if no one has won yet (or if they have all been acknowledged)
    if (winningTables.length > 0) return [];
    
    // Ignore tables that already won and were acknowledged
    const activeTables = tables.filter(t => !acknowledgedWinners.includes(t.card_id));
    return activeTables.filter(t => checkNearWin(t.matrix, calledNumbers, gameMode));
  }, [calledNumbers, gameMode, tables, winningTables, acknowledgedWinners]);

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
          <select 
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value)}
          >
            {GAME_MODES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {hasWon && (
            <p className="text-xs text-emerald-400 mt-2 font-semibold animate-pulse">
              ↑ Cambia el modo de juego aquí para continuar con esta misma ronda.
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

          <div className="flex justify-between mt-6">
            <button 
              onClick={undoLastNumber}
              disabled={calledNumbers.length === 0}
              className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
            >
              <Undo2 className="w-4 h-4 mr-2" /> Deshacer
            </button>
            <button 
              onClick={resetRound}
              className="flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar
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
          <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex items-start">
            <BellRing className="w-6 h-6 text-yellow-500 mr-3 mt-1 animate-pulse" />
            <div>
              <h4 className="text-yellow-400 font-bold mb-1">¡Tensión al máximo!</h4>
              <p className="text-yellow-200/80 text-sm">
                Las siguientes tablas están a <strong className="text-white">1 número</strong> de ganar:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {nearWinners.map(t => (
                  <span key={t.card_id} className="text-xs font-mono bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                    {t.serial_number}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Números Cantados ({calledNumbers.length})</h3>
          
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

    </div>
  );
}
