const contentful = require('contentful')
const database = require('../database')

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE,
  accessToken: process.env.CONTENTFUL_TOKEN,
})

module.exports = () => {
  return new Promise((resolve, reject) => {
    const fieldDefinitionDb = database.addCollection('field-definitions', {
      indices: ['v2Name'],
    })
    client
      .getEntries({ content_type: 'dataDefinition' })
      .then((entries) => {
        console.log(`✅ Loaded ${entries.items.length} field definitions`)
        entries.items.forEach((entry) => {
          fieldDefinitionDb.insert(entry.fields)
        })

        resolve()
      })
      .catch((error) => {
        reject(error)
      })
  })
}
