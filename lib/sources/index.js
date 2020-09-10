const states = require('./states')
const statesDaily = require('./states-daily')
const usDaily = require('./us-daily')
const population = require('./population')
const fieldDefinitions = require('./field-definitions')

module.exports = (db, loadCache) => {
  if (loadCache) {
    return new Promise((resolve) => resolve())
  }
  return Promise.all([
    states(db),
    statesDaily(db),
    usDaily(db),
    population(db),
    fieldDefinitions(db),
  ])
}
