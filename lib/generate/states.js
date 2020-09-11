const write = require('../write')
const database = require('../database')
const endpointFields = require('../endpoint-fields')

module.exports = () => {
  const population = database.getCollection('population')

  const mapFields = (data) =>
    data.map((item) => {
      return {
        name: item.name,
        state_code: item.state,
        fips: item.fips,
        sites: {
          primary: item.covid19Site,
          secondary: item.covid19SiteSecondary,
          tertiary: item.covid19SiteTertiary,
        },
        census: {
          population: population
            .chain()
            .find({ state: item.state })
            .data({ removeMeta: true })
            .pop().population,
        },
        covid_tracking_project: {
          preferred_total_test: {
            field: item.covidTrackingProjectPreferredTotalTestField,
            units: item.covidTrackingProjectPreferredTotalTestUnits,
          },
        },
      }
    })
  return new Promise((resolve, reject) => {
    const defaultMeta = database
      .getCollection('status')
      .chain()
      .data({ removeMeta: true })
      .pop()
    const schema = {
      links: {
        self: 'https://api.covidtracking.com/v2/states',
      },
      meta: {
        ...defaultMeta,
        field_definitions: endpointFields(['states'], []),
      },
      data: mapFields(
        database.getCollection('states').chain().data({ removeMeta: true })
      ),
    }
    write(null, 'states', schema)
      .then(() => {
        console.log(`📝 Saved state metadata endpoint`)
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
