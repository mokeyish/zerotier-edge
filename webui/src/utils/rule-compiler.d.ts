interface Rule {
  etherType?: number,
  not?: boolean,
  or?: boolean,
  type: string
}

export function compile(
  src: string,
  rules: Rule[],
  caps: Record<string, unknown>,
  tags: Record<string, unknown>
): [line: number, row: number, errorMsg: string] | undefined;