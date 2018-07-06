// Requiring modules and files
// ===========================================
const port              = process.env.PORT || 3000            // Set port variable for live/dev
const express           = require('express')                  // to use express.js as webserver
const hbs               = require('hbs')                      // for handlebars as view engine
const session           = require('express-session')          // for session handling with passport
const flash             = require('connect-flash')            // dependency for passport.js
const bodyParser        = require('body-parser')              // for html body parsing
const passport          = require('passport')                 // for user authentication
const LocalStrategy     = require('passport-local').Strategy  // for using passports local strategy
const bcrypt            = require('bcryptjs')                 // for password hashing
const validator         = require('validator')                // for email input validation
const numHelper         = require('handlebars.numeral')       // for number formating
const c                 = require('./config.json')            // for worlds variable
const {mongoose}        = require('./db/mongoose.js')         // for mongodb connection
const {playerSchema}    = require('./db/models/player.js')    // contains the mongoose orm model for "Player"
const {allianceSchema}  = require('./db/models/alliance.js')  // contains the mongoose orm model for "Alliance"
const User              = require('./db/models/user.js')      // exports the users collection for access

// Express.js configuration + Some other stuff
// ===========================================
var app = express()                                       // Setup app variable
app.use(express.static(__dirname + '/public'))            // register public directory
hbs.registerPartials(__dirname + '/views/partials')       // register partials directory
app.set('view engine', 'hbs')                             // set viewing engine to handlebars

numHelper.registerHelpers(hbs)                            // add handlebars.numeral as Helper

// Passport.js configuration
// http://toon.io/understanding-passportjs-authentication-flow/
// ===========================================
app.use(session({                                        // in order to use flash() + cookie
  secret: "????",                                         // is required for sessions
  cookie: {                                               // Cookie configuration
    maxAge: 60000000
  }
}))
app.use(flash())                                         // in order to use passport
app.use(bodyParser.urlencoded({ extended: false }))      // body parsing for inputs
app.use(passport.initialize())                           // initialize passport.js
app.use(passport.session())                              // to use persistent sessions

passport.use(new LocalStrategy((username, password, done) => {   // Use local strategy
  User.findOne({username: username}, (err, user) => {                                                     // find registered user
    if(err) { return done(err) }                                                                          // if error occurs while using db
    if (!user) { return done(null, false, { message: 'Incorrect username.' }) }                           // if username doesnt exist
    if (!bcrypt.compareSync(password, user.password)) { return done(null, false, { message: 'Incorrect password.' }) }   // if password is invalid
    return done(null, user)                                                                               // if cred are valid
  })
}))

passport.serializeUser(function(user, done) {            // gets called to authenticate user
  done(null, user)
});

passport.deserializeUser(function(user, done) {          // gets called to deauthenticate user
  done(null, user)
});

// ============== HTTP HANDLERS ==============
// ===========================================
// ROOT (GET)
app.get('/', (req, res) => {                             // http get / for root page
  if(req.user) {                                         // skip index page if user is logged in
    res.redirect(`/dashboard/${req.session.passport.user.myworlds[0]}`)
  } else {
    res.render('index.hbs')
  }
})

// LOGIN (POST)
app.post('/login', passport.authenticate('local', {      // http post /login using passport.authenticate()
  successRedirect: '/dashboard/de88',                    // success redirect
  failureRedirect: '/',                                  // failure redirect
  failureFlash:    true                                  // for feedback message
}))

// LOGOUT (GET)
app.get('/logout', (req, res) => {                       // http get /logout for user deauthentication
  req.logout()                                           // log out user
  res.redirect('/')                                      // and redirect to root page
})

// REGISTER (POST)
app.post('/register', (req, res) => {                    // http post /register for user registration
  if(req.body.username && req.body.password && req.body.email && req.body.world) {     // if needed data was submitted
    if(validator.isEmail(req.body.email) == false) {      // if syntax error -> render signup.hbs
      res.render('signup.hbs', {
        title: 'Signup',
        worlds: c.worlds,
        emailValidationFailed: true
      })
    } else {                                              // else search for existing user
      User.findOne({ $or: [{ "username": req.body.username }, { "email": req.body.email }] }, (err, user) => {
        if(user) {                                        // if user exists...
          res.render('signup.hbs', {                      // render signup page
            title: 'Signup',
            worlds: c.worlds,
            userAlreadyExists: true
          })
        } else {                                          // if user doesnt exists...
          bcrypt.genSalt(10, (err, salt) => {             // hash password
            bcrypt.hash(req.body.password, salt, (err, hash) => {
              var newuser = new User({                    // create new user object
                username: req.body.username,
                password: hash,
                email: req.body.email,
                myworlds: [ req.body.world ]
              })
              newuser.save((err) => {                     // save user object to database
                if (err) return handleError(err)
              })
            })
          })
          res.redirect('/')                               // then redirect to starting page
        }
      })
    }
  } else {                                                // if data is missing...
    res.render('signup.hbs', {                            // render signup page
      title: 'Signup',
      worlds: c.worlds,
      dataMissing: true
    })
  }
})

// WORLD SELECTION (GET)
app.get('/worldselect', (req, res) => {                  // http get /worldselect for guest world selection
  if(req.user) {                                         // if user is authenticated redirect to dashboard of his first specified world
    res.redirect(`/dashboard/${req.session.passport.user.myworlds[0]}`)
  } else {                                               // if user isn't set render worldselect
    res.render('worldselect.hbs', {
      title: 'World Selection'
    })
  }
})

// REGISTRATION (GET)
app.get('/signup', (req, res) => {                       // http get /signup for user registration form
  if(req.user) {                                         // if user is authenticated show settings page
    res.redirect('/')
  } else {                                               // else redirect to index page
    res.render('signup.hbs', {
      title: 'Signup',
      worlds: c.worlds
    })
  }
})

// SETTINGS (GET)
app.get('/settings', (req, res) => {                     // http get /settings for user settings
  if(req.user) {                                         // if user is authenticated show settings page
    res.render('settings.hbs', {
      user: req.session.passport.user,
      title: 'Settings'
    })
  } else {                                               // else redirect to index page
    res.redirect('/')
  }
})

// DONATIONS (GET)
app.get('/donations/:world?', (req, res) => {            // http get /donations (with optional world parameter)
  if (req.params.world) {                                // if optional world parameter is set do...
    if(req.user) {                                       // if user is authenticated...
      res.render('donations.hbs', {                      // render template with user data
        world: req.params.world,
        user: req.session.passport.user,
        title: 'Donations'
      })
    } else {                                             // if user isn't logged in...
      res.render('donations.hbs', {                      // render template without user data
        world: req.params.world
      })
    }
  } else {                                               // if world is not specified...
    res.render('donations.hbs')                          // render template without any informations
  }
})

// DASHBOARD (GET)
app.get('/dashboard/:world', (req, res) => {             // http get /dashboard (with specified world parameter)
  if(req.user) {
    res.render('dashboard.hbs', {                        // render dashboard.hbs with world and user data
      world: req.params.world,
      user: req.session.passport.user,
      title: 'Dashboard'
    })
  } else {
    res.render('dashboard.hbs', {                        // render dashboard.hbs with world data
      world: req.params.world,
      title: 'Dashboard'
    })
  }
})

// PLAYERRANKING (GET)
app.get('/playerranking/:world', (req, res) => {         // http get /playerranking (with specific world parameter)
  var Player = mongoose.model(req.params.world, playerSchema)  // specify the Player schema with current world for query
  Player.find({}).sort('rank').then((players) => {             // get all objects in specified database sort by rank...
    if(req.user) {
      res.render('playerranking.hbs', {                  // render playerranking.hbs with world and player data
        world: req.params.world,
        player: players,
        user: req.session.passport.user,
        title: 'Playerranking'
      })
    } else {
      res.render('playerranking.hbs', {                  // render playerranking.hbs with world and player data
        world: req.params.world,
        player: players,
        title: 'Playerranking'
      })
    }
  })
})

// ALLIANCERANKING (GET)
app.get('/allianceranking/:world', (req, res) => {       // http get /playerranking (with specific world parameter)
  var Alliance = mongoose.model(`${req.params.world}_alliances`, allianceSchema)  // specify the Player schema with current world for query
  Alliance.find({}).sort('rank').then((alliance) => {      // get all objects in specified database sort by rank...
    if(req.user) {
      res.render('allianceranking.hbs', {                  // render playerranking.hbs with world and player data
        world: req.params.world,
        alliance: alliance,
        user: req.session.passport.user,
        title: 'Allianceranking'
      })
    } else {
      res.render('allianceranking.hbs', {                  // render playerranking.hbs with world and player data
        world: req.params.world,
        alliance: alliance,
        title: 'Allianceranking'
      })
    }
  })
})

// PLAYERSEARCH (GET)
app.get('/playersearch/:world/:player?', (req, res) => {              // http get /playersearch (with specific world and optional player parameter)
  if (req.params.player) {                                            // if players param is given render the player information
    var Player = mongoose.model(req.params.world, playerSchema)       // specify the Player schema with current world for query
    Player.findOne({name: req.params.player}).then((player) => {      // get all objects in specified database sort by rank...
      if(player) {                                                    // if player has been found do...
        if(req.user) {                                                // if user is logged in..
          res.render('playersearch.hbs', {                            // render playerranking.hbs with world, player and user data
            world: req.params.world,
            player: player,
            user: req.session.passport.user,
            title: 'Playersearch'
          })
        } else {                                                      // if user is not logged in...
          res.render('playersearch.hbs', {                            // render playerranking.hbs with world and player data
            world: req.params.world,
            player: player,
            title: 'Playersearch'
          })
        }
      } else {                                                        // if player could not be found do...
        if(req.user) {                                                // and if user is logged in..
          res.render('playersearch.hbs', {                            // render playerranking.hbs with world, user and notfound notice
            world: req.params.world,
            notfound: req.params.player,
            user: req.session.passport.user,
            title: 'Playersearch'
          })
        } else {                                                      // if user is not logged in...
          res.render('playersearch.hbs', {                            // render playerranking.hbs with world and notfound notice
            world: req.params.world,
            notfound: req.params.player,
            title: 'Playersearch'
          })
        }
      }
    })
  } else {                                                            // if no player is specified show start page
    if(req.user) {                                                    // if user is logged in...
      res.render('playersearch.hbs', {                                // render playerranking.hbs with world and user data
        world: req.params.world,
        user: req.session.passport.user,
        title: 'Playersearch'
      })
    } else {                                                          // if user is not logged in...
      res.render('playersearch.hbs', {                                // render playerranking.hbs with world parameter
        world: req.params.world,
        title: 'Playersearch'
      })
    }
  }
})

// PLAYERSEARCH (GET)
app.get('/alliancesearch/:world/:alliance?', (req, res) => {          // http get /playersearch (with specific world and optional player parameter)
  if (req.params.alliance) {                                          // if players param is given render the player information
    var Alliance = mongoose.model(`${req.params.world}_alliances`, allianceSchema)       // specify the Player schema with current world for query
    Alliance.findOne({name: req.params.alliance}).then((alliance) => {// get all objects in specified database sort by rank...
      if(alliance) {                                                  // if player has been found do...
        if(req.user) {                                                // if user is logged in..
          res.render('alliancesearch.hbs', {                          // render playerranking.hbs with world, player and user data
            world: req.params.world,
            alliance: alliance,
            user: req.session.passport.user,
            title: 'Alliancesearch'
          })
        } else {                                                      // if user is not logged in...
          res.render('alliancesearch.hbs', {                          // render playerranking.hbs with world and player data
            world: req.params.world,
            alliance: alliance,
            title: 'Alliancesearch'
          })
        }
      } else {                                                        // if player could not be found do...
        if(req.user) {                                                // and if user is logged in..
          res.render('alliancesearch.hbs', {                          // render playerranking.hbs with world, user and notfound notice
            world: req.params.world,
            notfound: req.params.alliance,
            user: req.session.passport.user,
            title: 'Alliancesearch'
          })
        } else {                                                      // if user is not logged in...
          res.render('alliancesearch.hbs', {                          // render playerranking.hbs with world and notfound notice
            world: req.params.world,
            notfound: req.params.alliance,
            title: 'Alliancesearch'
          })
        }
      }
    })
  } else {                                                            // if no player is specified show start page
    if(req.user) {                                                    // if user is logged in...
      res.render('alliancesearch.hbs', {                              // render playerranking.hbs with world and user data
        world: req.params.world,
        user: req.session.passport.user,
        title: 'Alliancesearch'
      })
    } else {                                                          // if user is not logged in...
      res.render('alliancesearch.hbs', {                              // render playerranking.hbs with world parameter
        world: req.params.world,
        title: 'Alliancesearch'
      })
    }
  }
})

// Start webserver to listen on specified port
// ===========================================
app.listen(port, () => {
  console.log(`Server is running on Port ${port}`)
})
