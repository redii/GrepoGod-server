// Define consts and other variables here
// ===========================================
const express     = require('express')                  // to use express.js as webserver
const hbs         = require('hbs')                      // for handlebars as view engine
const numHelper   = require('handlebars.numeral')       // for number formating
const {mongoose}  = require('./db/mongoose.js')         // for mongodb connection
const {schema}    = require('./db/models/player.js')    // contains the mongoose orm model for "Player"

// Express.js and other configurations
// ===========================================
var app = express()                                     // Setup app variable
hbs.registerPartials(__dirname + '/views/partials')     // register partials directory
app.use(express.static(__dirname + '/public'))          // register public directory
app.set('view engine', 'hbs')                           // set viewing engine to handlebars
numHelper.registerHelpers(hbs)                          // add handlebars.numeral as Helper

// ============== HTTP HANDLERS ==============
// ===========================================
app.get('/', (req, res) => {                            // http get / (root site)
  res.render('index.hbs')
})

app.get('/worldselect', (req, res) => {                 // http get /worldselect
  res.render('worldselect.hbs')
})

app.get('/dashboard/:world', (req, res) => {            // http get /dashboard (with specified world parameter)
  res.render('dashboard.hbs', {                         // render dashboard.hbs with world data
    world: req.params.world
  })
})

app.get('/playerranking/:world', (req, res) => {        // http get /playerranking (with specific world parameter)
  var Player = mongoose.model(req.params.world, schema) // specify the Player schema with current world for query
  Player.find({}).sort('rank').then((players) => {      // get all objects in specified database sort by rank...
    res.render('playerranking.hbs', {                   // render playerranking.hbs with world and player data
      world: req.params.world,
      player: players
    })
  })
})

app.get('/playersearch/:world/:player?', (req, res) => {              // http get /playersearch (with specific world and optional player parameter)
  if (req.params.player) {                                            // if players param is given render the player information
    var Player = mongoose.model(req.params.world, schema)             // specify the Player schema with current world for query
    Player.findOne({name: req.params.player}).then((player) => {      // get all objects in specified database sort by rank...
      res.render('playersearch.hbs', {                                // render playerranking.hbs with world and player data
        world: req.params.world,
        player: player
      })
    })
  } else {
    res.render('playersearch.hbs', {                                  // render playerranking.hbs with world and player data
      world: req.params.world,
      player: null                                                    // leave player null for handlebars
    })
  }
})

app.get('/donations/:world?', (req, res) => {                            // http get /donation
  if (req.params.world) {
    res.render('donations.hbs', {
      world: req.params.world
    })
  } else {
    res.render('donations.hbs', {
      world: null
    })
  }
})

app.get('/test', (req, res) => {
  setTimeout(() => {
    res.send('kek')
  }, 5000)
})

// Start webserver to listen on port
// ===========================================
app.listen(5004, () => {                              // start app on port 5004
  console.log(`Server is running`)
})
