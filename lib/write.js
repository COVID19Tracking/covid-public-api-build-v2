const fs = require('fs-extra')

module.exports = (path, data) => fs.writeJson(`./_api/v2/${path}.json`, data)
