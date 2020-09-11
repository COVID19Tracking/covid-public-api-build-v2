const fetch = require('node-fetch')
const database = require('../database')

module.exports = () => {
  return new Promise((resolve, reject) => {
    const statesDailyDb = database.addCollection('states-daily', {
      indices: ['state', 'date'],
    })
    fetch(process.env.INTERNAL_API_STATES_DAILY)
      .then((response) => response.json())
      .then((states) => {
        states.forEach((state) => {
          statesDailyDb.insert(state)
        })
        resolve()
      })
      .catch((error) => {
        reject(error)
      })
  })
}
