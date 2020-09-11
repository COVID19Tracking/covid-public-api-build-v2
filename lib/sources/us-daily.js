const fetch = require('node-fetch')
const database = require('../database')

module.exports = () => {
  return new Promise((resolve, reject) => {
    const usDb = database.addCollection('us-daily', {
      indices: ['date'],
    })
    fetch(process.env.INTERNAL_API_US_DAILY)
      .then((response) => response.json())
      .then((daily) => {
        daily.forEach((item) => {
          usDb.insert(item)
        })
        console.log(`✅ Loaded ${daily.length} US daily records`)
        resolve()
      })
      .catch((error) => {
        reject(error)
      })
  })
}
