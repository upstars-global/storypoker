import ts from 'typescript'

export interface IconBinding {
  file: string
  expression: string
}

export interface IconUsage {
  literals: string[]
  bindings: IconBinding[]
  allLiterals: string[]
}

export type ScannedUsage = Omit<IconUsage, 'allLiterals'> & Partial<Pick<IconUsage, 'allLiterals'>>

export interface DeclaredBinding {
  file: string
  expression: string
  names: readonly string[]
}

const ICON_NAME_SHAPE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*:[a-z0-9][a-z0-9-]*$/
const DELIVERABLE_PREFIXES = new Set(['ic', 'lucide', 'tabler', 'app'])
const ICONIFY_PREFIXES = new Set([...DELIVERABLE_PREFIXES, 'simple-icons', 'game-icons', 'mdi'])

function isIconName(value: string): boolean {
  return ICON_NAME_SHAPE.test(value)
}

function iconPrefix(value: string): string {
  return value.slice(0, value.indexOf(':'))
}

function isDeliverable(value: string): boolean {
  return DELIVERABLE_PREFIXES.has(iconPrefix(value))
}

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, ' ').trim()
}

const EXCLUDED_DECLARATIONS = new Set(['SHIELD_CATALOG'])

function isExcludedDeclaration(node: ts.Node): boolean {
  return ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name)
    && EXCLUDED_DECLARATIONS.has(node.name.text)
}

const ICON_COMPONENT = 'AppIcon'
const ICON_PROP = 'name'

function isIconProp(node: ts.Node): node is ts.JsxAttribute {
  if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || node.name.text !== ICON_PROP) return false
  const element = node.parent.parent
  return ts.isIdentifier(element.tagName) && element.tagName.text === ICON_COMPONENT
}

function collectLiterals(root: ts.Node, usage: IconUsage, iconContext: boolean): void {
  const visit = (node: ts.Node): void => {
    if (isExcludedDeclaration(node)) return
    if (ts.isStringLiteralLike(node) && isIconName(node.text)) {
      if (iconContext || ICONIFY_PREFIXES.has(iconPrefix(node.text))) usage.literals.push(node.text)
      usage.allLiterals.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
}

function collectFromSource(code: string, file: string, usage: IconUsage): void {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true, kind)
  const visit = (node: ts.Node): void => {
    if (isExcludedDeclaration(node)) return
    if (isIconProp(node) && node.initializer) {
      const value = node.initializer
      if (ts.isStringLiteral(value)) {
        if (isIconName(value.text)) {
          usage.literals.push(value.text)
          usage.allLiterals.push(value.text)
        }
        return
      }
      if (ts.isJsxExpression(value) && value.expression) {
        usage.bindings.push({ file, expression: normalizeExpression(value.expression.getText(source)) })
        collectLiterals(value.expression, usage, true)
        return
      }
    }
    if (ts.isStringLiteralLike(node) && isIconName(node.text)) {
      if (ICONIFY_PREFIXES.has(iconPrefix(node.text))) usage.literals.push(node.text)
      usage.allLiterals.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

const NON_USAGE_SOURCES = new Set(['app/utils/iconResolver.ts', 'app/utils/iconManifest.ts'])

export function isIconUsageSource(file: string): boolean {
  return !NON_USAGE_SOURCES.has(file) && !file.startsWith('app/generated/')
}

export function scanIconUsage(sources: Record<string, string>): IconUsage {
  const usage: IconUsage = { literals: [], bindings: [], allLiterals: [] }
  for (const [file, code] of Object.entries(sources)) collectFromSource(code, file, usage)
  usage.literals = [...new Set(usage.literals)].sort()
  usage.allLiterals = [...new Set(usage.allLiterals)].sort()
  return usage
}

export function validateIconUsage(
  usage: ScannedUsage,
  names: readonly string[],
  bindings: readonly DeclaredBinding[],
): string[] {
  const issues: string[] = []
  const known = new Set(names)
  const scannedLiterals = new Set(usage.allLiterals ?? [])
  for (const literal of usage.literals) {
    if (!isDeliverable(literal)) {
      issues.push(`icon collection not available locally: ${literal}`)
      continue
    }
    if (!known.has(literal)) issues.push(`unlisted icon literal: ${literal}`)
  }
  for (const name of names) {
    if (!isDeliverable(name)) issues.push(`icon collection not available locally: ${name} (manifest)`)
  }
  for (const binding of bindings) {
    if (!binding.names.length) {
      issues.push(`dynamic icon binding declares no names: ${binding.expression} (${binding.file})`)
    }
    for (const name of binding.names) {
      if (!isDeliverable(name)) {
        issues.push(`icon collection not available locally: ${name} (${binding.file})`)
        continue
      }
      if (!scannedLiterals.has(name)) {
        issues.push(`declared icon name is absent from the sources: ${name} (${binding.file})`)
      }
    }
  }
  const declared = new Set(bindings.map(binding => `${binding.file}::${binding.expression}`))
  const seen = new Set<string>()
  for (const binding of usage.bindings) {
    const key = `${binding.file}::${binding.expression}`
    seen.add(key)
    if (!declared.has(key)) {
      issues.push(`undeclared dynamic icon binding: ${binding.expression} (${binding.file})`)
    }
  }
  for (const key of declared) {
    if (!seen.has(key)) issues.push(`stale dynamic icon binding: ${key}`)
  }
  return issues
}
