export class SiweDeprecationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SiweDeprecationError'
  }
}
