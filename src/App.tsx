import ProfessionSelector from './components/ProfessionSelector'
import GameModeSelector from './components/GameModeSelector'
import EquipmentPanel from './components/EquipmentPanel'
import TraitPanel from './components/TraitPanel'
import SkillBar from './components/SkillBar'
import BuildExport from './components/BuildExport'
import ArmoryPreview from './components/ArmoryPreview'
import StatsPanel from './components/StatsPanel'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.45em] text-slate-500">Guild Wars 2</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            Build Foundry
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Craft and share profession setups across game modes with live armory previews.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px,1fr,280px]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.9)]">
              <div className="space-y-6">
                <ProfessionSelector />
                <GameModeSelector />
              </div>
            </div>
            <SkillBar />
            <TraitPanel />
            <EquipmentPanel />
            <BuildExport />
          </div>

          <ArmoryPreview />

          <StatsPanel />
        </div>
      </div>
    </div>
  )
}

export default App
