const fetch = require('node-fetch')

module.exports = (database) => {
  return new Promise((resolve, reject) => {
    const statesDb = database.addCollection('states', { indices: ['state'] })
    fetch(process.env.INTERNAL_API_STATE_INFO)
      .then((response) => response.json())
      .then((states) => {
        states.forEach((state) => {
          statesDb.insert(state)
        })
        resolve()
      })
      .catch((error) => {
        reject(error)
      })
  })
}