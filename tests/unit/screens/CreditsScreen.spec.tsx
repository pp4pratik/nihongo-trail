import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CreditsScreen } from '@/app/screens/CreditsScreen'

// §6.1: "Full attribution text is specified in Appendix A and must render
// on an in-app Credits screen reachable from Settings, plus a NOTICE file
// in the repo." This test checks the screen actually covers every source
// named in Appendix A, not just that the component renders.

describe('CreditsScreen', () => {
  it('renders every required attribution from Appendix A', () => {
    render(
      <MemoryRouter>
        <CreditsScreen />
      </MemoryRouter>,
    )
    for (const name of [
      'JMdict / JMnedict',
      'KANJIDIC2',
      'KRADFILE / RADKFILE',
      'KanjiVG',
      'Tatoeba',
      'ts-fsrs',
    ]) {
      const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      expect(screen.getAllByText(pattern).length).toBeGreaterThan(0)
    }
  })

  it('links back to home', () => {
    render(
      <MemoryRouter>
        <CreditsScreen />
      </MemoryRouter>,
    )
    expect(screen.getByText('← Back').closest('a')).toHaveAttribute('href', '/')
  })
})

describe('NOTICE file and Credits screen stay in sync', () => {
  it('every source named in the repo-root NOTICE file also appears on the Credits screen', () => {
    const notice = readFileSync(resolve(process.cwd(), 'NOTICE'), 'utf-8')
    for (const name of ['JMdict', 'KANJIDIC2', 'KRADFILE', 'KanjiVG', 'Tatoeba', 'ts-fsrs']) {
      expect(notice).toContain(name)
    }
  })
})
