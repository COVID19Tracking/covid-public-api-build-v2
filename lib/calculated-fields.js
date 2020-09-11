const database = require('./database')

module.exports = {
  percentPopulation: (population, number) => {
    if (typeof number === 'undefined' || !number) {
      return null
    }
    return Math.round((number / population) * 10000) / 100
  },

  sevenDayAverage: (data, index, field) => {
    if (typeof data[index + 6] === 'undefined') {
      return null
    }
    let total = 0
    for (let i = 0; i < 7; i++) {
      total += data[index + i][field]
    }
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
