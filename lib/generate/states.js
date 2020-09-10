const write = require('../write')
const endpointFields = require('../endpoint-fields')

module.exports = (db) => {
  const population = db.getCollection('population')

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
    const defaultMeta = db
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
        field_definitions: endpointFields(
          db,
          ['states'],
          [
            'state_code',
            'name',
            'fips',
            'sites.primary',
            'sites.secondary',
            'sites.tertiary',
            'census.population',
            'covid_tracking_project.preferred_total_test.field',
            'covid_tracking_project.preferred_total_test.units',
          ]
        ),
      },
      data: mapFields(
        db.getCollection('states').chain().data({ removeMeta: true })
      ),
    }

    write(null, 'states', schema)
      .then(() => {
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
