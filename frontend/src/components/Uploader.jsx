import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export default function Uploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  
  const addTable = useGameStore((state) => state.addTable);
  const tables = useGameStore((state) => state.tables);
  const clearAllTables = useGameStore((state) => state.clearAllTables);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const processFile = async (file) => {
    setIsUploading(true);
    setProgress(0);
    setStatusMsg('Enviando archivo al servidor...');
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al procesar el archivo');

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep incomplete chunk

        for (const block of lines) {
          const dataLine = block.trim();
          if (!dataLine.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(dataLine.replace('data: ', ''));

            if (payload.progress !== undefined) {
              setProgress(payload.progress);
            }
            if (payload.message) {
              setStatusMsg(payload.message);
            }

            if (payload.type === 'done' && payload.data) {
              payload.data.forEach(t => addTable(t));
            }

            if (payload.type === 'error') {
              setError(payload.message);
            }
          } catch (parseErr) {
            // ignore malformed chunks
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      setProgress(0);
      setStatusMsg('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-6 bg-slate-800 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-400">
          <UploadCloud className="mr-2" />
          Ingesta de Tablas
        </h2>
        
        <div 
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
            ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700/50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center w-full">
              <p className="text-indigo-300 font-semibold mb-3">{statusMsg}</p>
              
              {/* Progress bar */}
              <div className="w-full max-w-md bg-slate-900 rounded-full h-5 overflow-hidden border border-slate-600">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 10 && (
                    <span className="text-[11px] font-bold text-white drop-shadow">{progress}%</span>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 mt-2">Por favor no cierres esta pestaña</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-300 font-medium">Arrastra y suelta tu imagen/PDF aquí</p>
              <p className="text-sm text-slate-500 mt-2">o haz clic para seleccionar un archivo</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded flex items-center text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* Tables Preview Section */}
      <div className="p-6 bg-slate-800 rounded-xl shadow-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-300">Tablas Extraídas ({tables.length})</h3>
          {tables.length > 0 && (
            <button
              onClick={clearAllTables}
              className="flex items-center px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar Todas
            </button>
          )}
        </div>
        
        {tables.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No hay tablas cargadas aún.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(t => (
              <div key={t.card_id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-sm text-indigo-300 font-bold">{t.serial_number}</span>
                  <div className="flex space-x-2">
                    {t.image_base64 && (
                      <button 
                        onClick={() => setPreviewImage(t.image_base64)}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                        title="Ver imagen original"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                    {t.needs_review ? (
                      <span className="p-1 bg-yellow-500/20 text-yellow-500 rounded" title="Revisión Sugerida">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1 bg-emerald-500/20 text-emerald-500 rounded" title="Correcto">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>

                {/* 5x5 Grid Display */}
                <div className="grid grid-cols-5 gap-1 mt-auto">
                  {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={i} className="text-center font-bold text-slate-400 text-xs py-1 border-b border-slate-700">{letter}</div>
                  ))}
                  {t.matrix.map((row, rIdx) => 
                    row.map((cell, cIdx) => (
                      <div 
                        key={`${rIdx}-${cIdx}`} 
                        className={`aspect-square flex items-center justify-center text-sm font-semibold rounded
                          ${cell === 'COMODIN' ? 'bg-indigo-500/20 text-indigo-300 text-[10px]' : 'bg-slate-800 text-slate-200'}`}
                      >
                        {cell === 'COMODIN' ? '★' : cell}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Imagen Original</h3>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800">
              <img src={previewImage} alt="Original Bingo Card" className="max-w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

