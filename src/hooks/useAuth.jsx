import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../supabase'
import { isNative } from '../utils/notifications'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsMfa, setNeedsMfa] = useState(false)

  const buildUser = (session) => {
    if (!session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
      phone: session.user.user_metadata?.phone || '',
    }
  }

  const checkMfa = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data.nextLevel === 'aal2' && data.currentLevel !== data.nextLevel) {
      setNeedsMfa(true)
    } else {
      setNeedsMfa(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser({
              id: session.user.id,
              email: session.user.email,
              name: data?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
              phone: data?.phone || '',
            })
            checkMfa()
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = buildUser(session)
        supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser({ ...u, name: data?.name || u.name, phone: data?.phone || u.phone })
          })
        checkMfa()
      } else {
        setUser(null)
        setNeedsMfa(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const redirectTo = isNative()
      ? 'com.asthikasamaj.sandhyavandhanam://auth'
      : `${window.location.origin}`

    if (isNative()) {
      const [{ Browser }, { App }] = await Promise.all([
        import('@capacitor/browser'),
        import('@capacitor/app'),
      ])

      App.addListener('appUrlOpen', async ({ url }) => {
        await Browser.close()
        const hash = url.split('#')[1]
        if (hash) {
          const params = new URLSearchParams(hash)
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
          }
        }
      })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) throw error

      await Browser.open({ url: data.url, windowName: '_self' })
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('profiles')
      .update({ name: updates.name, phone: updates.phone })
      .eq('id', user.id)
    if (error) throw error
    setUser({ ...user, name: updates.name, phone: updates.phone })
  }

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated')
    await supabase.from('activities').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    setUser(null)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setNeedsMfa(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, needsMfa, setNeedsMfa, signUp, signIn, signInWithGoogle, signOut, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)