const mongoose  = require('mongoose')                                 // This mongoose object gets exported to use in daemon.js
const c         = require('../config.json')                           // Database connection informations

mongoose.connect(`mongodb://${c.dburl}:${c.dbport}/${c.dbname}`)      // Connect to mongodb database with specified informations
mongoose.connection.on('connected', function () {
  console.log(`Database connection successful`)
})

module.exports = {mongoose}                                           // Export to use it in daemon.js
