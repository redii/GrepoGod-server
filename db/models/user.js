var mongoose = require('mongoose')

var Schema = mongoose.Schema
var schema = new Schema({     // Mongoose ORM Schema
  username: String,
  password: String,
  email: String,
  timestamps: {
    createdAt: String,
    updatedAt: String
  },
  myworlds: {}
})

var User = mongoose.model('users', schema)
module.exports = User
