const states = require('./states')
const fields = require('./fields')
module.exports = (db) => {
  return Promise.all([states(db), fields(db)])
}
