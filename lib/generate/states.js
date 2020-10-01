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
        sites: [
          {
            url: item.covid19Site,
            label: 'primary',
          },
          {
            url: item.covid19SiteSecondary,
            label: 'secondary',
          },
          { url: item.covid19SiteTertiary, label: 'tertiary' },
          { url: item.covid19SiteQuaternary, label: 'quaternary' },
          { url: item.covid19SiteQuinary, label: 'quinary' },
        ],
        census: {
          population: population
            .chain()
            .find({ state: item.state })
            .data({ removeMeta: true })
            .pop().population,
        },
        field_sources: {
          tests: {
            pcr: {
              total: item.totalTestResultsField,
            },
          },
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
