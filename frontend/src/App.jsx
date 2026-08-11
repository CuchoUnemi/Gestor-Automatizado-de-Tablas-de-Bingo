import { useState } from 'react'
import Uploader from './components/Uploader'
import AnnouncerPanel from './components/AnnouncerPanel'
import { LayoutDashboard, Upload, Dices } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('juego');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <Dices className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Bingo<span className="text-indigo-500">Master</span></h1>
          </div>
          
          <nav className="flex space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setActiveTab('juego')}
              className={`px-4 py-2 rounded-md flex items-center text-sm font-medium transition-all
                ${activeTab === 'juego' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Panel de Juego
            </button>
            <button 
              onClick={() => setActiveTab('ingesta')}
              className={`px-4 py-2 rounded-md flex items-center text-sm font-medium transition-all
                ${activeTab === 'ingesta' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              <Upload className="w-4 h-4 mr-2" /> Cargar Tablas
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className={activeTab === 'ingesta' ? 'block' : 'hidden'}>
          <Uploader />
        </div>
        <div className={activeTab === 'juego' ? 'block' : 'hidden'}>
          <AnnouncerPanel />
        </div>
      </main>
    </div>
  )
}


export default App
