import { parse } from '@vue/compiler-sfc'
import type { AttributeNode, DirectiveNode, ElementNode, TemplateChildNode } from '@vue/compiler-core'
import ts from 'typescript'

export interface IconBinding {
  file: string
  expression: string
}

export interface IconUsage {
  literals: string[]
  bindings: IconBinding[]
}

export interface DeclaredBinding {
  file: string
  expression: string
  names: readonly string[]
}

const ICON_NAME = /^(?:ic|lucide|tabler|app|simple-icons|game-icons):[a-z0-9][a-z0-9-]*$/

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, ' ').trim()
}

const EXCLUDED_DECLARATIONS = new Set(['SHIELD_CATALOG'])

function isExcludedDeclaration(node: ts.Node): boolean {
  return ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name)
    && EXCLUDED_DECLARATIONS.has(node.name.text)
}

function collectFromScript(code: string, file: string, usage: IconUsage): void {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
  const visit = (node: ts.Node): void => {
    if (isExcludedDeclaration(node)) return
    if (ts.isStringLiteralLike(node) && ICON_NAME.test(node.text)) usage.literals.push(node.text)
    ts.forEachChild(node, visit)
  }
  visit(source)
}

function isElement(node: TemplateChildNode): node is ElementNode {
  return node.type === 1
}

function collectFromTemplate(node: TemplateChildNode, file: string, usage: IconUsage): void {
  if (isElement(node)) {
    for (const prop of node.props) {
      if (prop.type === 6) {
        const attr = prop as AttributeNode
        if (attr.name === 'icon' && attr.value && ICON_NAME.test(attr.value.content)) {
          usage.literals.push(attr.value.content)
        }
        continue
      }
      const dir = prop as DirectiveNode
      if (dir.name !== 'bind') continue
      const arg = dir.arg
      if (!arg || arg.type !== 4 || arg.content !== 'icon') continue
      const exp = dir.exp
      if (!exp || exp.type !== 4) continue
      usage.bindings.push({ file, expression: normalizeExpression(exp.content) })
      collectFromScript(`(${exp.content})`, file, usage)
    }
    for (const child of node.children) collectFromTemplate(child, file, usage)
    return
  }
}

const NON_USAGE_SOURCES = new Set(['app/utils/iconResolver.ts', 'app/utils/iconManifest.ts'])

export function isIconUsageSource(file: string): boolean {
  return !NON_USAGE_SOURCES.has(file) && !file.startsWith('app/generated/')
}

export function scanIconUsage(sources: Record<string, string>): IconUsage {
  const usage: IconUsage = { literals: [], bindings: [] }
  for (const [file, code] of Object.entries(sources)) {
    if (file.endsWith('.vue')) {
      const { descriptor } = parse(code, { filename: file })
      if (descriptor.template?.ast) {
        for (const child of descriptor.template.ast.children) collectFromTemplate(child, file, usage)
      }
      for (const block of [descriptor.script, descriptor.scriptSetup]) {
        if (block) collectFromScript(block.content, file, usage)
      }
      continue
    }
    collectFromScript(code, file, usage)
  }
  usage.literals = [...new Set(usage.literals)].sort()
  return usage
}

export function validateIconUsage(
  usage: IconUsage,
  names: readonly string[],
  bindings: readonly DeclaredBinding[],
): string[] {
  const issues: string[] = []
  const known = new Set(names)
  for (const literal of usage.literals) {
    if (!known.has(literal)) issues.push(`unlisted icon literal: ${literal}`)
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
