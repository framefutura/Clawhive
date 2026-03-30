import { useState, useEffect, useCallback } from 'react'
import type { Session, Gene } from '../types'

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [availableGenes, setAvailableGenes] = useState<Gene[]>([])
  const [geneCategories, setGeneCategories] = useState<{ id: string; name: string; color: string }[]>([])

  const createSession = useCallback(async (
    agentId: string,
    modelConfig: unknown,
    genes?: string[]
  ) => {
    const session = await window.clawhive.createSession(agentId, modelConfig, genes) as Session
    setSessions(prev => [...prev, session])
    setActiveSession(session)
    return session
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    await window.clawhive.deleteSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSession?.id === sessionId) setActiveSession(null)
  }, [activeSession])

  const loadSessions = useCallback(async () => {
    const list = await window.clawhive.getSessions() as Session[]
    setSessions(list)
  }, [])

  const loadGenes = useCallback(async () => {
    const genes = await window.clawhive.getGenes() as Gene[]
    setAvailableGenes(genes)
  }, [])

  const loadGeneCategories = useCallback(async () => {
    const categories = await window.clawhive.getGeneCategories()
    setGeneCategories(categories)
  }, [])

  useEffect(() => {
    loadSessions()
    loadGenes()
    loadGeneCategories()
  }, [loadSessions, loadGenes, loadGeneCategories])

  return {
    sessions,
    activeSession,
    availableGenes,
    geneCategories,
    createSession,
    deleteSession,
    setActiveSession,
    loadSessions
  }
}
