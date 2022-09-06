//#region - All the requirements and initial setups
const db = require("./modules/application.js")

const exphbs = require("express-handlebars")
var express = require("express")

const clientSessions = require("client-sessions")

var app = express()
app.set("view engine", ".hbs")

var HTTP_PORT = process.env.PORT || 8000

//allows us to access files within public and views
app.use(express.static("views"))
//allows us to read from the body
app.use(express.urlencoded({ extended: true }))

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      navLink: (url, options) => {
        return (
          "<li" +
          (url == app.locals.activeRoute
            ? ' class="nav-item active" '
            : ' class="nav-item" ') +
          '><a class="nav-link" href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        )
      },

      sideLink: (url, options) => {
        return (
          "<a" +
          (url == app.locals.activeRoute
            ? ' class="list-group-item list-group-item-action list-group-item-info rounded-border-10 active" '
            : ' class="list-group-item list-group-item-action list-group-item-info rounded-border-10" ') +
          'href="' +
          url +
          '"> <i class="fas fa-lock fa-fw me-3"></i>' +
          options.fn(this) +
          "</a>"
        )
      },
    },
  })
)

//to fix the highlighting of the nav
app.use((req, res, next) => {
  let route = req.path.substring(1)
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""))
  next()
})

//#endregion

//#region - setting up cookie
app.use(
  clientSessions({
    cookieName: "capsession",
    secret: "cap805_cc",
    duration: 60 * 1000,
    activeDuration: 5 * 60 * 1000,
  })
)
//#endregion

//#region - Main pages of the website that is open to everyone
//Routes
app.get("/", (req, res) => {
  //console.log("home: " + req.capsession.user.username)
  db.getPopularPosts()
    .then((popularPosts) => {
      db.getPosts()
        .then((posts) => {
          res.render("home", {
            forumPost: posts,
            user: req.capsession.user,
            popularPosts: popularPosts,
          })
        })
        .catch()
    })
    .catch()
})

//get the categories page
app.get("/categories", (req, res) => {
  db.getCategories().then((categories) => {
    res.render("categories", {
      user: req.capsession.user,
      Categories: categories,
    })
  })
})

//go to th top threads page
app.get("/topthreads", (req, res) => {
  db.getTopPosts()
    .then((result) => {
      res.render("topthreads", { user: req.capsession.user, threads: result })
    })
    .catch()
})

//get the about us page
app.get("/aboutus", (req, res) => {
  res.render("aboutus", { user: req.capsession.user })
})

//get the contact us page
app.get("/contact", (req, res) => {
  res.render("contact", { user: req.capsession.user })
})

app.post("/contact", (req, res) => {
  const firstname = req.body.firstname
  const lastname = req.body.lastname
  const country = req.body.country
  const content = req.body.content

  db.addMessage(firstname, lastname, country, content)
    .then(() => {
      res.redirect("/contact")
    })
    .catch((err) => {
      console.log(err)
    })
})

//#endregion

//#region - Registration function - Checks if username, email is already in use and password has to following a certain guide
//get the register page
app.get("/register", (req, res) => {
  res.render("register")
})

//registering a new user
app.post("/register", (req, res) => {
  const username = req.body.username
  const email = req.body.email
  const password = req.body.password
  const passwordConfirm = req.body.passwordconfirm

  if (db.isEmpty(username)) {
    return res.render("register", {
      errorMsg: "Username cannot be empty",
    })
  }
  if (db.hasSpaces(username)) {
    return res.render("register", { errorMsg: "Username cannot have Spaces" })
  }

  if (!db.passwordGuide(password)) {
    return res.render("register", {
      pwMsg:
        "Password must be at least 6 characters, contain at least one special character, one capital letter, one lower case letter, and a number.",
    })
  }

  if (!db.isPasswordSame(password, passwordConfirm)) {
    return res.render("register", {
      pwMsg: "Passwords do not match",
    })
  }

  db.register(username, email, password)
    .then((user_id) => {
      db.addUserRole(user_id, 1).then().catch()
      //console.log(user_id)
      res.redirect("/")
    })
    .catch((err) => {
      if (
        err.includes(
          'duplicate key value violates unique constraint "users_email_key"'
        )
      ) {
        console.log("Email already taken")
        res.render("register", {
          errorMsg: "Email already taken.",
        })
      } else if (
        err.includes(
          'duplicate key value violates unique constraint "users_username_key"'
        )
      ) {
        console.log("Username already taken")
        res.render("register", {
          errorMsg: "Username already taken.",
        })
      } else {
        console.log(err)
      }
    })
})
//#endregion

//#region the Login function and logout (clear session)
//get the login page
app.get("/login", (req, res) => {
  res.render("login", { user: req.capsession.user })
})

//performing the actual logging in
app.post("/login", (req, res) => {
  const username = req.body.username
  const password = req.body.password

  if (username == "" || password == "") {
    return res.render("login", {
      user: req.capsession.user,
      errorMsg: "Missing username or password",
    })
  }
  db.login(username)
    .then((usr) => {
      //console.log(usr)
      if (db.isEmpty(usr)) {
        res.render("login", {
          user: req.capsession.user,
          errorMsg: "Incorrect Credentials",
        })
      } else {
        // console.log(password, usr[0].password)
        if (db.isPasswordSame(password, usr[0].password)) {
          // console.log("reached here as well")
          var isAdmin = false
          //see if user is admin
          db.getAdmins().then((result) => {
            let admins = result
            //console.log(admins)
            admins.forEach((usr) => {
              if (usr.username.includes(username)) {
                isAdmin = true
              }
            })
            req.capsession.user = {
              userid: usr[0].user_id,
              username: usr[0].username,
              email: usr[0].email,
              isAdmin: isAdmin,
            }

            console.log(
              "Is this user an admin: " +
                isAdmin +
                ", username = " +
                usr[0].username
            )

            res.redirect("/")
          })
        } else {
          res.render("login", {
            user: req.capsession.user,
            errorMsg: "Incorrect Credentials",
          })
        }
      }
    })
    .catch((err) => {
      console.log(err)
    })
})

//log out, clear cookie
app.get("/logout", (req, res) => {
  req.capsession.reset()
  res.redirect("/")
})
//#endregion

//#region Changing user profile and account settings (Username, email, password)

//go to your own profile page (add post function to update username, profile picture and description)
app.get("/profile", ensureLogin, (req, res) => {
  db.getUser(req.capsession.user.username).then((result) => {
    if (db.checkUserSetting(result[0]) === true) {
      res.render("profile", {
        user: req.capsession.user,
        userSetting: result[0],
      })
      //console.log("User setting property checked.")
    } else {
      res.render("profile", {
        user: req.capsession.user,
        userSetting: req.capsession.user,
        errorMsg: "No profile info found",
      })
    }
  })
})

//updating the profile settings
app.post("/profile", ensureLogin, (req, res) => {
  const username = req.body.username
  const about = req.body.about
  const userid = req.capsession.user.userid

  db.updateProfile(username, about, userid)
    .then(() => {
      if (db.checkUserSessionProperty(req.capsession.user) === true) {
        req.capsession.user = {
          userid: userid,
          username: username,
          email: req.capsession.user.email,
          isAdmin: req.capsession.user.isAdmin,
        }
        //console.log("User session property checked.")
      } else {
        req.capsession.user = {
          userid: userid,
          username: username,
          email: req.capsession.user.email,
          isAdmin: req.capsession.user.isAdmin,
          errorMsg: "No session info found",
        }
      }

      db.getUser(req.capsession.user.username).then((result) => {
        if (db.checkUserSetting(result[0]) === true) {
          res.render("profile", {
            user: req.capsession.user,
            userSetting: result[0],
            errorMsg: "Account settings changed",
          })
        } else {
          res.render("profile", {
            user: req.capsession.user,
            userSetting: req.capsession.user,
            errorMsg: "No profile info found",
          })
          //console.log("User setting property checked.")
        }
      })
    })
    .catch((err) => {
      if (
        err.includes(
          'duplicate key value violates unique constraint "users_username_key"'
        )
      ) {
        res.render("profile", {
          user: req.capsession.user,
          userSetting: req.capsession.user,
          errorMsg: "Username already exists!",
        })
      }
    })
})

//go to your account page (add post function to update email and password)
app.get("/account", ensureLogin, (req, res) => {
  db.getUser(req.capsession.user.username)
    .then((result) => {
      if (db.checkUserSetting(result[0]) === true) {
        res.render("account", {
          user: req.capsession.user,
          userSetting: result[0],
        })
        //console.log("User setting property checked.");
      } else {
        res.render("account", {
          user: req.capsession.user,
          userSetting: req.capsession.user,
          errorMsg: "No account info found",
        })
      }
    })
    .catch((err) => {
      console.log(err.message)
    })
})

//update profile email and password
//need to add password validations.
app.post("/account", ensureLogin, (req, res) => {
  const email = req.body.email
  const password = req.body.password
  const userid = req.capsession.user.userid

  db.getUserByID(userid)
    .then((result) => {
      if (
        !db.passwordGuide(password) &&
        db.checkUserSetting(result[0]) === true
      ) {
        res.render("account", {
          user: req.capsession.user,
          userSetting: result[0],
          pwMsg:
            "Password must be over 6 characters long and must have atleast one capital, one lower case letter, a special character and a number",
        })
      } else {
        db.updateAccount(email, password, userid)
          .then(() => {
            req.capsession.user = {
              userid: userid,
              username: req.capsession.user.username,
              email: email,
              isAdmin: req.capsession.user.isAdmin,
            }
            if (db.checkUserSessionProperty(req.capsession.user) === true) {
              db.getUser(req.capsession.user.username).then((result) => {
                res.render("account", {
                  user: req.capsession.user,
                  userSetting: result[0],
                  errorMsg: "Account settings changed",
                })
              })
              //console.log("User session property checked.")
            } else {
              res.render("account", {
                user: req.capsession.user,
                userSetting: req.capsession.user,
                errorMsg: "No account info found",
              })
            }
          })
          .catch((err) => {
            if (
              err.includes(
                'duplicate key value violates unique constraint "users_email_key"'
              )
            ) {
              db.getUser(req.capsession.user.username).then((result) => {
                if (db.checkUserSetting(result[0]) === true) {
                  res.render("account", {
                    user: req.capsession.user,
                    userSetting: result[0],
                    errorMsg: "Email already exists!",
                  })
                }
              })
            }
          })
      }
    })
    .catch((err) => {
      console.log(err.message)
    })
})

app.get("/adminerror", ensureLogin, (req, res) => {
  res.render("notadmin", { user: req.capsession.user })
})
//#endregion

app.post("/addThread", ensureLogin, (req, res) => {
  const content = req.body.content
  const category = req.body.category
  db.addThread(content, category, req.capsession.user.userid)
    .then((msg) => {
      console.log(msg)
      db.addNotification(
        "You have added: '" + content + "' as thread.",
        req.capsession.user.userid
      )
        .then((msg2) => {
          console.log(msg2)
        })
        .catch((err) => {
          console.log(err)
        })
      res.redirect("/")
    })
    .catch((err) => {
      console.log(err)
    })
})
app.get("/addThread", ensureLogin, (req, res) => {
  res.render("addThread", { user: req.capsession.user })
})

// IMPORTANT: CAN ADD FUNCTIONALITY TO SHOW USERNAME INSTEAD OF USER ID WHEN SEEING THE REPLIES
// I WASNT ABLE TO GET IT WORKING, YOU GUYS CAN TRY
app.get("/viewReply", (req, res) => {
  const post_id = req.query.post_id
  db.getPostsByContent(post_id)
    .then((post) => {
      db.getRepliesByPostID(post_id)
        .then((result) => {
          db.getAdmins().then((admin) => {
            let isAdmin = false
            admins = admin
            if (req.capsession.user) {
              admins.forEach((usr) => {
                if (usr.username.includes(req.capsession.user.username)) {
                  isAdmin = true
                }
              })
            }
            res.render("viewReply", {
              posts: post,
              user: req.capsession.user,
              post_id: post_id,
              replies: result,
              isAdmin: isAdmin,
            })
          })
        })
        .catch((err) => {
          console.log(err)
        })
    })
    .catch((err) => {
      console.log(err)
    })
})

app.get("/viewReply/delete/:id", (req, res) => {
  let id = req.params.id
  db.deleteThread(id)
    .then(() => {
      res.redirect("/")
    })
    .catch((err) => {
      console.log(err)
    })
})

app.post("/replies/:id", (req, res) => {
  let post_id = req.params.id
  let content = req.body.content
  let user_id = req.capsession.user.userid

  db.addReply(post_id, content, user_id)
    .then(() => {
      db.addReplyNotification(
        "You received a reply from: " + user_id + " on post_id: " + post_id,
        post_id
      )
        .then((msg2) => {
          console.log(msg2)
        })
        .catch((err) => {
          console.log(err)
        })
      res.redirect("/viewReply?post_id=" + post_id)
    })
    .catch((err) => {
      console.log(err)
    })
})

app.get("/reply/delete/:id", (req, res) => {
  let id = req.params.id
  db.deleteReply(id)
    .then(() => {
      res.redirect(req.get("referer"))
    })
    .catch((err) => {
      console.log(err)
    })
})

//#region - getting user notifications
//get to the notifications page (probably not going to end up implementing)
app.get("/notifications", ensureLogin, (req, res) => {
  db.getNotifications(req.capsession.user.userid)
    .then((result) => {
      //console.log(result)
      res.render("notifications", {
        user: req.capsession.user,
        notifications: result,
      })
    })
    .catch((err) => {
      console.log(err)
    })
})
//#endregion

//#region - Not finished functions and future implementations (Current work station)

//finish up view post, edit post, comment, edit comment, liking a post, subscribing to a category

app.get("/categories/:id", (req, res) => {
  let id = req.params.id
  db.getPostsFromCategory(id).then((posts) => {
    //console.log(result)
    db.getCategoryName(id).then((category) => {
      res.render("categoryPosts", {
        user: req.capsession.user,
        posts: posts,
        category: category,
      })
    })
  })
})

//#endregion

//#region - Admin pages and functions

//seeing all the messages from the contact us page
app.get("/admin/messages", ensureLogin, ensureAdmin, (req, res) => {
  db.getMessages().then((result) => {
    res.render("contactMessages", {
      user: req.capsession.user,
      messages: result,
    })
  })
})

//see each message in detail
app.get("/admin/message/:id", ensureLogin, ensureAdmin, (req, res) => {
  let id = req.params.id
  db.getMessageByID(id)
    .then((result) => {
      res.render("contactMessageDetail", {
        user: req.capsession.user,
        message: result,
      })
    })
    .catch((err) => {
      console.log(err)
    })
})

//little brief description of website for admin dashboard
app.get("/admin/dashboard", ensureLogin, ensureAdmin, (req, res) => {
  db.getNumberOfAdmins()
    .then((numOfAdmins) => {
      db.getNumberOfUsers()
        .then((numOfUsers) => {
          db.getNumberOfPosts()
            .then((numOfPosts) => {
              db.getNumberOfCategories()
                .then((numOfCategories) => {
                  db.getNumberOfPostsWeek()
                    .then((numOfPostsWeek) => {
                      res.render("dashboard", {
                        user: req.capsession.user,
                        numOfAdmins: numOfAdmins.count,
                        numOfUsers: numOfUsers.count,
                        numOfPosts: numOfPosts.count,
                        numOfCategories: numOfCategories.count,
                        numOfPostsWeek: numOfPostsWeek.count,
                      })
                    })
                    .catch((err) => {
                      console.log(err)
                    })
                })
                .catch((err) => {
                  console.log(err)
                })
            })
            .catch((err) => {
              console.log(err)
            })
        })
        .catch((err) => {
          console.log(err)
        })
    })
    .catch((err) => {
      console.log(err)
    })
})

//Getting all the users for the admin
app.get("/admin/users", ensureLogin, ensureAdmin, (req, res) => {
  db.getAllUsers(req.capsession.user.userid).then((users) => {
    //console.log(users);
    res.render("allUsers", {
      user: req.capsession.user,
      AllUsers: users,
    })
  })
})

app.get("/admin/user/:id", ensureLogin, ensureAdmin, (req, res) => {
  let userData
  let isAdmin = false
  db.getUserByID(req.params.id)
    .then((data) => {
      if (data) {
        userData = data

        db.getAdmins().then((result) => {
          admins = result
          admins.forEach((usr) => {
            if (usr.username.includes(userData[0].username)) {
              isAdmin = true
            }
          })

          res.render("editUserView", {
            user: req.capsession.user,
            userData: userData[0],
            isAdmin: isAdmin,
          })
        })
      } else {
        userData = null
      }
    })
    .catch(() => {
      console.log("User does not exist")
    })
})

//deleting a user
app.get("/admin/user/delete/:id", (req, res) => {
  let user_id = req.params.id
  let isAdmin = false
  db.getUserByID(user_id).then((returnedUser) => {
    db.getAdmins().then((result) => {
      result.forEach((usr) => {
        if (usr.username.includes(returnedUser[0].username)) {
          isAdmin = true
        }
      })
      if (isAdmin) {
        console.log("cannot delete admin users")
        res.render("editUserView", {
          user: req.capsession.user,
          userData: returnedUser[0],
          isAdmin: isAdmin,
          deleteMsg: "Cannot Delete Admin Users",
        })
      } else {
        db.deleteUserByID(user_id)
          .then(() => {
            console.log("User successfully deleted")
            res.redirect("/admin/users")
          })
          .catch((err) => {
            console.log(err)
          })
      }
    })
  })
})

app.post("/admin/user/update", (req, res) => {
  console.log("Post ROLE: " + req.body.role)
  db.changeUserRole(req.body.role, req.body.user_id)
    .then(() => {
      res.redirect("/admin/users")
    })
    .catch((err) => {
      console.log(err)
    })
})

//#endregion

//#region Functions and helper functions

//ensure that the user is logged in before being able to access the page
function ensureLogin(req, res, next) {
  if (!req.capsession.user) {
    //console.log(req.capsession.user.username)
    res.redirect("/login")
  } else {
    //console.log("not working" + req.capsession.user.username)
    next()
  }
}

//ensure that the user is an admin to be able to access the page.
function ensureAdmin(req, res, next) {
  if (!req.capsession.user.isAdmin) {
    res.redirect("/adminerror")
  } else {
    next()
  }
}

//#endregion

//#region initialization of the database and starting up server.js
db.initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("server listening on port: " + HTTP_PORT)
    })
  })
  .catch((err) => {
    console.log(err.message)
  })
//#endregion
