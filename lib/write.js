const fs = require('fs-extra')

module.exports = (path, data) => {
  fs.writeJsonSync(`./_api/v2/${path}.json`, data)
}
