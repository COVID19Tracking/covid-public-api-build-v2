const write = require('../write')
const database = require('../database')

module.exports = () => {
  const mapFields = (data) =>
    data.map((item) => ({
      field: item.v2Name,
      deprecated:
        typeof item.deprecated !== 'undefined' ? item.deprecated : false,
      name: item.name,
      definition: item.definition,
      prior_names:
        typeof item.priorNames !== 'undefined'
          ? item.priorNames.split(',')
          : [],
    }))

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
      meta: defaultMeta,
      data: mapFields(
        database
          .getCollection('field-definitions')
          .chain()
          .data({ removeMeta: true })
      ),
    }

    write(null, 'fields', schema)
      .then(() => {
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
