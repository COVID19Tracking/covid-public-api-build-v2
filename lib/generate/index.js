const states = require('./states')
const fields = require('./fields')
const database = require('../database')
const statesDaily = require('./states-daily')
module.exports = () => {
  return Promise.all([fields(), states(), statesDaily()])
}
