import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { supabase } from '../supabase'
import { isNative } from '../utils/notifications'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [signupDone, setSignupDone] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])

  const checkMfa = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data.nextLevel === 'aal2' && data.currentLevel !== data.nextLevel) {
      setNeedsMfa(true)
    } else {
      setNeedsMfa(false)
    }
  }

  const loadFamily = useCallback(async (uid) => {
    const { data } = await supabase.from('family_members').select('*').eq('parent_id', uid).order('name')
    if (data) setFamilyMembers(data)
  }, [])

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
              emailVerified: session.user.email_confirmed_at != null || session.user.app_metadata?.provider === 'google',
            })
            checkMfa()
            loadFamily(session.user.id)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          phone: session.user.user_metadata?.phone || '',
          emailVerified: session.user.email_confirmed_at != null || session.user.app_metadata?.provider === 'google',
        }
        supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser({ ...u, name: data?.name || u.name, phone: data?.phone || u.phone })
          })
        checkMfa()
        loadFamily(session.user.id)
      } else {
        setUser(null)
        setNeedsMfa(false)
        setFamilyMembers([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadFamily])

  const signUp = async (email, password, name) => {
    const redirectTo = isNative()
      ? 'com.asthikasamaj.sandhyavandhanam://auth'
      : window.location.origin + '/auth'

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo,
      },
    })
    if (error) throw error
    setSignupDone(true)
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

  const addFamilyMember = async (name) => {
    if (!user || !name.trim()) return
    const { data, error } = await supabase
      .from('family_members')
      .insert({ parent_id: user.id, name: name.trim() })
      .select()
      .single()
    if (error) throw error
    setFamilyMembers(prev => [...prev, data])
    return data
  }

  const removeFamilyMember = async (id) => {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)
    if (error) throw error
    setFamilyMembers(prev => prev.filter(m => m.id !== id))
  }

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated')

    const { error: famErr } = await supabase.from('family_members').delete().eq('parent_id', user.id)
    if (famErr) throw new Error('Failed to delete family data: ' + famErr.message)

    const { error: actErr } = await supabase.from('activities').delete().eq('user_id', user.id)
    if (actErr) throw new Error('Failed to delete activity data: ' + actErr.message)

    const { error: profErr } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profErr) throw new Error('Failed to delete profile: ' + profErr.message)

    const { error: authErr } = await supabase.auth.signOut()
    if (authErr) throw new Error('Failed to sign out: ' + authErr.message)

    setUser(null)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error('Failed to sign out: ' + error.message)
    setUser(null)
    setNeedsMfa(false)
    setSignupDone(false)
    setFamilyMembers([])
  }

  return (
    <AuthContext.Provider value={{
      user, loading, needsMfa, setNeedsMfa, signupDone, setSignupDone,
      familyMembers, addFamilyMember, removeFamilyMember,
      signUp, signIn, signInWithGoogle, signOut, updateProfile, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
