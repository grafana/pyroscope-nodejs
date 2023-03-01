const Pyroscope = require('@pyroscope/nodejs')

Pyroscope.init({
  serverAddress: 'https://pyroscope.cloud',
  authToken: 'psx-2ZP0nL-3ntMYiyeeCqs7J-mv7tWmASfMAKmtwypY0bm2lQkXKvnV_wE',
  appName: 'nodejs.memory_leak',
})

Pyroscope.start()

//function fibonacci(n) {
//  if (n < 2) {
//    return n
//  }
//
//  return fibonacci(n - 1) + fibonacci(n - 2)
//}
//
//setTimeout(() => {
//  console.log('calculating fibonacci')
//  console.log(fibonacci(45))
//}, 1000)
