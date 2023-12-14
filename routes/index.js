var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = function (db) {
  router.get("/", (req, res) => {
    res.render("index", { failedInfo: req.flash('failedInfo'), successInfo: req.flash('successInfo') });
  });

  router.post('/', async function (req, res) {
    try {
      const { email, password } = req.body;
      const { rows } = await db.query(`SELECT * FROM "users" WHERE email = $1`, [email]);
      if (rows.length == 0) {
        req.flash('failedInfo', "Email doesn't exist")
        res.redirect('/')
      } else {
        if (!bcrypt.compareSync(password, rows[0].password)) {
          req.flash('failedInfo', "Password is wrong")
          res.redirect('/')
        } else {
          req.session.user = { email: rows[0].email, userid: rows[0].id }
          res.redirect('./users')
        }
      }
    } catch (error) {
      res.redirect("/")
    }


  })

  router.get("/register", (req, res) => {
    res.render("register", { failedInfo: req.flash('failedInfo'), successInfo: req.flash('successInfo') });
  });

  router.post("/register", async (req, res) => {
    const { email, password, repassword } = req.body;
    if (password !== repassword) {
      req.flash('failedInfo', "Password doesn't match")
      res.redirect('/register')
    } else {
      const hash = bcrypt.hashSync(password, saltRounds);
      try {
        const { rows } = await db.query(`SELECT * FROM "users" WHERE email = $1`, [email]);
        console.log(rows);
        if (rows.length > 0) {
          req.flash('failedInfo', "Email already exist")
          res.redirect('/register')
        } else {
          await db.query(`INSERT INTO "users"(email,password) values ($1,$2)`, [email, hash]);
          req.flash('successInfo', "Successfully registered, please sign in!")
          res.redirect("/");
        }
      } catch {
        req.flash('failedInfo', "An error occured while processing data, please try again")
        res.redirect("/register");
      }
    }
  });
  router.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  })
  return router;
};
