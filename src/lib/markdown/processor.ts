/**
 * Markdown processing pipeline using unified/remark/rehype.
 * Used for server-side or utility rendering (e.g. doc generation, PDF export).
 * For live preview, use react-markdown directly in MarkdownPreview.tsx.
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

// ─── HTML render ─────────────────────────────────────────────────────────────

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown)

  return String(result)
}

// ─── Doc generation from code ─────────────────────────────────────────────────

interface ParsedParam {
  name: string
  type: string
}

interface FunctionDoc {
  name: string
  params: ParsedParam[]
  returnType: string
  description: string
  markdownBlock: string
}

/**
 * Basic local doc extractor — no external APIs.
 * Parses TypeScript/JavaScript function signatures and generates Markdown docs.
 */
export function generateDocFromCode(code: string): FunctionDoc | null {
  // Match: function name(params): returnType or const name = (params): returnType =>
  const funcRegex =
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w<>\[\]|& ]+))?/
  const arrowRegex =
    /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*([\w<>\[\]|& ]+))?\s*=>/

  const match = code.match(funcRegex) ?? code.match(arrowRegex)
  if (!match) return null

  const [, name, rawParams, returnType = 'void'] = match

  const params: ParsedParam[] = rawParams
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const [paramName, paramType = 'any'] = p.split(':').map(s => s.trim())
      return { name: paramName.replace(/[?=].*/, ''), type: paramType }
    })

  const description = `Función \`${name}\` con ${params.length} parámetro${params.length !== 1 ? 's' : ''}.`

  const paramDocs = params.map(p => `| \`${p.name}\` | \`${p.type}\` | — |`).join('\n')

  const markdownBlock = [
    `### \`${name}\``,
    '',
    description,
    '',
    '**Parámetros**',
    '',
    '| Nombre | Tipo | Descripción |',
    '|--------|------|-------------|',
    paramDocs || '| — | — | Sin parámetros |',
    '',
    `**Retorna:** \`${returnType}\``,
    '',
    '**Uso**',
    '',
    '```typescript',
    generateUsageExample(name, params, returnType),
    '```',
  ].join('\n')

  return { name, params, returnType, description, markdownBlock }
}

function generateUsageExample(name: string, params: ParsedParam[], returnType: string): string {
  const args = params.map(p => exampleValue(p.type)).join(', ')
  const assignment = returnType !== 'void' ? `const result = ` : ''
  return `${assignment}${name}(${args})`
}

function exampleValue(type: string): string {
  const t = type.toLowerCase().trim()
  if (t === 'string') return `'ejemplo'`
  if (t === 'number') return `42`
  if (t === 'boolean') return `true`
  if (t.startsWith('string[]')) return `['a', 'b']`
  if (t.startsWith('number[]')) return `[1, 2]`
  if (t === 'void' || t === 'undefined') return ''
  return `/* ${type} */`
}
