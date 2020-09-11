const database = require('./database')

module.exports = (types, fields) =>
  database
    .getCollection('field-definitions')
    .chain()
    .where(
      (obj) => fields.indexOf(obj.v2Name) > -1 || types.indexOf(obj.type) > -1
    )
    .data({ removeMeta: true })
    .map((item) => ({
      name: item.name,
      field: item.v2Name,
      deprecated:
        typeof item.deprecated !== 'undefined' ? item.deprecated : false,
      prior_names:
        typeof item.priorNames !== 'undefined'
          ? item.priorNames.split(',')
          : [],
    }))
