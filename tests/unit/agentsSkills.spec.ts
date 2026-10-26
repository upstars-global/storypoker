import { describe, it, expect } from 'vitest'
import skillsScript from '../../scripts/skills.sh?raw'

const instructionFiles = import.meta.glob<string>(
  [
    '/**/AGENTS.md',
    '/.github/AGENTS.md',
    '!/docs/**',
    '!/node_modules/**',
    '!/test-results/**',
    '!/dist/**',
    '!/auto-review-target/**',
  ],
  { query: '?raw', import: 'default', eager: true },
)

function enabledSkills(script: string) {
  const enabled = new Set<string>()
  for (const block of script.matchAll(/^npx [^\n]* -s \\\n((?: {2}.*\n)*?) {2}-a /gm)) {
    for (const line of block[1]!.split('\n')) {
      const name = line.match(/^ {2}([a-z0-9-]+) \\$/)?.[1]
      if (name) enabled.add(name)
    }
  }
  return enabled
}

function disabledSkills(script: string) {
  return new Set([...script.matchAll(/^ {2}\\ ([a-z0-9-]+) \\$/gm)].map((match) => match[1]!))
}

function namedSkills(text: string, disabled: Set<string>) {
  const named = new Set<string>()
  for (const match of text.matchAll(/(?:skill|скіл)\S* `([a-z0-9-]+)`/gi)) named.add(match[1]!)
  const sequences = text.match(/^## Workflow sequences\n([\s\S]*?)^## /m)?.[1] ?? ''
  for (const match of sequences.matchAll(/`([a-z0-9-]+)`/g)) named.add(match[1]!)
  for (const match of text.matchAll(/`([a-z0-9-]+)`/g)) {
    if (disabled.has(match[1]!)) named.add(match[1]!)
  }
  return named
}

describe('skills named in AGENTS.md', () => {
  it('are enabled in scripts/skills.sh', () => {
    const enabled = enabledSkills(skillsScript)
    const disabled = disabledSkills(skillsScript)
    const missing = Object.entries(instructionFiles).flatMap(([file, text]) => [...namedSkills(text, disabled)]
      .filter((name) => !enabled.has(name))
      .map((name) => `${file}: ${name}`))

    expect(enabled.size).toBeGreaterThan(20)
    expect(disabled.size).toBeGreaterThan(10)
    expect(Object.keys(instructionFiles)).toEqual(expect.arrayContaining(['/AGENTS.md', '/.github/AGENTS.md', '/app/components/AGENTS.md']))
    expect(missing).toEqual([])
  })
})
