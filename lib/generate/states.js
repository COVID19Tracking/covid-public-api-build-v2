const write = require('../write')

module.exports = (db) => {
  const population = db.getCollection('population')

  const mapFields = (data) =>
    data.map((item) => {
      return {
        name: item.name,
        code: item.state,
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
      meta: defaultMeta,
      data: mapFields(
        db.getCollection('states').chain().data({ removeMeta: true })
      ),
    }

    write('states', schema)
    resolve()
  })
}
