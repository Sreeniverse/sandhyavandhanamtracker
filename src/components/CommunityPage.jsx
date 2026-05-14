import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { supabase } from '../supabase'
import { SLOTS } from '../utils/slots'

export default function CommunityPage() {
  const { user } = useAuth()
  const { history } = useActivities()
  const stats = useStats(history)

  const [communityStats, setCommunityStats] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [yourRank, setYourRank] = useState(null)
  const [yourStreak, setYourStreak] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [slotRes, leaderboardRes] = await Promise.all([
          supabase.rpc('get_community_slot_stats'),
          supabase.rpc('get_leaderboard'),
        ])

        if (slotRes.data) {
          const bySlot = {}
          slotRes.data.forEach(({ slot, pct }) => { bySlot[slot] = pct })
          setCommunityStats(bySlot)
        }

        if (leaderboardRes.data) {
          setLeaderboard(leaderboardRes.data)
          const me = leaderboardRes.data.find((e) => e.user_id === user?.id)
          if (me) {
            setYourRank(Number(me.rank))
            setYourStreak(me.streak)
          }
        }
      } catch (_) {
        // community features silently degrade
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="mb-5 md:mb-8">
        <div className="text-[0.65rem] md:text-[0.7rem] text-gray-400 uppercase tracking-widest font-syne">Community</div>
        <div className="text-xl md:text-[2rem] font-extrabold tracking-tight font-syne mt-0.5">Leaderboard</div>
        <div className="text-gray-400 text-sm mt-0.5">See how your streak compares with the community</div>
      </div>

      {/* Community Slot Consistency rings */}
      <div className="bg-white rounded-2xl md:rounded-[16px] p-4 md:p-5 mb-5 md:mb-8 shadow-md">
        <div className="text-[0.62rem] md:text-[0.75rem] uppercase tracking-widest text-gray-400 font-syne font-semibold mb-3 md:mb-4">Community Slot Consistency</div>
        <div className="flex gap-3 md:gap-8 justify-center">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="text-center">
              <div className={`ring ring-sm md:ring-lg ${slot.color}`} style={{ '--pct': `${communityStats[slot.key] || 0}%` }}>
                <div className="ring-core">
                  <span className="ring-inner">{(communityStats[slot.key] || 0).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-[0.55rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-1">{slot.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard list - Desktop table */}
      <div className="hidden md:block bg-white rounded-[16px] shadow-md overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_120px_120px] gap-4 px-6 py-2.5 bg-cream font-syne text-[0.62rem] uppercase tracking-wider text-gray-400">
          <span>Rank</span><span>Name</span><span className="text-center">Streak</span><span className="text-center">Completion</span>
        </div>
        {leaderboard.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No community data yet. Start tracking to appear on the leaderboard!</div>
        )}
        {leaderboard.map((entry) => (
          <div key={entry.user_id} className={`grid grid-cols-[60px_1fr_120px_120px] gap-4 px-6 py-2.5 border-b border-black/[0.03] items-center hover:bg-saffron-50/30 transition-colors ${entry.user_id === user?.id ? 'bg-saffron-50' : ''}`}>
            <div className={`font-syne font-bold text-sm ${Number(entry.rank) <= 3 ? 'text-gold' : 'text-gray-400'}`}>{entry.rank}</div>
            <div className="font-bold text-sm">{entry.name} {entry.user_id === user?.id && <span className="bg-saffron-500 text-white px-2 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">You</span>}</div>
            <div className="font-syne font-extrabold text-sm text-center">{entry.streak} <span className="text-xs text-gray-300 font-normal">days</span></div>
            <div className="font-syne font-bold text-sm text-saffron-600 text-center">{entry.completion}%</div>
          </div>
        ))}
      </div>

      {/* Leaderboard list - Mobile cards */}
      <div className="md:hidden">
        <div className="font-syne text-[0.65rem] uppercase tracking-wider text-gray-400 mb-2">All Rankings</div>
        {leaderboard.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">No community data yet.</div>
        )}
        {leaderboard.map((entry) => (
          <div key={entry.user_id} className={`bg-white rounded-xl p-2.5 px-3 flex items-center gap-2 shadow-sm mb-1 ${entry.user_id === user?.id ? 'bg-saffron-50' : ''}`}>
            <div className={`font-syne font-bold text-xs w-6 text-center ${Number(entry.rank) <= 3 ? 'text-gold' : 'text-gray-400'}`}>{entry.rank}</div>
            <div className="font-bold text-sm flex-1">{entry.name} {entry.user_id === user?.id && <span className="bg-saffron-500 text-white px-1.5 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">You</span>}</div>
            <div className="font-syne font-extrabold text-xs text-center min-w-[48px]">{entry.streak} d</div>
            <div className="font-syne font-bold text-xs text-saffron-600 text-center min-w-[40px]">{entry.completion}%</div>
          </div>
        ))}
      </div>

      {/* Your stats */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-6 mt-5 md:mt-8">
        <div className="bg-white rounded-xl md:rounded-[14px] p-3 md:p-5 text-center shadow-sm bg-gradient-to-br from-cream to-white">
          <div className="font-syne text-xl md:text-2xl font-extrabold text-saffron-600">{yourRank ? `${yourRank}${suffix(yourRank)}` : '-'}</div>
          <div className="text-[0.52rem] md:text-[0.62rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Rank</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[14px] p-3 md:p-5 text-center shadow-sm bg-gradient-to-br from-cream to-white">
          <div className="font-syne text-xl md:text-2xl font-extrabold text-success">{yourStreak ?? '-'}</div>
          <div className="text-[0.52rem] md:text-[0.62rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Streak</div>
        </div>
        <div className="bg-white rounded-xl md:rounded-[14px] p-3 md:p-5 text-center shadow-sm bg-gradient-to-br from-cream to-white">
          <div className="font-syne text-xl md:text-2xl font-extrabold text-ink">{stats.overallConsistency}%</div>
          <div className="text-[0.52rem] md:text-[0.62rem] text-gray-400 uppercase tracking-wider font-syne mt-0.5">Completion</div>
        </div>
      </div>
    </div>
  )
}

function suffix(n) {
  if (n >= 11 && n <= 13) return 'th'
  const d = n % 10
  if (d === 1) return 'st'
  if (d === 2) return 'nd'
  if (d === 3) return 'rd'
  return 'th'
}
