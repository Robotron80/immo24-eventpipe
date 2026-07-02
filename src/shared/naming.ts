import path from 'node:path'

export function buildOutputName(sourcePath: string): string {
  const sourceName = path.parse(sourcePath).name
  return `${sourceName}.mxf`
}
