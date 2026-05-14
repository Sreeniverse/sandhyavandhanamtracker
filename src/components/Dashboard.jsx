import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { SLOTS } from '../utils/slots'
import { cancelSlotReminder, scheduleAllReminders } from '../utils/notifications'

function ConsistencyRings({ stats }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[16px] p-4 md:p-5 mb-5 shadow-sm">
      <div className="text-[0.72rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold mb-3 md:mb-4">Slot Consistency</div>
      <div className="flex gap-3 md:gap-6 justify-center">
        {SLOTS.map((slot) => (
          <div key={slot.key} className="text-center">
            <div className={`ring ring-sm md:ring-lg ${slot.color}`} style={{ '--pct': `${stats.slotConsistency[slot.key] || 0}%` }}>
              <div className="ring-core">
                <span className="ring-inner">{stats.slotConsistency[slot.key] || 0}%</span>
              </div>
            </div>
            <div className="text-[0.55rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-1">{slot.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { today, history, loading, logAction, selectedDate, navigateDate, goToToday, isToday, isPastDate, canGoBack, canGoForward } = useActivities()
  const stats = useStats(history)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
  }

  const dateObj = new Date(selectedDate + 'T00:00:00')
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const completedSlots = today ? SLOTS.filter((s) => today[s.key]?.done).length : 0

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <div className="text-[0.72rem] md:text-xs text-gray-400 uppercase tracking-widest font-syne">Daily Sandhyavandhanam</div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xl md:text-[2.2rem] font-extrabold tracking-tight font-syne">{dateDisplay}</div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              className="w-8 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-sm cursor-pointer flex items-center justify-center text-ink hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => navigateDate(-1)}
              disabled={!canGoBack}
              title="Previous day"
            >
              ←
            </button>
            <button
              className="px-3 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-[0.68rem] font-bold uppercase tracking-wider cursor-pointer hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToToday}
              disabled={isToday}
            >
              Today
            </button>
            <button
              className="w-8 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-sm cursor-pointer flex items-center justify-center text-ink hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => navigateDate(1)}
              disabled={!canGoForward}
              title="Next day"
            >
              →
            </button>
          </div>
        </div>
        <div className="text-gray-400 text-sm mt-1">
          {completedSlots} of 3 rituals completed
        </div>
        {isPastDate && (
          <div className="text-[0.72rem] text-saffron-600 font-semibold font-syne mt-1">Viewing past date - you can mark rituals if missed</div>
        )}
      </div>

      <ConsistencyRings stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {SLOTS.map((slot) => {
          const slotData = today?.[slot.key]
          const done = slotData?.done ?? false

          return (
            <div key={slot.key} className={`bg-white rounded-2xl md:rounded-[16px] p-4 md:p-6 shadow-md relative overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-lg flex flex-col ${done ? 'bg-gradient-to-br from-green-50 to-emerald-50' : ''}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${slot.color === 'morning' ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : slot.color === 'afternoon' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-violet-600 to-violet-400'}`} />
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl md:text-3xl">{slot.icon}</span>
                <span className={`text-[0.65rem] md:text-xs font-bold px-2 py-0.5 rounded-full font-syne tracking-wide ${done ? 'bg-success text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {done ? '✓ Done' : 'Pending'}
                </span>
              </div>
              <div className={`text-[0.68rem] md:text-xs uppercase tracking-widest font-syne font-bold mb-0.5 ${slot.color === 'morning' ? 'text-amber-500' : slot.color === 'afternoon' ? 'text-blue-500' : 'text-violet-500'}`}>
                {slot.label}
              </div>
              <div className="text-sm md:text-base font-semibold text-ink mb-2">Sandhyavandhanam</div>

              <button
                className={`w-full py-3 mt-auto rounded-[10px] font-syne text-xs md:text-sm font-bold cursor-pointer tracking-wide border-1.5 transition-all ${done ? 'bg-transparent text-success border-success hover:bg-green-50' : 'bg-ink text-white border-ink hover:bg-[#222]'}`}
                onClick={async () => {
                  const action = done ? 'undone' : 'done'
                  await logAction(slot.key, action)
                  if (action === 'done') {
                    await cancelSlotReminder(slot.key)
                  } else {
                    await scheduleAllReminders()
                  }
                }}
              >
                {done ? '↩ Mark Undone' : '✓ Mark as Done'}
              </button>
            </div>
          )
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-8 md:mt-12">
          <div className="text-lg md:text-xl font-bold font-syne mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-warm">Recent History</div>
          <div className="flex flex-col gap-2">
            {history.slice(0, 7).map((record) => (
              <div key={record.id || record.date} className="bg-white rounded-[10px] md:rounded-[10px] px-4 py-3 md:py-3.5 shadow-sm grid grid-cols-1 md:grid-cols-[140px_repeat(3,1fr)] items-center gap-2 md:gap-4">
                <div>
                  <div className="font-syne font-bold text-sm text-ink">{new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{record.date === selectedDate && <span className="text-saffron-600 text-xs font-semibold ml-1">Today</span>}</div>
                </div>
                {SLOTS.map((slot) => {
                  const s = record[slot.key] || {}
                  return (
                    <div key={slot.key} className="text-center">
                      <div className="text-[0.6rem] md:text-[0.68rem] uppercase tracking-wider text-gray-300 font-syne mb-0.5 md:hidden">{slot.label}</div>
                      {s.done ? (
                        <div className="text-sm text-success font-bold">✓ Done</div>
                      ) : (
                        <div className="text-sm text-gray-300">–</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}