import React from 'react'

export default function App() {
  return (
    <div className="h-screen w-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">ClawHive</h1>
        <p className="text-muted-foreground">DeskClaw-inspired Cyber Workspace</p>
        <div className="flex gap-2 justify-center">
          <span className="gene-badge gene-badge-dev">Development</span>
          <span className="gene-badge gene-badge-data">Data</span>
          <span className="gene-badge gene-badge-ops">Ops</span>
        </div>
      </div>
    </div>
  )
}
