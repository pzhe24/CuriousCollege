const e = require("express")
const { Client } = require("pg")
require("dotenv").config()

//database connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: true,
})

module.exports.initialize = function () {
  return new Promise((resolve, reject) => {
    client.connect((err) => {
      if (err) {
        console.log("\n\n\n" + err.message + "\n\n\n")
      } else {
        console.log("\n\n\nsuccessfully connected to DB!!!!\n\n\n")
        resolve()
      }
    })
  })
}

module.exports.login = function (username) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT * FROM users WHERE username = $1", [username])
      .then((result) => {
        var usr = result.rows
        resolve(usr)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}
//register function
module.exports.register = function (username, email, password) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO users(username, email, password, created_on) VALUES($1, $2, $3, current_timestamp)",
        [username, email, password]
      )
      .then(() => {
        client
          .query("SELECT user_id FROM users WHERE username = $1", [username])
          .then((result) => {
            //console.log(result.rows[0].user_id)
            resolve(result.rows[0].user_id)
          })
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.addUserRole = function (id, role) {
  return new Promise((resolve, reject) => {
    client
      .query("INSERT INTO user_role(user_id, role_id) VALUES($1, $2)", [
        id,
        role,
      ])
      .then(() => {
        resolve("User role added")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//getting all the post and the date it was created on
module.exports.getPosts = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT post_id, content, TO_CHAR(created_on, 'Mon dd, yyyy') AS date FROM post ORDER BY created_on DESC LIMIT 18"
      )
      .then((result) => {
        posts = result.rows
        resolve(posts)
      })
      .catch((err) => {
        //console.log(err.message)
        reject(err.message)
      })
  })
}

//get daily popular post
module.exports.getPopularPosts = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT content, post_id FROM post ORDER by created_on  DESC LIMIT 5"
      )
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get top 10 popular post
module.exports.getTopPosts = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT p1.content, COUNT(r1.post_id) AS replies, p1.post_id FROM reply r1 RIGHT JOIN post p1 ON r1.post_id = p1.post_id GROUP BY (r1.post_id, p1.content,p1.post_id) ORDER BY replies DESC LIMIT 18"
      )
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get all the categories
module.exports.getCategories = function () {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT * FROM category")
      .then((result) => {
        categories = result.rows
        resolve(categories)
        //console.log(categories)
      })
      .catch((err) => {
        //console.log(err.message)
        reject(err.message)
      })
  })
}

//get current user
module.exports.getUser = function (username) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT * FROM users WHERE username = $1", [username])
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get user by id
module.exports.getUserByID = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT * FROM users WHERE user_id = $1", [id])
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get all the admins
module.exports.getAdmins = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT * FROM users WHERE user_id IN (SELECT user_id FROM user_role WHERE role_id = 0)"
      )
      .then((result) => {
        resolve(result.rows)
        // console.log(admins)
      })
  })
}

//get reply # based on post.
client
  .query("SELECT post_id, COUNT(post_id) FROM reply GROUP BY post_id")
  .then((result) => {
    replies = result.rows
    //console.log(replies)
  })
  .catch((err) => {
    //console.log(err.message)
  })

//update account
module.exports.updateAccount = function (email, password, user_id) {
  return new Promise((resolve, reject) => {
    client
      .query("UPDATE users SET email = $1, password = $2 WHERE user_id = $3", [
        email,
        password,
        user_id,
      ])
      .then(() => {
        resolve()
      })
      .catch((err) => {
        //console.log(err.message)
        reject(err.message)
      })
  })
}

//update profile
module.exports.updateProfile = function (username, about, user_id) {
  return new Promise((resolve, reject) => {
    client
      .query("UPDATE users SET username = $1, about = $2 WHERE user_id = $3", [
        username,
        about,
        user_id,
      ])
      .then(() => {
        resolve()
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get notifications for specific user
module.exports.getNotifications = function (user_id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT content, TO_CHAR(date, 'Mon dd, yyyy') AS date FROM notification WHERE user_id = $1 ORDER BY date ASC",
        [user_id]
      )
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.addNotification = function (content, user_id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO notification(content, date, user_id) VALUES($1, current_timestamp, $2)",
        [content, user_id]
      )
      .then(() => {
        resolve("notification added successfully")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.addReplyNotification = function (content, post_id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO notification(content , date, user_id) VALUES ($1, current_timestamp, (SELECT user_id FROM post WHERE post_id = $2))",
        [content, post_id]
      )
      .then(() => {
        resolve("reply notification added successfully")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getNumberOfUsers = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT COUNT(user_id) FROM users WHERE user_id IN (SELECT user_id FROM user_role WHERE role_id = 1)"
      )
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getNumberOfAdmins = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT COUNT(user_id) FROM users WHERE user_id IN (SELECT user_id FROM user_role WHERE role_id = 0)"
      )
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getNumberOfPosts = function () {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT COUNT(post_id) FROM post")
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getNumberOfCategories = function () {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT COUNT(*) FROM category")
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getPostsFromCategory = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT post_id, content, TO_CHAR(created_on, 'Mon dd, yyyy') as created_on FROM post WHERE category_id = $1 ORDER BY created_on DESC",
        [id]
      )
      .then((result) => {
        //console.log(result.rows)
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.addThread = function (content, category, user_id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO post(content, category_id, created_on, user_id) VALUES($1, $2, current_timestamp, $3)",
        [content, category, user_id]
      )
      .then(() => {
        resolve("question posted successfully")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.deleteThread = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query("DELETE FROM post WHERE post_id = $1", [id])
      .then(() => {
        client
          .query("DELETE FROM reply WHERE post_id = $1", [id])
          .then(() => {
            resolve("followed replies delete")
          })
          .catch((err) => {
            reject(err.message)
          })
        resolve("post deleted")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getPostsByContent = function (post_id) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT post_id, content FROM post WHERE post_id = $1", [post_id])
      .then((result) => {
        post = result.rows
        resolve(post)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getAllUsers = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT * FROM users WHERE user_id != $1 ORDER BY user_id", [id])
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

module.exports.getNumberOfPostsWeek = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT COUNT(post_id) FROM post WHERE created_on >= (CURRENT_DATE - 7)"
      )
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        console.log(err)
        reject(err.message)
      })
  })
}

//get the category name
module.exports.getCategoryName = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query("SELECT topic_name FROM category WHERE category_id = $1", [id])
      .then((result) => {
        //console.log(result.rows[0].topic_name)
        resolve(result.rows[0].topic_name)
      })
      .catch((err) => {
        console.log(err)
        reject(err.message)
      })
  })
}

//change user role
module.exports.changeUserRole = function (role, id) {
  return new Promise((resolve, reject) => {
    client
      .query("UPDATE user_role SET role_id = $1 WHERE user_id = $2", [role, id])
      .then(() => {
        resolve("updated user role")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//send a contact us message
module.exports.addMessage = function (firstname, lastname, country, content) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO messages (firstname, lastname, country, content, created_on) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        [firstname, lastname, country, content]
      )
      .then(() => {
        resolve("Message added to table")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get the messages
module.exports.getMessages = function () {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT message_id, firstname, lastname, country, content, TO_CHAR(created_on, 'Mon dd, yyyy') AS date FROM messages"
      )
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//getting the message by ID
module.exports.getMessageByID = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT firstname, lastname, TO_CHAR(created_on, 'Mon dd, yyyy') AS date, content FROM messages WHERE message_id = $1",
        [id]
      )
      .then((result) => {
        resolve(result.rows[0])
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//delete user
module.exports.deleteUserByID = function (id) {
  return new Promise((resolve, reject) => {
    client.query("DELETE FROM user_role WHERE user_id = $1", [id]).then(() => {
      client
        .query("DELETE FROM users WHERE user_id = $1", [id])
        .then(() => {
          //console.log("user with id = " + id + " deleted")
          resolve()
        })
        .catch((err) => {
          reject(err.message)
        })
    })
  })
}

//add reply to question
module.exports.addReply = function (post_id, content, user_id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "INSERT INTO reply(post_id, content, created_on, user_id) VALUES ($1, $2, current_timestamp, $3)",
        [post_id, content, user_id]
      )
      .then(() => {
        resolve("successfully addedd reply into table")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//get a question's replies
module.exports.getRepliesByPostID = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query(
        "SELECT reply_id, content, TO_CHAR(created_on, 'Mon dd, yyyy') AS date, user_id, post_id FROM reply WHERE post_id = $1",
        [id]
      )
      .then((result) => {
        resolve(result.rows)
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//delete response
module.exports.deleteReply = function (id) {
  return new Promise((resolve, reject) => {
    client
      .query("DELETE FROM reply WHERE reply_id = $1", [id])
      .then(() => {
        resolve("reponse deleted")
      })
      .catch((err) => {
        reject(err.message)
      })
  })
}

//#region Register/Login functions
module.exports.isEmpty = function (input) {
  if (input.length === 0) {
    return true
  } else {
    return false
  }
}

module.exports.hasSpaces = function (input) {
  var noSpaces = /^\S*$/
  if (noSpaces.test(input)) {
    return false
  } else {
    return true
  }
}

//password requirements
module.exports.passwordGuide = function (password) {
  var passwordGuidelines =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
  if (!passwordGuidelines.test(password)) {
    return false
  } else {
    return true
  }
}

module.exports.isPasswordSame = function (password1, password2) {
  if (password1 === password2) {
    return true
  } else {
    return false
  }
}

//check user property thats stored in cookie (userid, username, email, isAdmin)
module.exports.checkUserSessionProperty = function (user) {
  if (
    user.hasOwnProperty("userid") &&
    user.hasOwnProperty("username") &&
    user.hasOwnProperty("email") &&
    user.hasOwnProperty("isAdmin")
  ) {
    return true
  } else {
    return false
  }
}

//check user settings. (user_id, username, email, password, about)
module.exports.checkUserSetting = function (user) {
  if (
    user.hasOwnProperty("user_id") &&
    user.hasOwnProperty("username") &&
    user.hasOwnProperty("email") &&
    user.hasOwnProperty("password") &&
    user.hasOwnProperty("created_on") &&
    user.hasOwnProperty("about")
  ) {
    return true
  } else {
    return false
  }
}
//#endregion
