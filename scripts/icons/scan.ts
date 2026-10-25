import { API } from 'typescript/unstable/sync'
import { createVirtualFileSystem } from 'typescript/unstable/fs'
import {
  isIdentifier,
  isJsxAttribute,
  isJsxExpression,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isNoSubstitutionTemplateLiteral,
  isStringLiteral,
  isVariableDeclaration,
  type JsxAttribute,
  type Node,
  type NoSubstitutionTemplateLiteral,
  type SourceFile,
  type StringLiteral,
} from 'typescript/unstable/ast'

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

function isExcludedDeclaration(node: Node): boolean {
  return isVariableDeclaration(node)
    && isIdentifier(node.name)
    && EXCLUDED_DECLARATIONS.has(node.name.text)
}

function isStringLiteralLike(node: Node): node is StringLiteral | NoSubstitutionTemplateLiteral {
  return isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)
}

const ICON_COMPONENT = 'AppIcon'
const ICON_PROP = 'name'

function iconPropsOf(node: Node): JsxAttribute[] {
  if (!isJsxSelfClosingElement(node) && !isJsxOpeningElement(node)) return []
  if (!isIdentifier(node.tagName) || node.tagName.text !== ICON_COMPONENT) return []
  return node.attributes.properties.filter((property): property is JsxAttribute =>
    isJsxAttribute(property) && isIdentifier(property.name) && property.name.text === ICON_PROP)
}

function collectLiterals(root: Node, usage: IconUsage, iconContext: boolean): void {
  const visit = (node: Node): void => {
    if (isExcludedDeclaration(node)) return
    if (isStringLiteralLike(node) && isIconName(node.text)) {
      if (iconContext || ICONIFY_PREFIXES.has(iconPrefix(node.text))) usage.literals.push(node.text)
      usage.allLiterals.push(node.text)
    }
    node.forEachChild(visit)
  }
  visit(root)
}

function collectIconProp(prop: JsxAttribute, file: string, source: SourceFile, usage: IconUsage): boolean {
  const value = prop.initializer
  if (!value) return false
  if (isStringLiteral(value)) {
    if (isIconName(value.text)) {
      usage.literals.push(value.text)
      usage.allLiterals.push(value.text)
    }
    return true
  }
  if (isJsxExpression(value) && value.expression) {
    usage.bindings.push({ file, expression: normalizeExpression(value.expression.getText(source)) })
    collectLiterals(value.expression, usage, true)
    return true
  }
  return false
}

function collectFromSource(source: SourceFile, file: string, usage: IconUsage): void {
  const handledProps = new Set<Node>()
  const visit = (node: Node): void => {
    if (isExcludedDeclaration(node)) return
    if (handledProps.has(node)) return
    for (const prop of iconPropsOf(node)) {
      if (collectIconProp(prop, file, source, usage)) handledProps.add(prop)
    }
    if (isStringLiteralLike(node) && isIconName(node.text)) {
      if (ICONIFY_PREFIXES.has(iconPrefix(node.text))) usage.literals.push(node.text)
      usage.allLiterals.push(node.text)
    }
    node.forEachChild(visit)
  }
  visit(source)
}

const VIRTUAL_ROOT = '/icon-scan'
const VIRTUAL_TSCONFIG = `${VIRTUAL_ROOT}/tsconfig.json`

function parseSources(sources: Record<string, string>, onSource: (source: SourceFile, file: string) => void): void {
  const files: Record<string, string> = {
    [VIRTUAL_TSCONFIG]: JSON.stringify({
      compilerOptions: { jsx: 'preserve', noLib: true, noResolve: true, types: [] },
      include: ['**/*'],
    }),
  }
  for (const [file, code] of Object.entries(sources)) files[`${VIRTUAL_ROOT}/${file}`] = code
  const api = new API({ cwd: VIRTUAL_ROOT, fs: createVirtualFileSystem(files) })
  try {
    const project = api.updateSnapshot({ openProjects: [VIRTUAL_TSCONFIG] }).getProject(VIRTUAL_TSCONFIG)
    if (!project) throw new Error('icon scan: TypeScript project did not open')
    for (const file of Object.keys(sources)) {
      const source = project.program.getSourceFile(`${VIRTUAL_ROOT}/${file}`)
      if (!source) throw new Error(`icon scan: TypeScript did not load ${file}`)
      onSource(source, file)
    }
  } finally {
    api.close()
  }
}

const NON_USAGE_SOURCES = new Set(['app/utils/iconResolver.ts', 'app/utils/iconManifest.ts'])

export function isIconUsageSource(file: string): boolean {
  return !NON_USAGE_SOURCES.has(file) && !file.startsWith('app/generated/')
}

export function scanIconUsage(sources: Record<string, string>): IconUsage {
  const usage: IconUsage = { literals: [], bindings: [], allLiterals: [] }
  if (Object.keys(sources).length) parseSources(sources, (source, file) => collectFromSource(source, file, usage))
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
