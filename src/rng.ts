export interface RNG {
  readonly seed: string

  next(): number
  nextInt(maxExclusive: number): number
  nextInt(minInclusive: number, maxExclusive: number): number

  done(): void
}

