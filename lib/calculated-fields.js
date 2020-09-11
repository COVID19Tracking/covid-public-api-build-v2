const database = require('./database')

module.exports = {
  percentPopulation: (population, number) => {
    if (typeof number === 'undefined' || !number) {
      return null
    }
    return Math.round((number / population) * 10000) / 100
  },

  sevenDayAverage: (state, date, field) => {
    const dates = database
      .getCollection('states-daily')
      .chain()
      .find({ state: { $eq: state }, date: { $lte: date } })
      .compoundsort([['date', true], 'state'])
      .limit(7)
      .data()
    if (dates.length < 7) {
      return null
    }
    let total = 0
    dates.forEach((item) => {
      total += item[field]
    })
    return Math.round((total / 7) * 10) / 10
  },

  increase: (state, date, field) => {
    const currentValue = database
      .getCollection('states-daily')
      .chain()
      .find({ state: { $eq: state }, date: { $lte: date } })
      .compoundsort([['date', true], 'state'])
      .limit(2)
      .data()
    if (currentValue[0] && currentValue[1]) {
      return currentValue[0][field] - currentValue[1][field]
    }
    return null
  },
}
