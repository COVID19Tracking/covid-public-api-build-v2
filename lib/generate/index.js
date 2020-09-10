const states = require('./states')
module.exports = (db) => {
  return Promise.all([states(db)])
}
