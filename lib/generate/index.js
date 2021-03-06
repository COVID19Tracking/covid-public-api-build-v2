const states = require('./states')
const fields = require('./fields')
const statesDaily = require('./states-daily')
const usDaily = require('./us-daily')
module.exports = () => {
  console.log(`🗄 Starting to save endpoints`)
  return Promise.all([fields(), states(), statesDaily(), usDaily()])
}
