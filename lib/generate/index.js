const states = require('./states')
const fields = require('./fields')
const statesDaily = require('./states-daily')
module.exports = (db) => {
  return Promise.all([fields(db), states(db), statesDaily(db)])
}
