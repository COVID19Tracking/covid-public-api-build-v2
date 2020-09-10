const write = require('../write')

module.exports = (db) => {
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
        db.getCollection('field-definitions').chain().data({ removeMeta: true })
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
