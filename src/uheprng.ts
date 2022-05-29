import { RNG } from './rng'

const { floor } = Math

function getMash () {
  let n = 0xefc8249d
  return function mash (data: any) {
    data = data.toString()
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n = h >>> 0
      h -= n
      h *= n
      n = h >>> 0
      h -= n
      n += h * 0x100000000 // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
  }
}

function cleanString (inStr: string) {
  return inStr
    .replace(/(^\s*)|(\s*$)/gi, '') // remove any/all leading spaces
    .replace(/[\x00-\x1F]/gi, '') // remove any/all control characters
    .replace(/\n /, '\n') // remove any/all trailing spaces
}

export class UHEPRNG implements RNG {
  readonly #o = 48
  #c = 1
  #p = this.#o
  #s = new Array(this.#o)

  #mash = getMash()

  readonly seed: string
  constructor(seed: string) {
    this.seed = cleanString(seed)
    this.#initSeed(this.seed)
  }

  #initSeed(seed: string) {
    let i: number, j: number, k: number

    for (i = 0; i < this.#o; i++) this.#s[i] = this.#mash(' ') // fill the array with initial mash hash values
    this.#mash(seed) // use the string to evolve the 'mash' state
    for (i = 0; i < seed.length; i++) { // scan through the characters in our string
      k = seed.charCodeAt(i) // get the character code at the location
      for (j = 0; j < this.#o; j++) { // "mash" it into the UHEPRNG state
        this.#s[j] -= this.#mash(k)
        if (this.#s[j] < 0) {
          this.#s[j] += 1
        }
      }
    }
  }

  #rawprng() {
    if (++this.#p >= this.#o) this.#p = 0
    const t = 1768863 * this.#s[this.#p] + this.#c * 2.3283064365386963e-10 // 2^-32
    return this.#s[this.#p] = t - (this.#c = t | 0)
  }

  next() {
    return this.#rawprng() + (this.#rawprng() * 0x200000 | 0) * 1.1102230246251565e-16 // 2^-53
  }
  nextInt(maxExclusive: number): number
  nextInt(minInclusive: number, maxExclusive: number): number
  nextInt() {
    switch (arguments.length) {
      case 0: {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/More_arguments_needed
        throw new TypeError('UHEPRNG.nextInt requires at least 1 argument, but only 0 were passed')
      }

      case 1: {
        const maxExclusive = floor(arguments[0])
        return floor(this.next() * maxExclusive)
      }

      default: {
        const minInclusive = floor(arguments[0])
        const maxExclusive = floor(arguments[1])
        return minInclusive + this.nextInt(maxExclusive - minInclusive)
      }
    }
  }

  done() {
    (<any> this.#mash) = null
  }
}
