import ProfessionSelector from './components/ProfessionSelector'
import GameModeSelector from './components/GameModeSelector'
import EquipmentPanel from './components/EquipmentPanel'
import TraitPanel from './components/TraitPanel'
import SkillBar from './components/SkillBar'
import BuildExport from './components/BuildExport'

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <header className="mb-3 pb-2 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-center mb-0.5">GW2 Build Editor</h1>
          <p className="text-center text-gray-400 text-xs">
            Open source build editor for Guild Wars 2
          </p>
        </header>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ProfessionSelector />
            <GameModeSelector />
          </div>
          <SkillBar />
          <TraitPanel />
          <EquipmentPanel />
          <BuildExport />
        </div>
      </div>
    </div>
  )
}

export default App
