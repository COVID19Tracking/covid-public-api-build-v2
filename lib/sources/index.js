const states = require('./states')
const statesDaily = require('./states-daily')
const usDaily = require('./us-daily')
const population = require('./population')
const fieldDefinitions = require('./field-definitions')

module.exports = (loadCache) => {
  if (loadCache) {
    return new Promise((resolve) => resolve())
  }
  return Promise.all([
    states(),
    statesDaily(),
    usDaily(),
    population(),
    fieldDefinitions(),
  ])
}
