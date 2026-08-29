export function formatJsonInput(obj: any): string {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    const isSimple = obj.every(item => typeof item !== 'object' || item === null);
    if (isSimple && obj.length <= 50) {
      return `[${obj.map(x => JSON.stringify(x)).join(', ')}]`;
    }
    return `[\n${obj.map(x => `  ${formatJsonInput(x).split('\n').join('\n  ')}`).join(',\n')}\n]`;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  return `{\n${keys.map(k => `  "${k}": ${formatJsonInput(obj[k]).split('\n').join('\n  ')}`).join(',\n')}\n}`;
}
