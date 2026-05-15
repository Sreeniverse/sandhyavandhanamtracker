import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { SLOTS } from '../utils/slots'

export default function HistoryPage() {
  const { selectedProfile, familyMembers } = useAuth()
  const { history, loading, error } = useActivities()
  const stats = useStats(history)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-sm mb-4">{error}</div>
      )}
      <div className="mb-5 md:mb-8">
        <div className="text-[0.65rem] md:text-[0.7rem] text-gray-400 uppercase tracking-widest font-syne">Sandhyavandhanam Archive</div>
        <div className="text-xl md:text-[2rem] font-extrabold tracking-tight font-syne mt-0.5">Full History</div>
        {selectedProfile && (
          <div className="text-sm text-blue-600 font-semibold font-syne mt-0.5">Showing history for: {selectedProfile.name}</div>
        )}
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-5 gap-1 md:gap-2 mb-5 md:mb-8">
        <div className="bg-white rounded-xl md:rounded-[16px] p-2 md:p-4 text-center shadow-sm">
          <div className="font-syne text-base md:text-2xl font-extrabold text-saffron-600">{stats.daysTracked}</div>
          <div className="text-[0.45rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Days</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[16px] p-2 md:p-4 text-center shadow-sm">
          <div className="font-syne text-base md:text-2xl font-extrabold text-success">{stats.perfectDays}</div>
          <div className="text-[0.45rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Perfect</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[16px] p-2 md:p-4 text-center shadow-sm">
          <div className="font-syne text-base md:text-2xl font-extrabold text-morning">{stats.slotConsistency.morning || 0}%</div>
          <div className="text-[0.45rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Prathakala</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[16px] p-2 md:p-4 text-center shadow-sm">
          <div className="font-syne text-base md:text-2xl font-extrabold text-afternoon">{stats.slotConsistency.afternoon || 0}%</div>
          <div className="text-[0.45rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Madhyanika</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[16px] p-2 md:p-4 text-center shadow-sm">
          <div className="font-syne text-base md:text-2xl font-extrabold text-evening">{stats.slotConsistency.evening || 0}%</div>
          <div className="text-[0.45rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Saayamkala</div>
        </div>
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center text-gray-300 py-8">No history yet. Start logging on the Dashboard!</div>
      ) : (
        <div className="flex flex-col gap-1">
          {history.map((record) => (
            <div key={record.id || record.date} className="bg-white rounded-xl md:rounded-[10px] px-4 py-2.5 md:py-3 shadow-sm flex items-center gap-2">
              <div className="w-16 md:w-[140px] flex-shrink-0">
                <div className="font-syne font-bold text-sm text-ink">
                  {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                {record.date === todayStr && <div className="text-[0.65rem] text-saffron-600 font-semibold">Today</div>}
                {record.profile_for && (
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider">
                    {familyMembers.find(m => m.id === record.profile_for)?.name || 'Son'}
                  </span>
                )}
              </div>
              <div className="flex gap-3 md:gap-6 flex-1 justify-end">
                {SLOTS.map((slot) => {
                  const s = record[slot.key] || {}
                  return (
                    <div key={slot.key} className="text-center min-w-[44px]">
                      <div className="text-[0.6rem] md:text-[0.68rem] uppercase tracking-wider text-gray-300 font-syne mb-0.5 hidden md:block">{slot.label}</div>
                      <div className={`text-sm font-bold ${s.done ? 'text-success' : 'text-gray-200'}`}>
                        {s.done ? '✓' : '–'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}