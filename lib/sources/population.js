const database = require('../database')
const usPopulation = require('../data/census_population_us.json')
const statePopulation = require('../data/census_population_state.json')

module.exports = () => {
  return new Promise((resolve, reject) => {
    const populationDb = database.addCollection('population', {
      indices: ['state'],
    })
    populationDb.insert({
      state: '_national',
      population: usPopulation.population,
    })
    statePopulation.forEach((state) => {
      populationDb.insert(state)
    })
    resolve()
  })
}
