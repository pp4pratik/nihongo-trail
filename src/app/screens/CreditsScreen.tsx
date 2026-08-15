// Credits screen (§14.1 #12) — required, not optional (§6.1). Renders
// Appendix A's attribution text verbatim. Pulled forward from its formal
// Phase 2 slot (§16 lists it as a Phase 2 acceptance criterion, once
// dataset-derived content is actually in use) as deliberate legal cover
// ahead of the repo going public — see docs/DECISIONS.md and the design
// doc's open-source-readiness note. Reachable from Home for now; §14.1
// says "reachable from Settings," but Settings isn't built until later —
// this link is the interim path, not a claim that Settings exists.

import { Link } from 'react-router-dom'

const ATTRIBUTIONS = [
  {
    name: 'JMdict / JMnedict',
    lines: [
      'Property of the Electronic Dictionary Research and Development Group (EDRDG), used in conformance with the Group’s licence.',
      'Processed JSON via jmdict-simplified.',
    ],
    links: [
      { text: 'edrdg.org/edrdg/licence.html', href: 'https://www.edrdg.org/edrdg/licence.html' },
      {
        text: 'github.com/scriptin/jmdict-simplified',
        href: 'https://github.com/scriptin/jmdict-simplified',
      },
    ],
  },
  {
    name: 'KANJIDIC2',
    lines: [
      'Property of the EDRDG, released under the Creative Commons Attribution-ShareAlike License v4.0.',
    ],
    links: [
      { text: 'creativecommons.org/licenses/by-sa/4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    ],
  },
  {
    name: 'KRADFILE / RADKFILE',
    lines: [
      'Property of the EDRDG, used in conformance with the Group’s licence. RADKFILE2 / KRADFILE2 copyright Jim Rose.',
    ],
    links: [],
  },
  {
    name: 'KanjiVG',
    lines: ['Copyright Ulrich Apel, released under Creative Commons Attribution-ShareAlike 3.0.'],
    links: [{ text: 'kanjivg.tagaini.net', href: 'https://kanjivg.tagaini.net/' }],
  },
  {
    name: 'Tatoeba',
    lines: [
      'Example sentences from the Tatoeba Project, released under CC BY 2.0 FR (a subset under CC0 1.0).',
    ],
    links: [{ text: 'tatoeba.org', href: 'https://tatoeba.org/' }],
  },
  {
    name: 'Free Spaced Repetition Scheduler (ts-fsrs)',
    lines: ['MIT License.'],
    links: [
      { text: 'github.com/open-spaced-repetition/ts-fsrs', href: 'https://github.com/open-spaced-repetition/ts-fsrs' },
    ],
  },
]

export function CreditsScreen() {
  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <Link to="/" className="mb-6 inline-block text-sm text-neutral-500">
        ← Back
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Credits</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Nihongo Trail uses the following openly licensed data.
      </p>
      <div className="flex flex-col gap-6">
        {ATTRIBUTIONS.map((entry) => (
          <div key={entry.name} className="border-l-2 border-neutral-800 pl-4">
            <p className="font-semibold text-neutral-200">{entry.name}</p>
            {entry.lines.map((line) => (
              <p key={line} className="mt-1 text-sm text-neutral-400">
                {line}
              </p>
            ))}
            {entry.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-sm text-neutral-500 underline"
              >
                {link.text}
              </a>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-neutral-600">
        Derived content in public/content/ is distributed under CC BY-SA 4.0. Application source
        code is separately licensed under MIT. Full text in the repository's NOTICE and LICENSE
        files.
      </p>
    </div>
  )
}
