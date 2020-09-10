const fetch = require('node-fetch')

module.exports = (database) => {
  return new Promise((resolve, reject) => {
    const usDb = database.addCollection('us-daily', {
      indices: ['date'],
    })
    fetch(process.env.INTERNAL_API_US_DAILY)
      .then((response) => response.json())
      .then((states) => {
        states.forEach((state) => {
          usDb.insert(state)
        })
        resolve()
      })
      .catch((error) => {
        reject(error)
      })
  })
}
