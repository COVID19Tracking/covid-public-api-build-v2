const fs = require('fs-extra')

module.exports = (path, file, data) => {
  const newPath = `./_api/v2/${path || ''}/`
  fs.ensureDirSync(newPath)
  return fs.writeJson(`${newPath}${file}.json`, data)
}
