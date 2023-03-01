const { fibonacci } = require('./fib')

describe('fibonacci', () => {
  it('works', () => {
    //expect(fibonacci(48)).toBe(4807526976)
    expect(fibonacci(42)).toBe(267914296)
  })
})
