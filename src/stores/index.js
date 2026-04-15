import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── AUTH STORE ────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }
    set({ loading: false })
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null })
      if (session?.user) await get().fetchProfile(session.user.id)
    })
  },

  fetchProfile: async (id) => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', id).single()
    if (data) set({ profile: data })
    // Profile might not exist yet — that's ok, we use user.id directly
  },

  ensureProfile: async (user) => {
    // Upsert profile so it always exists
    const { data } = await supabase
      .from('profiles')
      .upsert({
        id:    user.id,
        email: user.email,
        name:  user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Studio',
      }, { onConflict: 'id' })
      .select().single()
    if (data) set({ profile: data })
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      set({ user: data.user })
      await get().ensureProfile(data.user)
    }
    return { error }
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      set({ user: data.user })
      // Create profile immediately on signup
      await supabase.from('profiles').upsert({
        id:    data.user.id,
        email: email,
        name:  name,
      }, { onConflict: 'id' })
      await get().fetchProfile(data.user.id)
    }
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

// ── PROJECT STORE ─────────────────────────────
export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  acts: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error) set({ projects: data ?? [] })
    set({ loading: false })
  },

  setCurrentProject: async (project) => {
    set({ currentProject: project })
    if (project) {
      const { data: acts } = await supabase
        .from('acts').select('*')
        .eq('project_id', project.id)
        .order('order_index')
      set({ acts: acts ?? [] })
    }
  },

  setActs: (acts) => set({ acts }),

  createProject: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not logged in' } }

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, owner_id: user.id })
      .select()
      .single()

    if (!error && data) {
      set(s => ({ projects: [data, ...s.projects] }))

      // Default acts — vary by project type so each project type
      // opens with structure that makes sense for its discipline
      const type = payload.type ?? 'film'
      const ACT_TEMPLATES = {
        film:     [
          { name: 'Act I',    color: 'teal',   position: 0,    end_pos: 0.33 },
          { name: 'Act II',   color: 'orange', position: 0.33, end_pos: 0.66 },
          { name: 'Act III',  color: 'red',    position: 0.66, end_pos: 1    },
        ],
        music:    [
          { name: 'Intro',    color: 'teal',   position: 0,    end_pos: 0.20 },
          { name: 'Verse',    color: 'orange', position: 0.20, end_pos: 0.55 },
          { name: 'Chorus',   color: 'purple', position: 0.55, end_pos: 0.80 },
          { name: 'Outro',    color: 'red',    position: 0.80, end_pos: 1    },
        ],
        brand:    [
          { name: 'Problem',  color: 'teal',   position: 0,    end_pos: 0.33 },
          { name: 'Solution', color: 'orange', position: 0.33, end_pos: 0.66 },
          { name: 'Promise',  color: 'green',  position: 0.66, end_pos: 1    },
        ],
        website:  [
          { name: 'Hero',     color: 'teal',   position: 0,    end_pos: 0.25 },
          { name: 'Content',  color: 'orange', position: 0.25, end_pos: 0.75 },
          { name: 'CTA',      color: 'green',  position: 0.75, end_pos: 1    },
        ],
        campaign: [
          { name: 'Awareness',color: 'teal',   position: 0,    end_pos: 0.33 },
          { name: 'Engage',   color: 'orange', position: 0.33, end_pos: 0.66 },
          { name: 'Convert',  color: 'green',  position: 0.66, end_pos: 1    },
        ],
        photo:    [
          { name: 'Opening',  color: 'teal',   position: 0,    end_pos: 0.33 },
          { name: 'Feature',  color: 'orange', position: 0.33, end_pos: 0.66 },
          { name: 'Close',    color: 'red',    position: 0.66, end_pos: 1    },
        ],
        other:    [
          { name: 'Part I',   color: 'teal',   position: 0,    end_pos: 0.33 },
          { name: 'Part II',  color: 'orange', position: 0.33, end_pos: 0.66 },
          { name: 'Part III', color: 'red',    position: 0.66, end_pos: 1    },
        ],
      }

      const template = ACT_TEMPLATES[type] ?? ACT_TEMPLATES.other
      const defaultActs = template.map((a, i) => ({
        project_id:  data.id,
        name:        a.name,
        position:    a.position,
        end_pos:     a.end_pos,
        color:       a.color,
        order_index: i,
      }))
      await supabase.from('acts').insert(defaultActs)
    }
    return { data, error }
  },

  updateProject: async (id, payload) => {
    const { data, error } = await supabase
      .from('projects').update(payload).eq('id', id).select().single()
    if (!error) {
      set(s => ({
        projects: s.projects.map(p => p.id === id ? data : p),
        currentProject: s.currentProject?.id === id ? data : s.currentProject,
      }))
    }
    return { data, error }
  },
}))

// ── NODE STORE ────────────────────────────────
export const useNodeStore = create((set, get) => ({
  nodes: [],
  selectedNode: null,
  loading: false,

  fetchNodes: async (projectId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('nodes').select('*')
      .eq('project_id', projectId)
      .order('position')
    set({ nodes: data ?? [], loading: false })
  },

  selectNode: (node) => set({ selectedNode: node }),

  createNode: async (payload) => {
    const { data, error } = await supabase
      .from('nodes').insert(payload).select().single()
    if (!error) set(s => ({
      nodes: [...s.nodes, data].sort((a,b) => a.position - b.position)
    }))
    return { data, error }
  },

  updateNode: async (id, payload) => {
    const { data, error } = await supabase
      .from('nodes').update(payload).eq('id', id).select().single()
    if (!error) {
      set(s => ({
        nodes: s.nodes.map(n => n.id === id ? data : n),
        selectedNode: s.selectedNode?.id === id ? data : s.selectedNode,
      }))
    }
    return { data, error }
  },

  lockNode: async (id, userId) => {
    return get().updateNode(id, {
      locked: true, status: 'locked',
      locked_by: userId, locked_at: new Date().toISOString()
    })
  },

  deleteNode: async (id) => {
    const { error } = await supabase.from('nodes').delete().eq('id', id)
    if (!error) set(s => ({
      nodes: s.nodes.filter(n => n.id !== id),
      selectedNode: null
    }))
    return { error }
  },
}))

// ── NOTES STORE ───────────────────────────────
export const useNotesStore = create((set) => ({
  notes: [],

  fetchNotes: async (nodeId) => {
    const { data } = await supabase
      .from('notes').select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false })
    set({ notes: data ?? [] })
  },

  addNote: async (payload) => {
    const { data, error } = await supabase
      .from('notes').insert(payload).select().single()
    if (!error) set(s => ({ notes: [data, ...s.notes] }))
    return { data, error }
  },

  resolveNote: async (id) => {
    const { data, error } = await supabase
      .from('notes').update({ resolved: true }).eq('id', id).select().single()
    if (!error) set(s => ({ notes: s.notes.map(n => n.id === id ? data : n) }))
    return { data, error }
  },

  deleteNote: async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) set(s => ({ notes: s.notes.filter(n => n.id !== id) }))
    return { error }
  },
}))

// ── ASSETS STORE ──────────────────────────────
export const useAssetsStore = create((set) => ({
  assets: [],

  fetchAssets: async (nodeId) => {
    const { data } = await supabase
      .from('assets').select('*')
      .eq('node_id', nodeId)
      .order('created_at')
    set({ assets: data ?? [] })
  },

  uploadAsset: async (file, payload) => {
    const ext  = file.name.split('.').pop()
    const path = `${payload.project_id}/${payload.node_id ?? 'general'}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('assets').upload(path, file, { upsert: true })

    if (uploadError) return { error: uploadError }

    const { data: { publicUrl } } = supabase.storage
      .from('assets').getPublicUrl(path)

    const { data, error } = await supabase
      .from('assets')
      .insert({ ...payload, file_url: publicUrl })
      .select().single()

    if (!error) set(s => ({ assets: [...s.assets, data] }))
    return { data, error }
  },

  deleteAsset: async (id) => {
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (!error) set(s => ({ assets: s.assets.filter(a => a.id !== id) }))
    return { error }
  },
}))

// ── UI STORE ──────────────────────────────────
export const useUIStore = create((set) => ({
  screen:     'loader',
  activeRoom: 'studio',
  activeTab:  'node',
  overlays: {
    sketch: false, compare: false, stage: false,
    brief: false, digest: false, quickCapture: false,
    moodboard: false, storyboard: false, callsheet: false,
  },
  toast:      { message: '', color: 'var(--orange)', visible: false },
  offline:    false,
  minimapPos: 6,

  setScreen:  (screen) => set({ screen }),
  setRoom:    (room)   => set({ activeRoom: room }),
  setTab:     (tab)    => set({ activeTab: tab }),
  setOffline: (v)      => set({ offline: v }),
  setMinimapPos: (pos) => set({ minimapPos: pos }),

  openOverlay:  (key) => set(s => ({ overlays: { ...s.overlays, [key]: true  } })),
  closeOverlay: (key) => set(s => ({ overlays: { ...s.overlays, [key]: false } })),
  closeAll: ()        => set(s => ({
    overlays: Object.fromEntries(Object.keys(s.overlays).map(k => [k, false]))
  })),

  showToast: (message, color = 'var(--orange)', duration = 3000) => {
    set({ toast: { message, color, visible: true } })
    clearTimeout(window.__toastTimer)
    window.__toastTimer = setTimeout(
      () => set(s => ({ toast: { ...s.toast, visible: false } })),
      duration
    )
  },
}))
